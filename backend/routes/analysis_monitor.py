"""
遗漏监控模块 - 完整版
功能：监控各种分析的遗漏情况，找出接近爆发的号码组合
支持的分析类型：
1. 去10最热20
2. 加减前6码
3. +1~+20区间分析
4. -1~-20区间分析
5. 关注号码管理
6. 每期分析
7. 前6码三中三
8. 第7码+1~+20区间
"""
from fastapi import APIRouter, Query
from typing import Optional
from collections import Counter

try:
    from backend.utils import get_db_cursor, wrap_in_range
except ImportError:
    from utils import get_db_cursor, wrap_in_range

try:
    from backend.routes.analysis_hot20 import calculate_period_hot20
except ImportError:
    from routes.analysis_hot20 import calculate_period_hot20

router = APIRouter()

# 分析类型中英文映射
ANALYSIS_TYPE_LABELS = {
    'hot20': '去10最热20',
    'plus_minus6': '加减前6码',
    'plus_range': '+1~+20区间',
    'minus_range': '-1~-20区间',
    'favorite_numbers': '关注号码',
    'each_issue': '每期分析',
    'front6_szz': '前6码三中三',
    'seventh_range': '第7码区间',
    'second_fourxiao': '第二码4肖',
    'five_period_threexiao': '5期3肖',
    'place_results': '关注点登记结果',
    'recommend8': '推荐8码',
    'recommend16': '推荐16码',
    'recommend30': '推荐30码',
    'seventh_smart20': '第7码智能推荐20码',
    'high20': '高20码分析',
    'color_analysis': '波色分析'
}


def check_hot20_omission(lottery_type: str, min_current: int, max_gap: int,
                         recent_periods: int = 200, exclude_period: str = None):
    """
    检查去10的最热20分析的遗漏情况（只检查第7位）

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取最新的300期数据
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        if len(rows) < 10:
            return alerts

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        # 只检查第7位
        pos = 7
        results = []
        for idx in range(len(all_rows) - 1, -1, -1):
            period_result = calculate_period_hot20(all_rows, idx, pos)
            if period_result:
                results.append(period_result)

        if not results:
            return alerts

        # 计算遗漏
        results_asc = results[::-1]
        current_omission = 0
        max_omission = 0

        for item in results_asc:
            if item.get('next_period_in_hot20') is not None:
                if item.get('next_period_in_hot20'):
                    period_omission = 0
                else:
                    period_omission = current_omission + 1
            else:
                period_omission = current_omission

            item['current_omission'] = period_omission
            if period_omission > max_omission:
                max_omission = period_omission
            item['max_omission'] = max_omission
            current_omission = period_omission

        # 新增：统计历史达到次数（两个维度）
        omission_values = [item['current_omission'] for item in results_asc]

        for idx, item in enumerate(results_asc):
            target = item['current_omission']

            # 统计1：历史总次数（只看当前期之前，不包括当前期）
            total_reach_count = sum(1 for i in range(idx) if omission_values[i] >= target > 0)
            item['historical_reach_count'] = total_reach_count

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, idx - recent_periods)
            recent_reach_count = sum(1 for i in range(start_idx, idx) if omission_values[i] >= target > 0)
            item['recent_reach_count'] = recent_reach_count

        # 取最新一期检查
        latest = results_asc[-1]
        current = latest.get('current_omission', 0)
        max_miss = latest.get('max_omission', 0)
        total_reach = latest.get('historical_reach_count', 0)
        recent_reach = latest.get('recent_reach_count', 0)

        if current >= min_current and (max_miss - current) <= max_gap:
            hot20_str = ','.join(str(h['number']) for h in latest['hot20'])
            alerts.append({
                'analysis_type': 'hot20',
                'detail': f'第{pos}位',
                'period': latest['period'],
                'numbers': hot20_str,
                'current_omission': current,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current) <= 1 else 'medium'
            })

    return alerts


def check_plus_minus6_omission(lottery_type: str, min_current: int, max_gap: int,
                               recent_periods: int = 200, exclude_period: str = None):
    """
    检查加减前6码分析的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取最新的300期数据
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        # 排除指定期号
        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        if len(rows) < 2:
            return alerts

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        # 存储每组的遗漏历史（包含遗漏历史列表）
        group_history = {i: {'current_omission': 0, 'max_omission': 0, 'omission_history': []} for i in range(1, 7)}

        # 遍历每个期号
        for idx in range(len(all_rows) - 1):
            row = all_rows[idx]
            numbers = list(map(int, row['numbers'].split(',')))

            if len(numbers) < 6:
                continue

            base_nums = numbers[:6]
            next_row = all_rows[idx + 1]
            next_numbers = list(map(int, next_row['numbers'].split(',')))
            next_num_7th = next_numbers[6] if len(next_numbers) > 6 else None

            if next_num_7th is None:
                continue

            # 生成6组号码
            for group_id in range(1, 7):
                group_nums = []
                for base_num in base_nums:
                    plus_val = wrap_in_range(base_num + group_id, 1, 49)
                    minus_val = wrap_in_range(base_num - group_id, 1, 49)
                    group_nums.extend([plus_val, minus_val])

                is_hit = next_num_7th in group_nums

                if is_hit:
                    group_history[group_id]['current_omission'] = 0
                else:
                    group_history[group_id]['current_omission'] += 1

                current = group_history[group_id]['current_omission']
                if current > group_history[group_id]['max_omission']:
                    group_history[group_id]['max_omission'] = current

                # 记录每期的遗漏值
                group_history[group_id]['omission_history'].append(current)

        # 为每组计算历史达到次数
        for group_id in range(1, 7):
            omission_values = group_history[group_id]['omission_history']
            current = group_history[group_id]['current_omission']

            # 当前期是最后一期，索引为 len(omission_values) - 1
            current_idx = len(omission_values) - 1

            # 统计1：历史总次数（只看当前期之前）
            total_reach = sum(1 for i in range(current_idx) if omission_values[i] >= current > 0)

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, current_idx - recent_periods)
            recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_values[i] >= current > 0)

            group_history[group_id]['historical_reach_count'] = total_reach
            group_history[group_id]['recent_reach_count'] = recent_reach

        # 检查每组的最新遗漏情况
        # 如果传了exclude_period,基准期是最后一期(已排除最新期)
        # 如果没传exclude_period,基准期是倒数第二期(遍历到倒数第二,检查最后一期)
        latest_period = all_rows[-1 if exclude_period else -2]['period']
        for group_id in range(1, 7):
            current = group_history[group_id]['current_omission']
            max_miss = group_history[group_id]['max_omission']
            total_reach = group_history[group_id]['historical_reach_count']
            recent_reach = group_history[group_id]['recent_reach_count']

            if current >= min_current and (max_miss - current) <= max_gap:
                alerts.append({
                    'analysis_type': 'plus_minus6',
                    'detail': f'第{group_id}组',
                    'period': latest_period,
                    'numbers': f'前6码±{group_id}',
                    'current_omission': current,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current,
                    'historical_reach_count': total_reach,
                    'recent_reach_count': recent_reach,
                    'recent_periods': recent_periods,
                    'priority': 'high' if (max_miss - current) <= 1 else 'medium'
                })

    return alerts


def check_range_analysis_omission(lottery_type: str, min_current: int, max_gap: int, is_plus: bool = True,
                                  recent_periods: int = 200, exclude_period: str = None):
    """
    检查区间分析的遗漏情况（只检查第7位）
    is_plus: True为+1~+20区间，False为-1~-20区间
    recent_periods: 近期统计期数范围（默认200期）
    exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        if len(all_rows) < 2:
            return alerts

        # 定义6个区间
        if is_plus:
            ranges = [
                (1, 20, '+1~+20'),
                (5, 24, '+5~+24'),
                (10, 29, '+10~+29'),
                (15, 34, '+15~+34'),
                (20, 39, '+20~+39'),
                (25, 44, '+25~+44')
            ]
            analysis_type = 'plus_range'
        else:
            ranges = [
                (-1, -20, '-1~-20'),
                (-5, -24, '-5~-24'),
                (-10, -29, '-10~-29'),
                (-15, -34, '-15~-34'),
                (-20, -39, '-20~-39'),
                (-25, -44, '-25~-44')
            ]
            analysis_type = 'minus_range'

        # 只检查第7位，为每个区间建立遗漏历史
        ball_idx = 6  # 第7位
        range_history = {}
        for range_idx in range(6):
            range_history[range_idx] = {
                'current_omission': 0,
                'max_omission': 0,
                'omission_history': []
            }

        # 遍历每个期号
        for idx in range(len(all_rows) - 1):
            row = all_rows[idx]
            numbers = list(map(int, row['numbers'].split(',')))

            if ball_idx >= len(numbers):
                continue

            next_row = all_rows[idx + 1]
            next_numbers = list(map(int, next_row['numbers'].split(',')))

            base_num = numbers[ball_idx]
            next_num = next_numbers[ball_idx] if ball_idx < len(next_numbers) else None

            if next_num is None:
                continue

            for range_idx, (start, end, range_name) in enumerate(ranges):
                # 生成区间号码
                if is_plus:
                    range_nums = [wrap_in_range(base_num + offset, 1, 49)
                                for offset in range(start, end + 1)]
                else:
                    range_nums = [wrap_in_range(base_num + offset, 1, 49)
                                for offset in range(start, end - 1, -1)]

                is_hit = next_num in range_nums

                if is_hit:
                    range_history[range_idx]['current_omission'] = 0
                else:
                    range_history[range_idx]['current_omission'] += 1

                current = range_history[range_idx]['current_omission']
                if current > range_history[range_idx]['max_omission']:
                    range_history[range_idx]['max_omission'] = current

                # 记录每期的遗漏值
                range_history[range_idx]['omission_history'].append(current)

        # 为每个区间计算历史达到次数
        for range_idx in range(6):
            omission_values = range_history[range_idx]['omission_history']
            current = range_history[range_idx]['current_omission']

            # 当前期是最后一期，索引为 len(omission_values) - 1
            current_idx = len(omission_values) - 1

            # 统计1：历史总次数（只看当前期之前）
            total_reach = sum(1 for i in range(current_idx) if omission_values[i] >= current > 0)

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, current_idx - recent_periods)
            recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_values[i] >= current > 0)

            range_history[range_idx]['historical_reach_count'] = total_reach
            range_history[range_idx]['recent_reach_count'] = recent_reach

        # 检查所有区间的最新遗漏情况
        # 如果传了exclude_period,基准期是最后一期(已排除最新期)
        # 如果没传exclude_period,基准期是倒数第二期(遍历到倒数第二,检查最后一期)
        latest_period = all_rows[-1 if exclude_period else -2]['period']
        for range_idx, (start, end, range_name) in enumerate(ranges):
            current = range_history[range_idx]['current_omission']
            max_miss = range_history[range_idx]['max_omission']
            total_reach = range_history[range_idx]['historical_reach_count']
            recent_reach = range_history[range_idx]['recent_reach_count']

            if current >= min_current and (max_miss - current) <= max_gap:
                alerts.append({
                    'analysis_type': analysis_type,
                    'detail': f'第7位{range_name}',
                    'period': latest_period,
                    'numbers': range_name,
                    'current_omission': current,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current,
                    'historical_reach_count': total_reach,
                    'recent_reach_count': recent_reach,
                    'recent_periods': recent_periods,
                    'priority': 'high' if (max_miss - current) <= 1 else 'medium'
                })

    return alerts


def check_favorite_numbers_omission(lottery_type: str, min_current: int, max_gap: int, position: int = 7,
                                    recent_periods: int = 200, exclude_period: str = None):
    """
    检查关注号码管理的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取所有关注号码组（表中不区分彩种和位置）
        cursor.execute("""
            SELECT id, name, numbers
            FROM favorite_numbers
        """)
        favorite_groups = cursor.fetchall()

        if not favorite_groups:
            return alerts

        # 获取最新的300期开奖记录
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type = %s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        if not rows:
            return alerts

        # 反转成升序（从旧到新）
        all_records = rows[::-1]

        # 为每个关注号码组计算遗漏（检查第7位）
        for group in favorite_groups:
            fav_numbers = set(map(int, group['numbers'].split(',')))
            current_miss = 0
            max_miss = 0
            omission_history = []

            # 从旧到新遍历
            for record in all_records:
                open_numbers = list(map(int, record['numbers'].split(',')))
                target_pos = position - 1

                if target_pos < len(open_numbers):
                    is_hit = open_numbers[target_pos] in fav_numbers

                    if is_hit:
                        if current_miss > max_miss:
                            max_miss = current_miss
                        current_miss = 0
                    else:
                        current_miss += 1

                    # 记录每期的遗漏值
                    omission_history.append(current_miss)

            # 遍历结束后，如果当前遗漏大于历史最大，更新最大遗漏
            if current_miss > max_miss:
                max_miss = current_miss

            # 统计历史达到次数（两个维度）
            # 当前期是最后一期，索引为 len(omission_history) - 1
            current_idx = len(omission_history) - 1

            # 统计1：历史总次数（只看当前期之前）
            total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, current_idx - recent_periods)
            recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

            # 检查是否满足条件
            if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
                numbers_str = ','.join(map(str, sorted(fav_numbers)))
                alerts.append({
                    'analysis_type': 'favorite_numbers',
                    'detail': group['name'] or '未命名',
                    'period': all_records[-1]['period'],
                    'numbers': numbers_str,
                    'current_omission': current_miss,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current_miss,
                    'historical_reach_count': total_reach,
                    'recent_reach_count': recent_reach,
                    'recent_periods': recent_periods,
                    'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
                })

    return alerts


def check_each_issue_omission(lottery_type: str, min_current: int, max_gap: int, position: int = 7,
                              recent_periods: int = 200, exclude_period: str = None):
    """
    检查每期分析的遗漏情况
    使用与"每期分析"页面相同的逻辑：
    - 每期计算 miss_count（从该期往后找，直到后续某期的第7个号码在本期7个号码中出现）
    - current_max_miss: 所有未命中期中的最大 miss_count
    - history_max_miss: 所有已命中期中的最大 miss_count

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取最新的300期数据（按期号降序取，然后反转成升序）
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        if len(rows) < 2:
            return alerts

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

    # 计算每一期的遗漏次数
    result = []
    n = len(all_rows)

    for idx in range(n):
        row = all_rows[idx]
        period = row['period']
        numbers = row['numbers'].split(',')
        miss_count = 1
        stop_reason = 'end'

        # 从当前期往后找，直到命中或到最后一期
        for j in range(idx + 1, n):
            next_row = all_rows[j]
            next_numbers = next_row['numbers'].split(',')
            next_num7 = next_numbers[6] if len(next_numbers) >= 7 else ''

            if next_num7 and next_num7 in numbers:
                stop_reason = 'hit'
                break
            else:
                miss_count += 1

        result.append({
            'period': period,
            'miss_count': miss_count,
            'stop_reason': stop_reason
        })

    # 统计当前最大遗漏和历史最大遗漏
    current_max_miss = 0
    current_max_miss_period = ''
    history_max_miss = 0
    history_max_miss_period = ''
    all_misses = []  # 收集所有遗漏值用于统计

    for item in result:
        all_misses.append(item['miss_count'])
        if item['stop_reason'] == 'hit':
            if item['miss_count'] > history_max_miss:
                history_max_miss = item['miss_count']
                history_max_miss_period = item['period']
        elif item['stop_reason'] == 'end':
            if item['miss_count'] > current_max_miss:
                current_max_miss = item['miss_count']
                current_max_miss_period = item['period']

    # 统计历史达到次数（两个维度）
    # 当前期是最后一期，索引为 len(all_misses) - 1
    current_idx = len(all_misses) - 1

    # 统计1：历史总次数（只看当前期之前）
    total_reach = sum(1 for i in range(current_idx) if all_misses[i] >= current_max_miss > 0)

    # 统计2：近期次数（最近N期，不包括当前期）
    start_idx = max(0, current_idx - recent_periods)
    recent_reach = sum(1 for i in range(start_idx, current_idx) if all_misses[i] >= current_max_miss > 0)

    # 检查是否满足条件
    if current_max_miss >= min_current and (history_max_miss - current_max_miss) <= max_gap:
        alerts.append({
            'analysis_type': 'each_issue',
            'detail': f'第{position}位基础',
            'period': current_max_miss_period,
            'numbers': '7码包含分析',
            'current_omission': current_max_miss,
            'max_omission': history_max_miss,
            'gap_from_max': history_max_miss - current_max_miss,
            'historical_reach_count': total_reach,
            'recent_reach_count': recent_reach,
            'recent_periods': recent_periods,
            'priority': 'high' if (history_max_miss - current_max_miss) <= 1 else 'medium'
        })

    return alerts


def check_front6_szz_omission(lottery_type: str, min_current: int, max_gap: int,
                              recent_periods: int = 200, exclude_period: str = None):
    """
    检查前6码三中三的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        if len(all_rows) < 100:
            return alerts

        # 找出所有触发期（尾数为0或5）
        trigger_indices = [i for i, row in enumerate(all_rows)
                          if row['period'].endswith(('0', '5'))]

        current_miss = 0
        max_miss = 0
        omission_history = []  # 收集每期遗漏值

        for trigger_idx in trigger_indices:
            # 生成推荐号码（基于前100期的前6码）
            start = max(0, trigger_idx - 99)
            history = all_rows[start:trigger_idx + 1]

            # 统计前6码频率
            number_count = Counter()
            for row in history:
                nums = list(map(int, row['numbers'].split(',')))
                for num in nums[:6]:
                    number_count[num] += 1

            # 取Top6作为推荐
            recommended = [num for num, _ in number_count.most_common(6)]

            # 检查后5期是否命中（至少3个号码）
            is_hit = False
            for window_idx in range(trigger_idx + 1, min(trigger_idx + 6, len(all_rows))):
                window_nums = list(map(int, all_rows[window_idx]['numbers'].split(',')))[:6]
                hit_count = len(set(recommended) & set(window_nums))
                if hit_count >= 3:
                    is_hit = True
                    break

            if is_hit:
                if current_miss > max_miss:
                    max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1

            # 记录每个触发期的遗漏值
            omission_history.append(current_miss)

        # 遍历结束后，如果当前遗漏大于历史最大，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

        # 统计历史达到次数（两个维度）
        # 当前期是最后一期，索引为 len(omission_history) - 1
        current_idx = len(omission_history) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if trigger_indices and current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            last_trigger = all_rows[trigger_indices[-1]]
            alerts.append({
                'analysis_type': 'front6_szz',
                'detail': '触发期推荐',
                'period': last_trigger['period'],
                'numbers': '基于前100期Top6',
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_seventh_range_omission(lottery_type: str, min_current: int, max_gap: int,
                                 recent_periods: int = 200, exclude_period: str = None):
    """
    检查第7码+1~+20区间的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        if len(all_rows) < 2:
            return alerts

        # 第7码的6个区间
        ranges = [
            (1, 20, '+1~+20'),
            (5, 24, '+5~+24'),
            (10, 29, '+10~+29'),
            (15, 34, '+15~+34'),
            (20, 39, '+20~+39'),
            (25, 44, '+25~+44')
        ]

        # 为每个区间建立遗漏历史
        range_history = {i: {'current_omission': 0, 'max_omission': 0, 'omission_history': []} for i in range(6)}

        # 遍历每个期号
        for idx in range(len(all_rows) - 1):
            row = all_rows[idx]
            numbers = list(map(int, row['numbers'].split(',')))

            if len(numbers) < 7:
                continue

            base_num = numbers[6]  # 第7个号码

            next_row = all_rows[idx + 1]
            next_numbers = list(map(int, next_row['numbers'].split(',')))
            next_7th = next_numbers[6] if len(next_numbers) > 6 else None

            if next_7th is None:
                continue

            for range_idx, (start, end, range_name) in enumerate(ranges):
                range_nums = [wrap_in_range(base_num + offset, 1, 49)
                            for offset in range(start, end + 1)]

                is_hit = next_7th in range_nums

                if is_hit:
                    range_history[range_idx]['current_omission'] = 0
                else:
                    range_history[range_idx]['current_omission'] += 1

                current = range_history[range_idx]['current_omission']
                if current > range_history[range_idx]['max_omission']:
                    range_history[range_idx]['max_omission'] = current

                # 记录每期的遗漏值
                range_history[range_idx]['omission_history'].append(current)

        # 为每个区间计算历史达到次数
        for range_idx in range(6):
            omission_values = range_history[range_idx]['omission_history']
            current = range_history[range_idx]['current_omission']

            # 当前期是最后一期，索引为 len(omission_values) - 1
            current_idx = len(omission_values) - 1

            # 统计1：历史总次数（只看当前期之前）
            total_reach = sum(1 for i in range(current_idx) if omission_values[i] >= current > 0)

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, current_idx - recent_periods)
            recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_values[i] >= current > 0)

            range_history[range_idx]['historical_reach_count'] = total_reach
            range_history[range_idx]['recent_reach_count'] = recent_reach

        # 检查所有区间的最新遗漏情况
        # 如果传了exclude_period,基准期是最后一期(已排除最新期)
        # 如果没传exclude_period,基准期是倒数第二期(遍历到倒数第二,检查最后一期)
        latest_period = all_rows[-1 if exclude_period else -2]['period']
        for range_idx, (start, end, range_name) in enumerate(ranges):
            current = range_history[range_idx]['current_omission']
            max_miss = range_history[range_idx]['max_omission']
            total_reach = range_history[range_idx]['historical_reach_count']
            recent_reach = range_history[range_idx]['recent_reach_count']

            if current >= min_current and (max_miss - current) <= max_gap:
                alerts.append({
                    'analysis_type': 'seventh_range',
                    'detail': range_name,
                    'period': latest_period,
                    'numbers': range_name,
                    'current_omission': current,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current,
                    'historical_reach_count': total_reach,
                    'recent_reach_count': recent_reach,
                    'recent_periods': recent_periods,
                    'priority': 'high' if (max_miss - current) <= 1 else 'medium'
                })

    return alerts


def check_second_fourxiao_omission(lottery_type: str, min_current: int, max_gap: int, position: int = 2,
                                   recent_periods: int = 200, exclude_period: str = None):
    """
    检查第二码4肖分析的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        if len(all_rows) < 6:  # 需要至少6期数据（1期触发+5期窗口）
            return alerts

        def gen_16_nums(base_num: int) -> list[int]:
            """生成16个号码"""
            offsets = [3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,0]
            nums = []

            def custom_wrap(num: int) -> int:
                if num <= 49:
                    return num
                else:
                    return 1 + (num - 50) + 1

            for off in offsets:
                n = custom_wrap(base_num + off)
                nums.append(n)

            # 特殊规则：如果包含4,7,10且不包含1，则补上1
            if (4 in nums or 7 in nums or 10 in nums) and 1 not in nums:
                nums.append(1)
            # 去重并排序
            return sorted(list(dict.fromkeys(nums)))

        current_miss = 0
        max_miss = 0
        omission_history = []  # 收集每个触发期的遗漏值

        # 遍历所有期号
        for idx in range(len(all_rows) - 5):  # 保证有5期窗口
            row = all_rows[idx]
            period = row['period']

            # 仅处理期号末位为3或8
            try:
                if int(period) % 10 not in (3, 8):
                    continue
            except Exception:
                continue

            # 解析第position个号码
            try:
                nums = list(map(int, row['numbers'].split(',')))
                if len(nums) < position:
                    continue
                base_num = nums[position - 1]
            except Exception:
                continue

            gen_nums = gen_16_nums(base_num)

            # 检查后续5期的第7个号码
            hit = False
            for k in range(1, 6):
                j = idx + k
                if j >= len(all_rows):
                    break
                try:
                    next_nums = list(map(int, all_rows[j]['numbers'].split(',')))
                    if len(next_nums) >= 7 and next_nums[6] in gen_nums:
                        hit = True
                        break
                except Exception:
                    continue

            if hit:
                if current_miss > max_miss:
                    max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1

            # 记录每个触发期的遗漏值
            omission_history.append(current_miss)

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

        # 统计历史达到次数（两个维度）
        # 当前期是最后一期，索引为 len(omission_history) - 1
        current_idx = len(omission_history) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            # 找最新的触发期
            latest_trigger = None
            for idx in range(len(all_rows) - 1, -1, -1):
                period = all_rows[idx]['period']
                try:
                    if int(period) % 10 in (3, 8):
                        latest_trigger = period
                        break
                except Exception:
                    continue

            alerts.append({
                'analysis_type': 'second_fourxiao',
                'detail': f'第{position}位',
                'period': latest_trigger or all_rows[-1]['period'],
                'numbers': '16码触发期3/8尾',
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_five_period_threexiao_omission(lottery_type: str, min_current: int, max_gap: int,
                                         recent_periods: int = 200, exclude_period: str = None):
    """
    检查5期3肖计算的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period DESC LIMIT 300"
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        if len(all_rows) < 6:  # 需要至少6期数据
            return alerts

        def process_three_numbers(first_three: list[int]) -> list[int]:
            """处理前3个号码生成号码集"""
            processed_numbers = []
            for num in first_three:
                while num > 12:
                    num -= 12
                if 0 < num <= 12:
                    processed_numbers.append(num)

            offsets = [0, 12, 24, 36, 48]
            result_numbers = set()

            for base_num in processed_numbers:
                for offset in offsets:
                    new_num = base_num + offset
                    if new_num <= 49:
                        result_numbers.add(new_num)

            return sorted(list(result_numbers))

        current_miss = 0
        max_miss = 0
        omission_history = []  # 收集每个触发期的遗漏值

        # 遍历触发期（尾号0或5）
        for idx in range(len(all_rows) - 5):
            row = all_rows[idx]
            period = row['period']

            try:
                if int(period) % 10 not in (0, 5):
                    continue
            except Exception:
                continue

            # 获取前3个号码
            try:
                nums = list(map(int, row['numbers'].split(',')))
                if len(nums) < 3:
                    continue
                first_three = nums[:3]
            except Exception:
                continue

            generated_numbers = process_three_numbers(first_three)

            # 检查后续5期的第7个号码
            hit = False
            for k in range(1, 6):
                j = idx + k
                if j >= len(all_rows):
                    break
                try:
                    next_nums = list(map(int, all_rows[j]['numbers'].split(',')))
                    if len(next_nums) >= 7 and next_nums[6] in generated_numbers:
                        hit = True
                        break
                except Exception:
                    continue

            if hit:
                if current_miss > max_miss:
                    max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1

            # 记录每个触发期的遗漏值
            omission_history.append(current_miss)

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

        # 统计历史达到次数（两个维度）
        # 当前期是最后一期，索引为 len(omission_history) - 1
        current_idx = len(omission_history) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            # 找最新的触发期
            latest_trigger = None
            for idx in range(len(all_rows) - 1, -1, -1):
                period = all_rows[idx]['period']
                try:
                    if int(period) % 10 in (0, 5):
                        latest_trigger = period
                        break
                except Exception:
                    continue

            alerts.append({
                'analysis_type': 'five_period_threexiao',
                'detail': '前3码',
                'period': latest_trigger or all_rows[-1]['period'],
                'numbers': '触发期0/5尾',
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_place_results_omission(lottery_type: str, min_current: int, max_gap: int,
                                 recent_periods: int = 200, exclude_period: str = None):
    """
    检查关注点登记结果的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取指定彩种的关注点
        cursor.execute("""
            SELECT id, name
            FROM places
            WHERE lottery_type = %s
        """, (lottery_type,))
        places = cursor.fetchall()

        if not places:
            return alerts

        # 为每个关注点计算遗漏
        for place in places:
            place_id = place['id']
            place_name = place['name']

            # 获取该关注点的所有登记结果(按创建时间正序)
            sql = """
                SELECT is_correct, qishu, created_at
                FROM place_results
                WHERE place_id = %s
            """
            params = [place_id]

            if exclude_period:
                sql += " AND qishu < %s"
                params.append(exclude_period)

            sql += " ORDER BY created_at ASC"
            cursor.execute(sql, params)
            records = cursor.fetchall()

            if not records:
                continue

            # 计算当前遗漏和历史最大遗漏
            current_miss = 0
            max_miss = 0
            temp_miss = 0
            latest_qishu = ''
            omission_history = []  # 收集每期遗漏值

            for record in records:
                latest_qishu = record['qishu']  # 记录最新期数
                if record['is_correct'] == 1:
                    # 命中,重置当前遗漏
                    if temp_miss > max_miss:
                        max_miss = temp_miss
                    temp_miss = 0
                elif record['is_correct'] == 0:
                    # 遗漏,累加
                    temp_miss += 1

                # 记录每期的遗漏值
                omission_history.append(temp_miss)

            # 最后的连续遗漏就是当前遗漏
            current_miss = temp_miss
            if temp_miss > max_miss:
                max_miss = temp_miss

            # 统计历史达到次数（两个维度）
            # 当前期是最后一期，索引为 len(omission_history) - 1
            current_idx = len(omission_history) - 1

            # 统计1：历史总次数（只看当前期之前）
            total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, current_idx - recent_periods)
            recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

            # 检查是否满足条件
            if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
                alerts.append({
                    'analysis_type': 'place_results',
                    'detail': place_name,
                    'period': latest_qishu,
                    'numbers': f'关注点[{place_name}]',
                    'current_omission': current_miss,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current_miss,
                    'historical_reach_count': total_reach,
                    'recent_reach_count': recent_reach,
                    'recent_periods': recent_periods,
                    'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
                })

    return alerts


def check_recommend8_omission(lottery_type: str, min_current: int, max_gap: int,
                              recent_periods: int = 200, exclude_period: str = None):
    """
    检查推荐8码的遗漏情况（只检查第7位）

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取所有推荐8码记录（期号尾数为0或5）
        sql = """
            SELECT DISTINCT period
            FROM recommend_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period ASC"
        cursor.execute(sql, params)
        recommend_periods = cursor.fetchall()

        if not recommend_periods:
            return alerts

        # 遍历每个推荐期号
        current_miss = 0
        max_miss = 0
        omission_history = []  # 收集每个推荐期的遗漏值

        for rec_row in recommend_periods:
            period = rec_row['period']

            # 获取第7位的推荐号码
            cursor.execute("""
                SELECT numbers
                FROM recommend_result
                WHERE lottery_type=%s AND period=%s AND position=7
                ORDER BY period DESC
                LIMIT 1
            """, (lottery_type, period))
            rec_data = cursor.fetchone()

            if not rec_data:
                continue

            # 推荐号码列表
            recommended_nums = set(rec_data['numbers'].split(','))

            # 获取下一期的开奖数据
            cursor.execute("""
                SELECT numbers
                FROM lottery_result
                WHERE lottery_type=%s AND period > %s
                ORDER BY period ASC
                LIMIT 1
            """, (lottery_type, period))
            next_period = cursor.fetchone()

            if next_period:
                # 获取下一期第7个号码
                next_nums = next_period['numbers'].split(',')
                if len(next_nums) >= 7:
                    next_7th = next_nums[6]

                    # 检查是否命中
                    if next_7th in recommended_nums:
                        if current_miss > max_miss:
                            max_miss = current_miss
                        current_miss = 0
                    else:
                        current_miss += 1

                    # 记录每个推荐期的遗漏值
                    omission_history.append(current_miss)

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

        # 统计历史达到次数（两个维度）
        # 当前期是最后一期，索引为 len(omission_history) - 1
        current_idx = len(omission_history) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if recommend_periods and current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            last_period = recommend_periods[-1]['period']
            alerts.append({
                'analysis_type': 'recommend8',
                'detail': '第7位',
                'period': last_period,
                'numbers': '推荐8码',
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_recommend16_omission(lottery_type: str, min_current: int, max_gap: int,
                               recent_periods: int = 200, exclude_period: str = None):
    """
    检查推荐16码的遗漏情况（只检查第7位）

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取所有推荐16码记录（期号尾数为0或5）
        sql = """
            SELECT DISTINCT period
            FROM recommend16_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period ASC"
        cursor.execute(sql, params)
        recommend_periods = cursor.fetchall()

        if not recommend_periods:
            return alerts

        # 遍历每个推荐期号
        current_miss = 0
        max_miss = 0
        omission_history = []  # 收集每个推荐期的遗漏值

        for rec_row in recommend_periods:
            period = rec_row['period']

            # 获取第7位的推荐号码
            cursor.execute("""
                SELECT numbers
                FROM recommend16_result
                WHERE lottery_type=%s AND period=%s AND position=7
                ORDER BY period DESC
                LIMIT 1
            """, (lottery_type, period))
            rec_data = cursor.fetchone()

            if not rec_data:
                continue

            # 推荐号码列表
            recommended_nums = set(rec_data['numbers'].split(','))

            # 获取下一期的开奖数据
            cursor.execute("""
                SELECT numbers
                FROM lottery_result
                WHERE lottery_type=%s AND period > %s
                ORDER BY period ASC
                LIMIT 1
            """, (lottery_type, period))
            next_period = cursor.fetchone()

            if next_period:
                # 获取下一期第7个号码
                next_nums = next_period['numbers'].split(',')
                if len(next_nums) >= 7:
                    next_7th = next_nums[6]

                    # 检查是否命中
                    if next_7th in recommended_nums:
                        if current_miss > max_miss:
                            max_miss = current_miss
                        current_miss = 0
                    else:
                        current_miss += 1

                    # 记录每个推荐期的遗漏值
                    omission_history.append(current_miss)

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

        # 统计历史达到次数（两个维度）
        # 当前期是最后一期，索引为 len(omission_history) - 1
        current_idx = len(omission_history) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if recommend_periods and current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            last_period = recommend_periods[-1]['period']
            alerts.append({
                'analysis_type': 'recommend16',
                'detail': '第7位',
                'period': last_period,
                'numbers': '推荐16码',
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_recommend30_omission(lottery_type: str, min_current: int, max_gap: int,
                                recent_periods: int = 200, exclude_period: str = None):
    """
    检查推荐30码的遗漏情况（检查第7位）

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取所有推荐30码记录
        sql = """
            SELECT period, recommend_numbers, next_period, next_number,
                   is_hit, miss_count, max_miss
            FROM range_recommend30
            WHERE lottery_type=%s AND is_hit IS NOT NULL
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period ASC"
        cursor.execute(sql, params)
        records = cursor.fetchall()

        if not records:
            return alerts

        # 直接使用最后一条记录的遗漏数据
        latest_record = records[-1]
        current_miss = latest_record['miss_count'] or 0
        max_miss = latest_record['max_miss'] or 0

        # 统计历史达到次数（两个维度）
        omission_values = [rec['miss_count'] or 0 for rec in records]
        current_idx = len(omission_values) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_values[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_values[i] >= current_miss > 0)

        # 检查是否满足条件
        if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            alerts.append({
                'analysis_type': 'recommend30',
                'detail': '第7位',
                'period': latest_record['period'],
                'numbers': latest_record['recommend_numbers'],
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_seventh_smart20_omission(lottery_type: str, min_current: int, max_gap: int,
                                    recent_periods: int = 200, exclude_period: str = None):
    """
    检查第7码智能推荐20码的遗漏情况

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取所有智能推荐20码记录
        sql = """
            SELECT period, recommend_numbers
            FROM seventh_smart20_history
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period ASC"
        cursor.execute(sql, params)
        smart20_periods = cursor.fetchall()

        if not smart20_periods:
            return alerts

        # 遍历每个推荐期号，计算遗漏
        current_miss = 0
        max_miss = 0
        omission_history = []

        for idx, rec_row in enumerate(smart20_periods):
            period = rec_row['period']
            recommend_str = rec_row['recommend_numbers']

            if not recommend_str:
                continue

            # 解析推荐的20个号码
            recommended_nums = set(recommend_str.split(','))

            # 获取下一期的开奖数据
            cursor.execute("""
                SELECT numbers
                FROM lottery_result
                WHERE lottery_type=%s AND period > %s
                ORDER BY period ASC
                LIMIT 1
            """, (lottery_type, period))
            next_period = cursor.fetchone()

            if next_period:
                # 获取下一期第7个号码
                next_nums = next_period['numbers'].split(',')
                if len(next_nums) >= 7:
                    next_7th = next_nums[6]

                    # 检查是否命中
                    if next_7th in recommended_nums:
                        if current_miss > max_miss:
                            max_miss = current_miss
                        current_miss = 0
                    else:
                        current_miss += 1

                    # 记录每个推荐期的遗漏值
                    omission_history.append(current_miss)

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

        # 统计历史达到次数（两个维度）
        if omission_history:
            current_idx = len(omission_history) - 1

            # 统计1：历史总次数（只看当前期之前）
            total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

            # 统计2：近期次数（最近N期，不包括当前期）
            start_idx = max(0, current_idx - recent_periods)
            recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

            # 检查是否满足条件
            if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
                last_period = smart20_periods[-1]['period']
                last_recommend = smart20_periods[-1]['recommend_numbers']

                alerts.append({
                    'analysis_type': 'seventh_smart20',
                    'detail': '第7位',
                    'period': last_period,
                    'numbers': last_recommend,
                    'current_omission': current_miss,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current_miss,
                    'historical_reach_count': total_reach,
                    'recent_reach_count': recent_reach,
                    'recent_periods': recent_periods,
                    'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
                })

    return alerts


def check_high20_omission(lottery_type: str, min_current: int, max_gap: int,
                          recent_periods: int = 200, exclude_period: str = None):
    """
    检查高20码分析的遗漏情况

    策略：组合策略
    - 近100期的热号top10
    - 全部600期的中频号（排除top15和bottom15，取中间20个中的10个）

    Args:
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    from collections import Counter

    alerts = []

    def get_seventh_number(numbers_str):
        """获取第7个号码"""
        if not numbers_str:
            return None
        numbers = [int(n) for n in numbers_str.split(',')]
        return numbers[6] if len(numbers) >= 7 else None

    with get_db_cursor() as cursor:
        # 获取所有历史数据（按期号正序）
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period ASC"
        cursor.execute(sql, tuple(params))
        all_records = cursor.fetchall()

    if len(all_records) < 601:
        return alerts

    # 分析每期的高20码，计算遗漏
    results = []

    for i in range(600, len(all_records)):
        current_record = all_records[i]
        current_period = current_record['period']

        # 策略：组合近期热号和中期稳定号
        # 1. 近100期的热号top10
        recent_100 = all_records[i-100:i]
        recent_nums = [get_seventh_number(r['numbers']) for r in recent_100]
        recent_nums = [n for n in recent_nums if n is not None]
        recent_counter = Counter(recent_nums)
        hot_10 = [num for num, _ in recent_counter.most_common(10)]

        # 2. 全部600期的中频号（排除top15和bottom15）
        all_600 = all_records[i-600:i]
        all_nums = [get_seventh_number(r['numbers']) for r in all_600]
        all_nums = [n for n in all_nums if n is not None]
        all_counter = Counter(all_nums)
        sorted_all = sorted(all_counter.items(), key=lambda x: x[1], reverse=True)
        middle_nums = [num for num, _ in sorted_all[15:35]]  # 取中间20个

        # 3. 组合：热号10 + 中频号中选10个（不重复的）
        combined = set(hot_10)
        for num in middle_nums:
            if num not in combined and len(combined) < 20:
                combined.add(num)

        final_20 = list(combined)[:20]

        # 检查下一期是否命中（如果存在下一期）
        is_hit = None

        if i + 1 < len(all_records):
            next_record = all_records[i + 1]
            next_seventh = get_seventh_number(next_record['numbers'])

            if next_seventh is not None:
                is_hit = next_seventh in final_20

        results.append({
            'period': current_period,
            'top20_numbers': final_20,
            'is_hit': is_hit
        })

    # 计算遗漏值
    current_miss = 0
    max_miss = 0
    omission_history = []

    for result in results:
        if result['is_hit'] is not None:
            if result['is_hit']:
                if current_miss > max_miss:
                    max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1

            omission_history.append(current_miss)

    # 遍历结束后，更新最大遗漏
    if current_miss > max_miss:
        max_miss = current_miss

    # 统计历史达到次数（两个维度）
    if omission_history:
        current_idx = len(omission_history) - 1

        # 统计1：历史总次数（只看当前期之前）
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 统计2：近期次数（最近N期，不包括当前期）
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            last_result = results[-1]
            top20_str = ','.join(map(str, sorted(last_result['top20_numbers'])))

            alerts.append({
                'analysis_type': 'high20',
                'detail': '第7位',
                'period': last_result['period'],
                'numbers': top20_str,
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_color_analysis_omission(lottery_type: str, min_current: int, max_gap: int,
                                  recent_periods: int = 200, exclude_period: str = None):
    """
    检查波色分析的遗漏情况

    规则：根据当前期前6个号码的第2位波色，预测下一期第7位号码的波色

    Args:
        lottery_type: 彩种类型
        min_current: 最小当前遗漏
        max_gap: 距离最大遗漏的最大差值
        recent_periods: 近期统计期数范围（默认200期）
        exclude_period: 要排除的期号（用于获取开奖前的预警）
    """
    alerts = []

    # 波色定义
    color_groups = {
        'red': [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
        'blue': [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
        'green': [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]
    }

    def get_number_color(number):
        """获取号码的波色"""
        if number in color_groups['red']:
            return 'red'
        elif number in color_groups['blue']:
            return 'blue'
        elif number in color_groups['green']:
            return 'green'
        return None

    def is_consecutive_periods(current_period, next_period):
        """检查期数是否连续"""
        if not current_period or not next_period:
            return False
        try:
            return int(next_period) == int(current_period) + 1
        except:
            return False

    with get_db_cursor() as cursor:
        # 获取开奖记录
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
        """
        params = [lottery_type]

        if exclude_period:
            sql += " AND period < %s"
            params.append(exclude_period)

        sql += " ORDER BY period ASC"
        cursor.execute(sql, params)
        records = cursor.fetchall()

    if len(records) < 2:
        return alerts

    # 进行波色分析
    results = []

    for i in range(len(records) - 1):
        current_record = records[i]
        next_record = records[i + 1]

        # 检查期数连续性
        if not is_consecutive_periods(current_record['period'], next_record['period']):
            continue

        try:
            # 解析号码
            current_numbers = [int(n.strip()) for n in current_record['numbers'].split(',') if n.strip().isdigit()]
            next_numbers = [int(n.strip()) for n in next_record['numbers'].split(',') if n.strip().isdigit()]

            if len(current_numbers) < 6 or len(next_numbers) < 7:
                continue

            # 获取当前期前6个号码的第2位
            first6_sorted = sorted(current_numbers[:6])
            second_number = first6_sorted[1]
            second_color = get_number_color(second_number)

            # 获取下一期第7位号码
            next_seventh = next_numbers[6]
            next_seventh_color = get_number_color(next_seventh)

            # 判断是否命中
            is_hit = second_color == next_seventh_color

            results.append({
                'period': current_record['period'],
                'second_number': second_number,
                'second_color': second_color,
                'next_period': next_record['period'],
                'next_seventh': next_seventh,
                'next_seventh_color': next_seventh_color,
                'is_hit': is_hit
            })
        except:
            continue

    if not results:
        return alerts

    # 计算遗漏值
    current_miss = 0
    max_miss = 0
    omission_history = []

    for result in results:
        if result['is_hit']:
            if current_miss > max_miss:
                max_miss = current_miss
            current_miss = 0
        else:
            current_miss += 1

        omission_history.append(current_miss)

    # 更新最大遗漏
    if current_miss > max_miss:
        max_miss = current_miss

    # 统计历史达到次数
    if omission_history:
        current_idx = len(omission_history) - 1

        # 历史总次数
        total_reach = sum(1 for i in range(current_idx) if omission_history[i] >= current_miss > 0)

        # 近期次数
        start_idx = max(0, current_idx - recent_periods)
        recent_reach = sum(1 for i in range(start_idx, current_idx) if omission_history[i] >= current_miss > 0)

        # 检查是否满足条件
        if current_miss >= min_current and (max_miss - current_miss) <= max_gap:
            last_result = results[-1]

            # 波色名称映射
            color_names = {'red': '红波', 'blue': '蓝波', 'green': '绿波'}
            predicted_color = color_names.get(last_result['second_color'], last_result['second_color'])

            alerts.append({
                'analysis_type': 'color_analysis',
                'detail': '前6码第2位→第7位波色',
                'period': last_result['period'],
                'numbers': f"预测下期第7位波色: {predicted_color}",
                'current_omission': current_miss,
                'max_omission': max_miss,
                'gap_from_max': max_miss - current_miss,
                'historical_reach_count': total_reach,
                'recent_reach_count': recent_reach,
                'recent_periods': recent_periods,
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


@router.get("/api/monitor/omission_alerts")
def get_omission_alerts(
    lottery_type: str = Query('am', description='彩种类型: am=澳门, hk=香港'),
    min_current_omission: int = Query(8, ge=0, description='最小当前遗漏期数'),
    max_gap_from_max: int = Query(3, ge=0, description='当前遗漏距离最大遗漏的最大差值'),
    analysis_types: Optional[str] = Query(None, description='分析类型过滤，逗号分隔')
):
    """
    遗漏监控 - 获取所有接近爆发的号码组合

    监控逻辑：
    1. 当前遗漏 >= min_current_omission（默认8期）
    2. max_omission - current_omission <= max_gap_from_max（默认3期）

    返回所有满足条件的分析项，按优先级排序
    """
    all_alerts = []

    # 解析分析类型过滤
    enabled_types = set()
    if analysis_types:
        enabled_types = set(analysis_types.split(','))
    else:
        # 默认启用所有分析类型
        enabled_types = {
            'hot20', 'plus_minus6', 'plus_range', 'minus_range',
            'favorite_numbers', 'each_issue', 'front6_szz', 'seventh_range',
            'second_fourxiao', 'five_period_threexiao', 'place_results',
            'recommend8', 'recommend16', 'recommend30', 'seventh_smart20', 'high20',
            'color_analysis'
        }

    # 检查各种分析
    if 'hot20' in enabled_types:
        all_alerts.extend(check_hot20_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'plus_minus6' in enabled_types:
        all_alerts.extend(check_plus_minus6_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'plus_range' in enabled_types:
        all_alerts.extend(check_range_analysis_omission(lottery_type, min_current_omission, max_gap_from_max, is_plus=True))

    if 'minus_range' in enabled_types:
        all_alerts.extend(check_range_analysis_omission(lottery_type, min_current_omission, max_gap_from_max, is_plus=False))

    if 'favorite_numbers' in enabled_types:
        all_alerts.extend(check_favorite_numbers_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'each_issue' in enabled_types:
        all_alerts.extend(check_each_issue_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'front6_szz' in enabled_types:
        all_alerts.extend(check_front6_szz_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'seventh_range' in enabled_types:
        all_alerts.extend(check_seventh_range_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'second_fourxiao' in enabled_types:
        all_alerts.extend(check_second_fourxiao_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'five_period_threexiao' in enabled_types:
        all_alerts.extend(check_five_period_threexiao_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'place_results' in enabled_types:
        all_alerts.extend(check_place_results_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'recommend8' in enabled_types:
        all_alerts.extend(check_recommend8_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'recommend16' in enabled_types:
        all_alerts.extend(check_recommend16_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'recommend30' in enabled_types:
        all_alerts.extend(check_recommend30_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'seventh_smart20' in enabled_types:
        all_alerts.extend(check_seventh_smart20_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'high20' in enabled_types:
        all_alerts.extend(check_high20_omission(lottery_type, min_current_omission, max_gap_from_max))

    if 'color_analysis' in enabled_types:
        all_alerts.extend(check_color_analysis_omission(lottery_type, min_current_omission, max_gap_from_max))

    # 按优先级和遗漏期数排序
    priority_order = {'high': 1, 'medium': 2, 'low': 3}
    all_alerts.sort(key=lambda x: (priority_order.get(x['priority'], 99), -x['current_omission']))

    return {
        'lottery_type': lottery_type,
        'min_current_omission': min_current_omission,
        'max_gap_from_max': max_gap_from_max,
        'total_alerts': len(all_alerts),
        'alerts': all_alerts,
        'summary': {
            'high_priority': len([a for a in all_alerts if a['priority'] == 'high']),
            'medium_priority': len([a for a in all_alerts if a['priority'] == 'medium']),
            'low_priority': len([a for a in all_alerts if a['priority'] == 'low'])
        }
    }


@router.get("/api/monitor/config")
def get_monitor_config():
    """获取监控配置信息"""
    return {
        'available_analysis_types': [
            {'value': 'hot20', 'label': '去10最热20', 'description': '第7位Top20号码'},
            {'value': 'plus_minus6', 'label': '加减前6码', 'description': '前6码±1到±6共6组'},
            {'value': 'plus_range', 'label': '+1~+20区间', 'description': '第7位的6个正向区间'},
            {'value': 'minus_range', 'label': '-1~-20区间', 'description': '第7位的6个反向区间'},
            {'value': 'favorite_numbers', 'label': '关注号码', 'description': '用户自定义号码组合'},
            {'value': 'each_issue', 'label': '每期分析', 'description': '基于位置号码的多偏移组合'},
            {'value': 'front6_szz', 'label': '前6码三中三', 'description': '尾数0或5触发的推荐'},
            {'value': 'seventh_range', 'label': '第7码区间', 'description': '第7个号码的6个区间'},
            {'value': 'second_fourxiao', 'label': '第二码4肖', 'description': '期号3/8尾触发，后5期第7码'},
            {'value': 'five_period_threexiao', 'label': '5期3肖', 'description': '期号0/5尾触发，前3码生成'},
            {'value': 'place_results', 'label': '关注点登记结果', 'description': '关注点登记的命中遗漏统计'},
            {'value': 'recommend8', 'label': '推荐8码', 'description': '期号0/5尾触发，第7位推荐8码'},
            {'value': 'recommend16', 'label': '推荐16码', 'description': '期号0/5尾触发，第7位推荐16码'},
            {'value': 'recommend30', 'label': '推荐30码', 'description': '基于最近200期最热30码推荐'},
            {'value': 'seventh_smart20', 'label': '第7码智能推荐20码', 'description': '基于多维度评分的智能推荐20码'},
            {'value': 'high20', 'label': '高20码分析', 'description': '基于600期组合策略：近期热号+中期稳定号'},
            {'value': 'color_analysis', 'label': '波色分析', 'description': '前6码第2位波色预测下期第7位波色'}
        ],
        'default_min_current_omission': 8,
        'default_max_gap_from_max': 3,
        'priority_levels': [
            {'value': 'high', 'label': '高优先级', 'description': '距离最大遗漏≤1期'},
            {'value': 'medium', 'label': '中优先级', 'description': '距离最大遗漏2-3期'},
            {'value': 'low', 'label': '低优先级', 'description': '距离最大遗漏>3期'}
        ]
    }


@router.get("/api/monitor/debug/each_issue")
def debug_each_issue_omission(
    lottery_type: str = Query('am', description='彩种类型: am=澳门, hk=香港')
):
    """调试每期分析的遗漏情况"""

    # 1. 获取配置
    with get_db_cursor() as cursor:
        cursor.execute("""
            SELECT * FROM monitor_config
            WHERE lottery_type = %s AND analysis_type = 'each_issue'
        """, (lottery_type,))
        config = cursor.fetchone()

    if not config:
        return {'error': f'没有找到{lottery_type}的每期分析配置'}

    # 2. 使用宽松条件获取所有可能的预警
    all_alerts = check_each_issue_omission(lottery_type, 0, 999)

    # 3. 检查哪些满足配置条件
    result = {
        'lottery_type': lottery_type,
        'config': {
            'min_current_omission': config['min_current_omission'],
            'max_gap_from_max': config['max_gap_from_max'],
            'enabled': bool(config['enabled'])
        },
        'total_found': len(all_alerts),
        'alerts': []
    }

    for alert in all_alerts:
        current = alert['current_omission']
        max_miss = alert['max_omission']
        gap = alert['gap_from_max']

        satisfies = (current >= config['min_current_omission'] and
                    gap <= config['max_gap_from_max'])

        reasons = []
        if not satisfies:
            if current < config['min_current_omission']:
                reasons.append(f"当前遗漏{current} < 最小遗漏{config['min_current_omission']}")
            if gap > config['max_gap_from_max']:
                reasons.append(f"距离最大{gap} > 最大距离{config['max_gap_from_max']}")

        result['alerts'].append({
            'period': alert['period'],
            'current_omission': current,
            'max_omission': max_miss,
            'gap_from_max': gap,
            'satisfies_config': satisfies,
            'reasons': reasons
        })

    result['satisfies_count'] = len([a for a in result['alerts'] if a['satisfies_config']])

    return result


@router.get("/api/monitor/configs")
def get_all_monitor_configs(
    lottery_type: str = Query('am', description='彩种类型: am=澳门, hk=香港')
):
    """获取所有监控点的配置"""
    with get_db_cursor() as cursor:
        sql = """
            SELECT id, lottery_type, analysis_type, detail,
                   min_current_omission, max_gap_from_max, recent_periods,
                   enabled, priority_level, created_at, updated_at
            FROM monitor_config
            WHERE lottery_type = %s
            ORDER BY analysis_type, detail
        """
        cursor.execute(sql, (lottery_type,))
        configs = cursor.fetchall()

    return {
        'lottery_type': lottery_type,
        'total': len(configs),
        'configs': configs
    }


@router.post("/api/monitor/config")
def save_monitor_config(config: dict):
    """保存或更新监控点配置"""
    required_fields = ['lottery_type', 'analysis_type']
    for field in required_fields:
        if field not in config:
            return {'success': False, 'error': f'缺少必需字段: {field}'}

    lottery_type = config.get('lottery_type')
    analysis_type = config.get('analysis_type')
    detail = config.get('detail', '')
    min_current_omission = config.get('min_current_omission', 8)
    max_gap_from_max = config.get('max_gap_from_max', 3)
    recent_periods = config.get('recent_periods', 200)
    enabled = config.get('enabled', 1)
    priority_level = config.get('priority_level', 'medium')

    try:
        with get_db_cursor(commit=True) as cursor:
            sql = """
                INSERT INTO monitor_config
                (lottery_type, analysis_type, detail, min_current_omission,
                 max_gap_from_max, recent_periods, enabled, priority_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    min_current_omission = VALUES(min_current_omission),
                    max_gap_from_max = VALUES(max_gap_from_max),
                    recent_periods = VALUES(recent_periods),
                    enabled = VALUES(enabled),
                    priority_level = VALUES(priority_level),
                    updated_at = CURRENT_TIMESTAMP
            """
            cursor.execute(sql, (
                lottery_type, analysis_type, detail,
                min_current_omission, max_gap_from_max, recent_periods,
                enabled, priority_level
            ))

        return {'success': True, 'message': '配置保存成功'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@router.post("/api/monitor/configs/batch")
def batch_update_monitor_configs(data: dict):
    """批量更新监控点配置"""
    configs = data.get('configs', [])

    if not configs:
        return {'success': False, 'error': '没有提供配置数据'}

    try:
        with get_db_cursor(commit=True) as cursor:
            for config in configs:
                sql = """
                    INSERT INTO monitor_config
                    (lottery_type, analysis_type, detail, min_current_omission,
                     max_gap_from_max, recent_periods, enabled, priority_level)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        min_current_omission = VALUES(min_current_omission),
                        max_gap_from_max = VALUES(max_gap_from_max),
                        recent_periods = VALUES(recent_periods),
                        enabled = VALUES(enabled),
                        priority_level = VALUES(priority_level),
                        updated_at = CURRENT_TIMESTAMP
                """
                cursor.execute(sql, (
                    config.get('lottery_type'),
                    config.get('analysis_type'),
                    config.get('detail', ''),
                    config.get('min_current_omission', 8),
                    config.get('max_gap_from_max', 3),
                    config.get('recent_periods', 200),
                    config.get('enabled', 1),
                    config.get('priority_level', 'medium')
                ))

        return {'success': True, 'message': f'成功更新{len(configs)}个配置'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@router.delete("/api/monitor/config/{config_id}")
def delete_monitor_config(config_id: int):
    """删除监控点配置"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM monitor_config WHERE id = %s", (config_id,))

        return {'success': True, 'message': '配置删除成功'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


@router.get("/api/monitor/omission_alerts_v2")
def get_omission_alerts_with_config(
    lottery_type: str = Query('am', description='彩种类型: am=澳门, hk=香港'),
    exclude_period: str = None
):
    """
    遗漏监控V2 - 使用数据库中每个监控点的独立配置

    每个监控点可以有不同的：
    - min_current_omission（最小当前遗漏期数）
    - max_gap_from_max（距离最大遗漏的最大差值）
    - enabled（是否启用）
    """
    all_alerts = []

    # 从数据库获取所有启用的监控配置
    with get_db_cursor() as cursor:
        sql = """
            SELECT analysis_type, detail, min_current_omission, max_gap_from_max, recent_periods
            FROM monitor_config
            WHERE lottery_type = %s AND enabled = 1
            ORDER BY analysis_type, detail
        """
        cursor.execute(sql, (lottery_type,))
        configs = cursor.fetchall()

    if not configs:
        return {
            'lottery_type': lottery_type,
            'total_alerts': 0,
            'alerts': [],
            'summary': {
                'high_priority': 0,
                'medium_priority': 0,
                'low_priority': 0
            },
            'message': '没有启用的监控配置'
        }

    # 按分析类型分组配置
    config_map = {}
    for cfg in configs:
        analysis_type = cfg['analysis_type']
        if analysis_type not in config_map:
            config_map[analysis_type] = []
        config_map[analysis_type].append(cfg)

    # 调试：打印 config_map 的键
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"config_map keys: {list(config_map.keys())}")
    logger.info(f"Total enabled configs: {len(configs)}")

    # 对每个分析类型执行一次检查，获取所有可能的预警
    # 然后根据每个预警的 detail 匹配对应的配置
    raw_alerts = []

    for analysis_type in config_map.keys():
        logger.info(f"Processing analysis_type: {analysis_type}")
        # 使用最宽松的条件调用检查函数（min=0, max=999）
        # 这样可以获取所有可能的预警，然后再用具体配置过滤
        # 获取该类型的第一个配置的recent_periods（所有配置共用）
        type_recent_periods = config_map[analysis_type][0].get('recent_periods', 200)

        if analysis_type == 'hot20':
            raw_alerts.extend(check_hot20_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'plus_minus6':
            raw_alerts.extend(check_plus_minus6_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'plus_range':
            raw_alerts.extend(check_range_analysis_omission(lottery_type, 0, 999, is_plus=True, recent_periods=type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'minus_range':
            raw_alerts.extend(check_range_analysis_omission(lottery_type, 0, 999, is_plus=False, recent_periods=type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'favorite_numbers':
            raw_alerts.extend(check_favorite_numbers_omission(lottery_type, 0, 999, recent_periods=type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'each_issue':
            raw_alerts.extend(check_each_issue_omission(lottery_type, 0, 999, recent_periods=type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'front6_szz':
            raw_alerts.extend(check_front6_szz_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'seventh_range':
            raw_alerts.extend(check_seventh_range_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'second_fourxiao':
            # 为每个配置的位置分别检查
            type_configs = config_map.get('second_fourxiao', [])
            for cfg in type_configs:
                detail = cfg.get('detail', '第2位')
                # 从detail中提取位置号 (如 "第1位" -> 1)
                try:
                    position = int(detail.replace('第', '').replace('位', ''))
                    raw_alerts.extend(check_second_fourxiao_omission(lottery_type, 0, 999, position=position, recent_periods=type_recent_periods, exclude_period=exclude_period))
                except:
                    # 如果解析失败,使用默认位置2
                    raw_alerts.extend(check_second_fourxiao_omission(lottery_type, 0, 999, position=2, recent_periods=type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'five_period_threexiao':
            raw_alerts.extend(check_five_period_threexiao_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'place_results':
            raw_alerts.extend(check_place_results_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'recommend8':
            raw_alerts.extend(check_recommend8_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'recommend16':
            raw_alerts.extend(check_recommend16_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'recommend30':
            raw_alerts.extend(check_recommend30_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'seventh_smart20':
            raw_alerts.extend(check_seventh_smart20_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'high20':
            raw_alerts.extend(check_high20_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

        elif analysis_type == 'color_analysis':
            raw_alerts.extend(check_color_analysis_omission(lottery_type, 0, 999, type_recent_periods, exclude_period=exclude_period))

    # 根据配置过滤预警：每个预警必须匹配一个启用的配置，并且满足该配置的条件
    filtered_alerts = []
    debug_info = []  # 调试信息

    for alert in raw_alerts:
        # 查找匹配的配置
        matching_config = None
        for cfg in configs:
            # 精确匹配 analysis_type 和 detail
            type_match = cfg['analysis_type'] == alert['analysis_type']
            logger.info(f"Checking config: type={cfg['analysis_type']}, alert_type={alert['analysis_type']}, type_match={type_match}")

            if type_match:
                alert_detail = alert.get('detail', '').strip()
                config_detail = (cfg['detail'] or '').strip()

                detail_match = alert_detail == config_detail

                # 对于关注号码类型，配置的detail字段作为通配符，匹配所有组
                if alert['analysis_type'] == 'favorite_numbers' and config_detail:
                    detail_match = True
                    logger.info(f"Favorite numbers - wildcard match enabled for detail='{config_detail}'")

                logger.info(f"Detail match: alert='{alert_detail}', config='{config_detail}', match={detail_match}")

                # detail 完全匹配，或者配置的 detail 为空（通配）
                if detail_match or not config_detail:
                    matching_config = cfg
                    logger.info(f"Config matched!")
                    break

        if matching_config:
            # 检查是否满足该配置的条件
            min_omission = matching_config['min_current_omission']
            max_gap = matching_config['max_gap_from_max']

            current = alert.get('current_omission', 0)
            gap = alert.get('gap_from_max', 999)

            # 记录调试信息
            debug_info.append({
                'alert_type': alert['analysis_type'],
                'alert_detail': alert.get('detail', ''),
                'config_detail': matching_config['detail'],
                'current': current,
                'min': min_omission,
                'gap': gap,
                'max_gap': max_gap,
                'passed': current >= min_omission and gap <= max_gap
            })

            if current >= min_omission and gap <= max_gap:
                # 添加中文标签
                alert['analysis_type_label'] = ANALYSIS_TYPE_LABELS.get(alert['analysis_type'], alert['analysis_type'])
                filtered_alerts.append(alert)
        else:
            # 没有匹配的配置
            debug_info.append({
                'alert_type': alert['analysis_type'],
                'alert_detail': alert.get('detail', ''),
                'config_detail': None,
                'error': 'no matching config'
            })

    # 按优先级和遗漏期数排序
    priority_order = {'high': 1, 'medium': 2, 'low': 3}
    filtered_alerts.sort(key=lambda x: (priority_order.get(x['priority'], 99), -x['current_omission']))

    return {
        'lottery_type': lottery_type,
        'total_alerts': len(filtered_alerts),
        'alerts': filtered_alerts,
        'summary': {
            'high_priority': len([a for a in filtered_alerts if a['priority'] == 'high']),
            'medium_priority': len([a for a in filtered_alerts if a['priority'] == 'medium']),
            'low_priority': len([a for a in filtered_alerts if a['priority'] == 'low'])
        },
        'config_count': len(configs),
        'debug': debug_info  # 调试信息
    }


@router.get("/api/monitor/debug/config_map")
def debug_config_map(lottery_type: str = 'am'):
    """调试：查看config_map的内容"""
    with get_db_cursor() as cursor:
        sql = """
            SELECT analysis_type, detail, min_current_omission, max_gap_from_max, enabled
            FROM monitor_config
            WHERE lottery_type = %s AND enabled = 1
            ORDER BY analysis_type, detail
        """
        cursor.execute(sql, (lottery_type,))
        configs = cursor.fetchall()

    config_map = {}
    for cfg in configs:
        analysis_type = cfg['analysis_type']
        if analysis_type not in config_map:
            config_map[analysis_type] = []
        config_map[analysis_type].append({
            'detail': cfg['detail'],
            'min': cfg['min_current_omission'],
            'max_gap': cfg['max_gap_from_max']
        })

    return {
        'lottery_type': lottery_type,
        'total_configs': len(configs),
        'config_map_keys': list(config_map.keys()),
        'config_map': config_map,
        'has_place_results': 'place_results' in config_map
    }


@router.post("/api/monitor/sync_config_am_to_hk")
def sync_config_am_to_hk():
    """
    同步澳门配置到香港
    将澳门(am)的所有监控配置复制到香港(hk)
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # 1. 获取所有澳门配置
            cursor.execute("""
                SELECT analysis_type, detail, min_current_omission,
                       max_gap_from_max, enabled, priority_level
                FROM monitor_config
                WHERE lottery_type = 'am'
            """)
            am_configs = cursor.fetchall()

            if not am_configs:
                return {
                    'success': False,
                    'error': '没有找到澳门配置'
                }

            # 2. 为每个澳门配置创建/更新对应的香港配置
            synced_count = 0
            for config in am_configs:
                sql = """
                    INSERT INTO monitor_config
                    (lottery_type, analysis_type, detail, min_current_omission,
                     max_gap_from_max, enabled, priority_level)
                    VALUES ('hk', %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        min_current_omission = VALUES(min_current_omission),
                        max_gap_from_max = VALUES(max_gap_from_max),
                        enabled = VALUES(enabled),
                        priority_level = VALUES(priority_level),
                        updated_at = CURRENT_TIMESTAMP
                """
                cursor.execute(sql, (
                    config['analysis_type'],
                    config['detail'],
                    config['min_current_omission'],
                    config['max_gap_from_max'],
                    config['enabled'],
                    config['priority_level']
                ))
                synced_count += 1

        return {
            'success': True,
            'synced_count': synced_count,
            'message': f'成功同步{synced_count}个配置从澳门到香港'
        }

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"同步配置失败: {e}")
        return {
            'success': False,
            'error': str(e)
        }


# ====================
# 监控命中记录功能
# ====================

def _get_omission_alerts_before_period(lottery_type: str, exclude_period: str):
    """
    获取开奖前的预警（排除指定期号）

    Args:
        lottery_type: 彩种类型
        exclude_period: 要排除的期号（通常是最新期）

    Returns:
        预警数据字典
    """
    return get_omission_alerts_with_config(lottery_type, exclude_period=exclude_period)


def check_and_record_monitor_hits(lottery_type: str, latest_period: str):
    """
    检查并记录监控命中情况
    在每次采集新数据后调用，检查是否有监控项命中

    重要：预警应该基于开奖前的数据（最新期的上一期），而不是开奖后的数据

    Args:
        lottery_type: 彩种类型
        latest_period: 最新期号
    """
    import logging
    logger = logging.getLogger(__name__)

    try:
        # 1. 获取最新期的上一期（作为预警基准期）
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT period
                FROM lottery_result
                WHERE lottery_type=%s AND period < %s
                ORDER BY period DESC
                LIMIT 1
            """, (lottery_type, latest_period))
            previous_row = cursor.fetchone()

            if not previous_row:
                logger.warning(f"未找到期号 {latest_period} 的上一期")
                return

            base_period = previous_row['period']
            logger.info(f"基于期号 {base_period}（开奖前）生成预警，检查期号 {latest_period} 是否命中")

        # 2. 获取基于上一期的预警（模拟开奖前的状态）
        alerts_data = _get_omission_alerts_before_period(lottery_type, latest_period)
        alerts = alerts_data.get('alerts', [])

        if not alerts:
            logger.info(f"没有活跃的预警，跳过命中检测")
            return

        logger.info(f"检测到 {len(alerts)} 个预警，开始检查命中情况...")

        # 2. 获取最新期的开奖数据
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT period, numbers, open_time
                FROM lottery_result
                WHERE lottery_type=%s AND period=%s
            """, (lottery_type, latest_period))
            latest_record = cursor.fetchone()

            if not latest_record:
                logger.warning(f"未找到期号 {latest_period} 的开奖数据")
                return

            latest_numbers = latest_record['numbers'].split(',')
            open_time = latest_record['open_time']

        # 3. 对每个预警检查是否命中
        with get_db_cursor(commit=True) as cursor:
            for alert in alerts:
                analysis_type = alert['analysis_type']
                detail = alert.get('detail', '')
                alert_period = alert['period']
                alert_omission = alert['current_omission']
                max_omission = alert['max_omission']

                # 检查是否命中（根据不同类型有不同的判断逻辑）
                hit_info = check_alert_hit(
                    analysis_type, detail, alert, latest_numbers, lottery_type
                )

                if hit_info:
                    # 检查是否已经记录过这个命中
                    cursor.execute("""
                        SELECT id FROM monitor_hit_records
                        WHERE lottery_type=%s AND analysis_type=%s
                        AND detail=%s AND alert_period=%s AND hit_period=%s
                    """, (lottery_type, analysis_type, detail, alert_period, latest_period))

                    if cursor.fetchone():
                        logger.info(f"预警 {analysis_type}-{detail} 命中已记录，跳过")
                        continue

                    # 计算等待期数
                    wait_periods = int(latest_period) - int(alert_period)

                    # 记录命中
                    cursor.execute("""
                        INSERT INTO monitor_hit_records
                        (lottery_type, analysis_type, detail,
                         alert_period, alert_omission, max_omission, alert_numbers, alert_time,
                         hit_period, hit_numbers, hit_position, hit_number, hit_time, wait_periods)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s)
                    """, (
                        lottery_type, analysis_type, detail,
                        alert_period, alert_omission, max_omission,
                        alert.get('numbers', ''), # alert_numbers
                        latest_period, # hit_period
                        ','.join(latest_numbers), # hit_numbers
                        hit_info.get('position'), # hit_position
                        hit_info.get('number'), # hit_number
                        open_time, # hit_time
                        wait_periods
                    ))

                    logger.info(f"✓ 记录命中: {analysis_type}-{detail}, 预警期:{alert_period}, 命中期:{latest_period}")

    except Exception as e:
        logger.error(f"检查监控命中失败: {e}", exc_info=True)


def check_alert_hit(analysis_type: str, detail: str, alert: dict,
                    latest_numbers: list, lottery_type: str) -> dict:
    """
    检查预警是否命中

    Args:
        analysis_type: 分析类型
        detail: 详细信息
        alert: 预警信息
        latest_numbers: 最新开奖号码列表
        lottery_type: 彩种类型

    Returns:
        命中信息字典，包含 position 和 number，如果未命中返回 None
    """
    # 根据不同的分析类型判断是否命中
    if analysis_type in ['recommend8', 'recommend16']:
        # 推荐8码/16码：检查第7位是否在推荐号码中
        if len(latest_numbers) < 7:
            return None

        recommended_nums = set(alert.get('numbers', '').split(','))
        hit_number = latest_numbers[6]

        if hit_number in recommended_nums:
            return {'position': 7, 'number': hit_number}

    elif analysis_type == 'hot20':
        # 去10最热20：检查第7位是否在热20中
        if len(latest_numbers) < 7:
            return None

        hot20_nums = set(alert.get('numbers', '').split(','))
        hit_number = latest_numbers[6]

        if hit_number in hot20_nums:
            return {'position': 7, 'number': hit_number}

    elif analysis_type == 'plus_minus6':
        # 加减前6码：需要获取前6码并计算对应组的号码，检查第7位是否命中
        if len(latest_numbers) < 7:
            return None

        # 从detail中提取组号（如"第1组" -> 1）
        import re
        match = re.search(r'第(\d+)组', detail)
        if not match:
            return None

        group_id = int(match.group(1))

        # 获取预警基准期的前6个号码（不是最新期的前6码！）
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT numbers FROM lottery_result
                WHERE lottery_type=%s AND period=%s
            """, (lottery_type, alert['period']))
            alert_row = cursor.fetchone()

            if not alert_row:
                return None

            alert_numbers = alert_row['numbers'].split(',')
            if len(alert_numbers) < 6:
                return None

            base_nums = [int(n) for n in alert_numbers[:6]]

        # 计算该组的号码（前6码±group_id）
        from backend.utils import wrap_in_range
        group_nums = []
        for base_num in base_nums:
            plus_val = wrap_in_range(base_num + group_id, 1, 49)
            minus_val = wrap_in_range(base_num - group_id, 1, 49)
            group_nums.extend([plus_val, minus_val])

        # 检查第7位是否在该组中
        hit_number = int(latest_numbers[6])
        if hit_number in group_nums:
            return {'position': 7, 'number': latest_numbers[6]}

    elif analysis_type in ['plus_range', 'minus_range', 'seventh_range']:
        # 区间分析：需要获取预警期号的第7位作为base，计算区间，检查当前期第7位是否在区间内
        if len(latest_numbers) < 7:
            return None

        # 获取预警期的第7位号码作为base
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT numbers FROM lottery_result
                WHERE lottery_type=%s AND period=%s
            """, (lottery_type, alert['period']))
            alert_row = cursor.fetchone()

            if not alert_row:
                return None

            alert_numbers = alert_row['numbers'].split(',')
            if len(alert_numbers) < 7:
                return None

            base_num = int(alert_numbers[6])

        # 从detail解析区间范围（如"第7位+1~+20" -> "+1~+20"）
        import re
        match = re.search(r'([+-]\d+~[+-]\d+)', detail)
        if not match:
            return None

        range_str = match.group(1)  # 如"+1~+20"或"-1~-20"

        # 解析起始和结束值
        parts = range_str.replace('+', '').split('~')
        if len(parts) != 2:
            return None

        start = int(parts[0])
        end = int(parts[1])

        # 生成区间号码
        from backend.utils import wrap_in_range
        if start > 0:  # 正向区间
            range_nums = [wrap_in_range(base_num + offset, 1, 49)
                        for offset in range(start, end + 1)]
        else:  # 负向区间
            range_nums = [wrap_in_range(base_num + offset, 1, 49)
                        for offset in range(start, end - 1, -1)]

        # 检查当前期第7位是否在区间内
        hit_number = int(latest_numbers[6])
        if hit_number in range_nums:
            return {'position': 7, 'number': latest_numbers[6]}

    elif analysis_type == 'favorite_numbers':
        # 关注号码管理：检查第7位是否在关注号码中
        if len(latest_numbers) < 7:
            return None

        favorite_nums = set(alert.get('numbers', '').split(','))
        hit_number = latest_numbers[6]

        if hit_number in favorite_nums:
            return {'position': 7, 'number': hit_number}

    elif analysis_type == 'each_issue':
        # 每期分析：检查当前期第7位是否在预警期的7个号码中
        if len(latest_numbers) < 7:
            return None

        # 获取预警期的7个号码
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT numbers FROM lottery_result
                WHERE lottery_type=%s AND period=%s
            """, (lottery_type, alert['period']))
            alert_row = cursor.fetchone()

            if not alert_row:
                return None

            alert_numbers = alert_row['numbers'].split(',')

        # 检查当前期第7位是否在预警期的7个号码中
        hit_number = latest_numbers[6]
        if hit_number in alert_numbers:
            return {'position': 7, 'number': hit_number}

    elif analysis_type == 'second_fourxiao':
        # 第N位4肖：检查指定位置的号码对应的肖是否在预警的4个肖中
        import re
        match = re.search(r'第(\d+)位', detail)
        if not match:
            return None

        position = int(match.group(1))
        if len(latest_numbers) < position:
            return None

        # 号码到生肖的映射
        number_to_xiao = {
            '01': '猪', '02': '鼠', '03': '牛', '04': '虎', '05': '兔', '06': '龙',
            '07': '蛇', '08': '马', '09': '羊', '10': '猴', '11': '鸡', '12': '狗',
            '13': '猪', '14': '鼠', '15': '牛', '16': '虎', '17': '兔', '18': '龙',
            '19': '蛇', '20': '马', '21': '羊', '22': '猴', '23': '鸡', '24': '狗',
            '25': '猪', '26': '鼠', '27': '牛', '28': '虎', '29': '兔', '30': '龙',
            '31': '蛇', '32': '马', '33': '羊', '34': '猴', '35': '鸡', '36': '狗',
            '37': '猪', '38': '鼠', '39': '牛', '40': '虎', '41': '兔', '42': '龙',
            '43': '蛇', '44': '马', '45': '羊', '46': '猴', '47': '鸡', '48': '狗', '49': '猪'
        }

        hit_number = latest_numbers[position - 1]
        hit_xiao = number_to_xiao.get(hit_number.zfill(2))

        # 从numbers字段解析4个肖（格式如"猪/鼠/牛/虎"）
        alert_xiaos = alert.get('numbers', '').split('/')

        if hit_xiao and hit_xiao in alert_xiaos:
            return {'position': position, 'number': hit_number}

    elif analysis_type == 'front6_szz':
        # 前6码三中三：检查前6码中是否有至少3个在预警推荐的码中
        if len(latest_numbers) < 6:
            return None

        recommended_nums = set(alert.get('numbers', '').split(','))
        front6 = latest_numbers[:6]
        hit_count = sum(1 for num in front6 if num in recommended_nums)

        if hit_count >= 3:
            # 记录命中的号码
            hit_numbers = [num for num in front6 if num in recommended_nums]
            return {'position': 0, 'number': ','.join(hit_numbers)}  # position=0表示前6码

    elif analysis_type == 'five_period_threexiao':
        # 5期3肖：检查当前期的7个号码对应的肖是否覆盖了预警的3个肖中的至少3个
        number_to_xiao = {
            '01': '猪', '02': '鼠', '03': '牛', '04': '虎', '05': '兔', '06': '龙',
            '07': '蛇', '08': '马', '09': '羊', '10': '猴', '11': '鸡', '12': '狗',
            '13': '猪', '14': '鼠', '15': '牛', '16': '虎', '17': '兔', '18': '龙',
            '19': '蛇', '20': '马', '21': '羊', '22': '猴', '23': '鸡', '24': '狗',
            '25': '猪', '26': '鼠', '27': '牛', '28': '虎', '29': '兔', '30': '龙',
            '31': '蛇', '32': '马', '33': '羊', '34': '猴', '35': '鸡', '36': '狗',
            '37': '猪', '38': '鼠', '39': '牛', '40': '虎', '41': '兔', '42': '龙',
            '43': '蛇', '44': '马', '45': '羊', '46': '猴', '47': '鸡', '48': '狗', '49': '猪'
        }

        # 获取当前期7个号码对应的肖
        current_xiaos = set()
        for num in latest_numbers:
            xiao = number_to_xiao.get(num.zfill(2))
            if xiao:
                current_xiaos.add(xiao)

        # 从numbers字段解析3个肖
        alert_xiaos = set(alert.get('numbers', '').split('/'))

        # 检查当前期的肖是否覆盖了预警的3个肖
        hit_xiaos = alert_xiaos & current_xiaos
        if len(hit_xiaos) >= 3:
            return {'position': 0, 'number': '/'.join(hit_xiaos)}

    elif analysis_type == 'place_results':
        # 关注点登记结果：检查当前期是否命中关注点的号码
        # numbers字段是关注点的号码（逗号分隔）
        place_nums = set(alert.get('numbers', '').split(','))

        # 检查7个号码中是否有命中
        hit_numbers = [num for num in latest_numbers if num in place_nums]

        if hit_numbers:
            return {'position': 0, 'number': ','.join(hit_numbers)}

    # 其他类型暂时不处理，返回None
    return None


@router.get("/api/monitor/hit_records")
def get_monitor_hit_records(
    lottery_type: str = Query('am', description='彩种类型'),
    page: int = Query(1, ge=1, description='页码'),
    page_size: int = Query(20, ge=1, le=100, description='每页条数')
):
    """
    获取监控命中记录

    Args:
        lottery_type: 彩种类型
        page: 页码
        page_size: 每页条数

    Returns:
        监控命中记录列表
    """
    offset = (page - 1) * page_size

    with get_db_cursor() as cursor:
        # 获取总数
        cursor.execute("""
            SELECT COUNT(*) as total
            FROM monitor_hit_records
            WHERE lottery_type = %s
        """, (lottery_type,))
        total = cursor.fetchone()['total']

        # 获取记录
        cursor.execute("""
            SELECT *
            FROM monitor_hit_records
            WHERE lottery_type = %s
            ORDER BY hit_time DESC
            LIMIT %s OFFSET %s
        """, (lottery_type, page_size, offset))
        records = cursor.fetchall()

    return {
        'success': True,
        'lottery_type': lottery_type,
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
        'records': records
    }


@router.get("/api/monitor/hit_stats")
def get_monitor_hit_stats(lottery_type: str = Query('am', description='彩种类型')):
    """
    获取监控命中统计

    Args:
        lottery_type: 彩种类型

    Returns:
        统计信息
    """
    with get_db_cursor() as cursor:
        # 总命中次数
        cursor.execute("""
            SELECT COUNT(*) as total_hits
            FROM monitor_hit_records
            WHERE lottery_type = %s
        """, (lottery_type,))
        total_hits = cursor.fetchone()['total_hits']

        # 按分析类型统计
        cursor.execute("""
            SELECT analysis_type,
                   COUNT(*) as hit_count,
                   AVG(wait_periods) as avg_wait_periods,
                   MIN(wait_periods) as min_wait_periods,
                   MAX(wait_periods) as max_wait_periods
            FROM monitor_hit_records
            WHERE lottery_type = %s
            GROUP BY analysis_type
            ORDER BY hit_count DESC
        """, (lottery_type,))
        by_type = cursor.fetchall()

        # 最近7天的命中次数
        cursor.execute("""
            SELECT DATE(hit_time) as hit_date, COUNT(*) as count
            FROM monitor_hit_records
            WHERE lottery_type = %s
            AND hit_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(hit_time)
            ORDER BY hit_date DESC
        """, (lottery_type,))
        recent_7days = cursor.fetchall()

    return {
        'success': True,
        'lottery_type': lottery_type,
        'total_hits': total_hits,
        'by_analysis_type': by_type,
        'recent_7days': recent_7days
    }
