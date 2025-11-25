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
    'place_results': '关注点登记结果'
}


def check_hot20_omission(lottery_type: str, min_current: int, max_gap: int):
    """检查去10的最热20分析的遗漏情况（只检查第7位）"""
    alerts = []

    with get_db_cursor() as cursor:
        # 获取最新的300期数据
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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

        # 取最新一期检查
        latest = results_asc[-1]
        current = latest.get('current_omission', 0)
        max_miss = latest.get('max_omission', 0)

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
                'priority': 'high' if (max_miss - current) <= 1 else 'medium'
            })

    return alerts


def check_plus_minus6_omission(lottery_type: str, min_current: int, max_gap: int):
    """检查加减前6码分析的遗漏情况"""
    alerts = []

    with get_db_cursor() as cursor:
        # 获取最新的300期数据
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
        rows = cursor.fetchall()

        if len(rows) < 2:
            return alerts

        # 反转成升序（从旧到新）
        all_rows = rows[::-1]

        # 存储每组的遗漏历史
        group_history = {i: {'current_omission': 0, 'max_omission': 0} for i in range(1, 7)}

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

        # 检查每组的最新遗漏情况
        latest_period = all_rows[-2]['period']
        for group_id in range(1, 7):
            current = group_history[group_id]['current_omission']
            max_miss = group_history[group_id]['max_omission']

            if current >= min_current and (max_miss - current) <= max_gap:
                alerts.append({
                    'analysis_type': 'plus_minus6',
                    'detail': f'第{group_id}组',
                    'period': latest_period,
                    'numbers': f'前6码±{group_id}',
                    'current_omission': current,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current,
                    'priority': 'high' if (max_miss - current) <= 1 else 'medium'
                })

    return alerts


def check_range_analysis_omission(lottery_type: str, min_current: int, max_gap: int, is_plus: bool = True):
    """
    检查区间分析的遗漏情况（只检查第7位）
    is_plus: True为+1~+20区间，False为-1~-20区间
    """
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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
                'max_omission': 0
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

        # 检查所有区间的最新遗漏情况
        latest_period = all_rows[-2]['period']
        for range_idx, (start, end, range_name) in enumerate(ranges):
            current = range_history[range_idx]['current_omission']
            max_miss = range_history[range_idx]['max_omission']

            if current >= min_current and (max_miss - current) <= max_gap:
                alerts.append({
                    'analysis_type': analysis_type,
                    'detail': f'第7位{range_name}',
                    'period': latest_period,
                    'numbers': range_name,
                    'current_omission': current,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current,
                    'priority': 'high' if (max_miss - current) <= 1 else 'medium'
                })

    return alerts


def check_favorite_numbers_omission(lottery_type: str, min_current: int, max_gap: int, position: int = 7):
    """检查关注号码管理的遗漏情况"""
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
        cursor.execute("""
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period DESC
            LIMIT 300
        """, (lottery_type,))
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

            # 遍历结束后，如果当前遗漏大于历史最大，更新最大遗漏
            if current_miss > max_miss:
                max_miss = current_miss

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
                    'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
                })

    return alerts


def check_each_issue_omission(lottery_type: str, min_current: int, max_gap: int, position: int = 7):
    """
    检查每期分析的遗漏情况
    使用与"每期分析"页面相同的逻辑：
    - 每期计算 miss_count（从该期往后找，直到后续某期的第7个号码在本期7个号码中出现）
    - current_max_miss: 所有未命中期中的最大 miss_count
    - history_max_miss: 所有已命中期中的最大 miss_count
    """
    alerts = []

    with get_db_cursor() as cursor:
        # 获取最新的300期数据（按期号降序取，然后反转成升序）
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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

    for item in result:
        if item['stop_reason'] == 'hit':
            if item['miss_count'] > history_max_miss:
                history_max_miss = item['miss_count']
                history_max_miss_period = item['period']
        elif item['stop_reason'] == 'end':
            if item['miss_count'] > current_max_miss:
                current_max_miss = item['miss_count']
                current_max_miss_period = item['period']

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
            'priority': 'high' if (history_max_miss - current_max_miss) <= 1 else 'medium'
        })

    return alerts


def check_front6_szz_omission(lottery_type: str, min_current: int, max_gap: int):
    """检查前6码三中三的遗漏情况"""
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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

        # 遍历结束后，如果当前遗漏大于历史最大，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

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
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_seventh_range_omission(lottery_type: str, min_current: int, max_gap: int):
    """检查第7码+1~+20区间的遗漏情况"""
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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
        range_history = {i: {'current_omission': 0, 'max_omission': 0} for i in range(6)}

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

        # 检查所有区间的最新遗漏情况
        latest_period = all_rows[-2]['period']
        for range_idx, (start, end, range_name) in enumerate(ranges):
            current = range_history[range_idx]['current_omission']
            max_miss = range_history[range_idx]['max_omission']

            if current >= min_current and (max_miss - current) <= max_gap:
                alerts.append({
                    'analysis_type': 'seventh_range',
                    'detail': range_name,
                    'period': latest_period,
                    'numbers': range_name,
                    'current_omission': current,
                    'max_omission': max_miss,
                    'gap_from_max': max_miss - current,
                    'priority': 'high' if (max_miss - current) <= 1 else 'medium'
                })

    return alerts


def check_second_fourxiao_omission(lottery_type: str, min_current: int, max_gap: int, position: int = 2):
    """检查第二码4肖分析的遗漏情况"""
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

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
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_five_period_threexiao_omission(lottery_type: str, min_current: int, max_gap: int):
    """检查5期3肖计算的遗漏情况"""
    alerts = []

    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 300
        """
        cursor.execute(sql, [lottery_type])
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

        # 遍历结束后，更新最大遗漏
        if current_miss > max_miss:
            max_miss = current_miss

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
                'priority': 'high' if (max_miss - current_miss) <= 1 else 'medium'
            })

    return alerts


def check_place_results_omission(lottery_type: str, min_current: int, max_gap: int):
    """检查关注点登记结果的遗漏情况"""
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
            cursor.execute("""
                SELECT is_correct, qishu, created_at
                FROM place_results
                WHERE place_id = %s
                ORDER BY created_at ASC
            """, (place_id,))
            records = cursor.fetchall()

            if not records:
                continue

            # 计算当前遗漏和历史最大遗漏
            current_miss = 0
            max_miss = 0
            temp_miss = 0
            latest_qishu = ''

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

            # 最后的连续遗漏就是当前遗漏
            current_miss = temp_miss
            if temp_miss > max_miss:
                max_miss = temp_miss

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
            'second_fourxiao', 'five_period_threexiao', 'place_results'
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
            {'value': 'place_results', 'label': '关注点登记结果', 'description': '关注点登记的命中遗漏统计'}
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
                   min_current_omission, max_gap_from_max,
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
    enabled = config.get('enabled', 1)
    priority_level = config.get('priority_level', 'medium')

    try:
        with get_db_cursor(commit=True) as cursor:
            sql = """
                INSERT INTO monitor_config
                (lottery_type, analysis_type, detail, min_current_omission,
                 max_gap_from_max, enabled, priority_level)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    min_current_omission = VALUES(min_current_omission),
                    max_gap_from_max = VALUES(max_gap_from_max),
                    enabled = VALUES(enabled),
                    priority_level = VALUES(priority_level),
                    updated_at = CURRENT_TIMESTAMP
            """
            cursor.execute(sql, (
                lottery_type, analysis_type, detail,
                min_current_omission, max_gap_from_max,
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
                     max_gap_from_max, enabled, priority_level)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        min_current_omission = VALUES(min_current_omission),
                        max_gap_from_max = VALUES(max_gap_from_max),
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
    lottery_type: str = Query('am', description='彩种类型: am=澳门, hk=香港')
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
            SELECT analysis_type, detail, min_current_omission, max_gap_from_max
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
        if analysis_type == 'hot20':
            raw_alerts.extend(check_hot20_omission(lottery_type, 0, 999))

        elif analysis_type == 'plus_minus6':
            raw_alerts.extend(check_plus_minus6_omission(lottery_type, 0, 999))

        elif analysis_type == 'plus_range':
            raw_alerts.extend(check_range_analysis_omission(lottery_type, 0, 999, is_plus=True))

        elif analysis_type == 'minus_range':
            raw_alerts.extend(check_range_analysis_omission(lottery_type, 0, 999, is_plus=False))

        elif analysis_type == 'favorite_numbers':
            raw_alerts.extend(check_favorite_numbers_omission(lottery_type, 0, 999))

        elif analysis_type == 'each_issue':
            raw_alerts.extend(check_each_issue_omission(lottery_type, 0, 999))

        elif analysis_type == 'front6_szz':
            raw_alerts.extend(check_front6_szz_omission(lottery_type, 0, 999))

        elif analysis_type == 'seventh_range':
            raw_alerts.extend(check_seventh_range_omission(lottery_type, 0, 999))

        elif analysis_type == 'second_fourxiao':
            # 为每个配置的位置分别检查
            type_configs = config_map.get('second_fourxiao', [])
            for cfg in type_configs:
                detail = cfg.get('detail', '第2位')
                # 从detail中提取位置号 (如 "第1位" -> 1)
                try:
                    position = int(detail.replace('第', '').replace('位', ''))
                    raw_alerts.extend(check_second_fourxiao_omission(lottery_type, 0, 999, position=position))
                except:
                    # 如果解析失败,使用默认位置2
                    raw_alerts.extend(check_second_fourxiao_omission(lottery_type, 0, 999, position=2))

        elif analysis_type == 'five_period_threexiao':
            raw_alerts.extend(check_five_period_threexiao_omission(lottery_type, 0, 999))

        elif analysis_type == 'place_results':
            raw_alerts.extend(check_place_results_omission(lottery_type, 0, 999))

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
