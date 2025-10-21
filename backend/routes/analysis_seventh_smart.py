"""
第7个号码智能推荐20码分析模块

基于pattern-master-analyst的深度分析结果，实现智能推荐算法

核心逻辑：
1. 每一期基于该期往前100期的历史数据独立计算Top20
2. 推荐数据保存到数据库表 seventh_smart20_history
3. API从数据库读取历史推荐数据
"""

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from collections import Counter, defaultdict
from typing import Optional
import json
from datetime import datetime

try:
    from backend import collect
    from backend.utils import get_db_cursor, create_csv_response
except ImportError:
    import collect
    from utils import get_db_cursor, create_csv_response

router = APIRouter()

@router.get("/api/seventh_smart_recommend20")
def get_seventh_smart_recommend20(
    lottery_type: str = Query('am'),
    export: str | None = Query(None),
    show_details: bool = Query(False)
):
    """
    第7个号码智能推荐20码分析

    基于多维度分析：
    1. 频率分析（权重30%）
    2. 遗漏分析（权重25%）
    3. 趋势分析（权重25%）
    4. 连号分析（权重10%）- 仅香港彩
    5. 稳定性分析（权重10%）

    返回综合评分最高的20个号码

    参数:
    - show_details: 是否显示每期详细记录（默认False，仅显示Top20）
    """
    try:
        with get_db_cursor() as cursor:
            # 获取最近100期的第7个号码数据
            sql = """
            SELECT
                period,
                CAST(SUBSTRING_INDEX(numbers, ',', -1) AS UNSIGNED) as seventh_number,
                open_time
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period DESC
            LIMIT 100
            """
            cursor.execute(sql, (lottery_type,))
            records = cursor.fetchall()

            if not records or len(records) < 30:
                return {"success": False, "message": "数据不足，至少需要30期数据"}

            # 提取第7个号码列表（按时间从旧到新）
            seventh_numbers = [rec['seventh_number'] for rec in reversed(records)]
            periods = [rec['period'] for rec in reversed(records)]

        # 统计分析
        total_periods = len(seventh_numbers)
        recent_30 = seventh_numbers[-30:]  # 最近30期

        # 1. 频率分析
        overall_freq = Counter(seventh_numbers)
        recent_freq = Counter(recent_30)

        # 2. 遗漏分析
        miss_stats = calculate_miss_stats(seventh_numbers)

        # 3. 趋势分析
        trend_scores = calculate_trend_scores(overall_freq, recent_freq, total_periods)

        # 4. 连号分析（仅香港彩）
        consecutive_scores = {}
        if lottery_type == 'hk':
            consecutive_scores = calculate_consecutive_scores(seventh_numbers)

        # 5. 综合评分
        scores = {}
        for num in range(1, 50):
            # 频率分 (30%)
            freq_score = (overall_freq.get(num, 0) / total_periods) * 100 * 0.3

            # 遗漏分 (25%)
            miss_info = miss_stats.get(num, {})
            current_miss = miss_info.get('current_miss', 0)
            max_miss = miss_info.get('max_miss', 1)
            avg_miss = miss_info.get('avg_miss', 1)

            # 遗漏评分：当前遗漏接近平均遗漏时得分最高
            if avg_miss > 0:
                miss_ratio = current_miss / avg_miss
                if 0.5 <= miss_ratio <= 1.5:
                    miss_score = 100 * 0.25
                elif miss_ratio < 0.5:
                    miss_score = (1 - (0.5 - miss_ratio)) * 100 * 0.25
                else:
                    miss_score = (1 / (miss_ratio - 0.5)) * 100 * 0.25
            else:
                miss_score = 0

            # 趋势分 (25%)
            trend_score = trend_scores.get(num, 0) * 0.25

            # 连号分 (10%) - 仅香港彩
            consecutive_score = consecutive_scores.get(num, 0) * 0.1 if lottery_type == 'hk' else 0

            # 稳定性分 (10%) - 出现次数在合理范围内
            appearance_count = overall_freq.get(num, 0)
            expected = total_periods / 49
            stability_ratio = appearance_count / expected if expected > 0 else 0
            if 0.5 <= stability_ratio <= 2.0:
                stability_score = 100 * 0.1
            else:
                stability_score = max(0, (1 - abs(stability_ratio - 1)) * 100 * 0.1)

            # 总分
            total_score = freq_score + miss_score + trend_score + consecutive_score + stability_score

            scores[num] = {
                'number': num,
                'total_score': round(total_score, 2),
                'frequency': overall_freq.get(num, 0),
                'frequency_rate': round((overall_freq.get(num, 0) / total_periods) * 100, 2),
                'recent_frequency': recent_freq.get(num, 0),
                'recent_rate': round((recent_freq.get(num, 0) / 30) * 100, 2),
                'current_miss': current_miss,
                'avg_miss': round(avg_miss, 1),
                'max_miss': max_miss,
                'trend': get_trend_label(trend_scores.get(num, 0)),
                'is_hot': recent_freq.get(num, 0) >= 3,
                'is_cold': current_miss > avg_miss * 1.5,
                'consecutive_bonus': consecutive_scores.get(num, 0) if lottery_type == 'hk' else 0
            }

        # 排序获取Top20
        sorted_numbers = sorted(scores.values(), key=lambda x: x['total_score'], reverse=True)
        top20 = sorted_numbers[:20]

        # 添加推荐理由
        for item in top20:
            reasons = []
            if item['is_hot']:
                reasons.append("近期高频")
            if item['trend'] == "强烈上升":
                reasons.append("趋势强劲")
            elif item['trend'] == "上升":
                reasons.append("趋势向好")
            if 0.5 <= item['current_miss'] / max(item['avg_miss'], 1) <= 1.5:
                reasons.append("遗漏适中")
            if item['consecutive_bonus'] > 50 and lottery_type == 'hk':
                reasons.append("连号优势")
            if not reasons:
                reasons.append("综合评分高")
            item['reason'] = "+".join(reasons)

        # 分析摘要
        hot_numbers = [num for num in range(1, 50) if recent_freq.get(num, 0) >= 3]
        cold_numbers = [num for num in range(1, 50) if miss_stats.get(num, {}).get('current_miss', 0) > miss_stats.get(num, {}).get('avg_miss', 0) * 1.5]
        due_numbers = [num for num in range(1, 50) if 0.8 <= miss_stats.get(num, {}).get('current_miss', 0) / max(miss_stats.get(num, {}).get('avg_miss', 1), 1) <= 1.2]

        analysis_summary = {
            'hot_numbers': hot_numbers[:10],
            'cold_numbers': cold_numbers[:10],
            'due_numbers': due_numbers[:10],
            'total_analyzed_periods': total_periods,
            'analysis_period_range': f"{periods[0]}-{periods[-1]}"
        }

        # 从数据库读取历史推荐数据
        period_details = []
        if show_details:
            with get_db_cursor() as cursor:
                cursor.execute("""
                    SELECT
                        period,
                        recommend_numbers,
                        recommend_details,
                        next_period,
                        next_seventh,
                        is_hit,
                        hit_number,
                        confidence_level
                    FROM seventh_smart20_history
                    WHERE lottery_type = %s
                    ORDER BY period DESC
                    LIMIT 200
                """, (lottery_type,))

                history_records = cursor.fetchall()

                if not history_records:
                    # 如果没有历史数据，提示用户先生成
                    return {
                        "success": False,
                        "message": "暂无历史推荐数据，请先调用 POST /api/seventh_smart_generate_history 生成历史数据"
                    }

            # 转换数据格式
            for rec in history_records:
                recommend_numbers = list(map(int, rec['recommend_numbers'].split(',')))

                period_details.append({
                    'current_period': rec['period'],
                    'recommend_numbers': recommend_numbers,
                    'next_period': rec['next_period'],
                    'next_seventh': rec['next_seventh'],
                    'is_hit': rec['is_hit'],
                    'hit_number': rec['hit_number'],
                    'confidence_level': rec['confidence_level']
                })

            # 计算遗漏统计（从旧到新遍历，因为period_details是倒序的）
            # 先反转数组，从最旧期开始计算
            reversed_details = list(reversed(period_details))

            current_miss = 0
            history_max_miss = 0

            for detail in reversed_details:
                if detail['is_hit']:
                    # 命中时，更新历史最大遗漏
                    if current_miss > history_max_miss:
                        history_max_miss = current_miss
                    # 重置当前遗漏
                    current_miss = 0
                else:
                    # 未命中时，当前遗漏+1
                    current_miss += 1

                detail['current_miss'] = current_miss
                detail['history_max_miss'] = history_max_miss

            # 反转回来，保持最新期在前
            period_details = list(reversed(reversed_details))

        # CSV导出
        if export == 'csv':
            headers = [
                '排名', '号码', '综合评分', '总频率', '总频率%', '近30期频率', '近30期%',
                '当前遗漏', '平均遗漏', '最大遗漏', '趋势', '是否热号', '推荐理由'
            ]
            rows = []
            for idx, item in enumerate(top20, 1):
                rows.append([
                    idx,
                    item['number'],
                    item['total_score'],
                    item['frequency'],
                    item['frequency_rate'],
                    item['recent_frequency'],
                    item['recent_rate'],
                    item['current_miss'],
                    item['avg_miss'],
                    item['max_miss'],
                    item['trend'],
                    '是' if item['is_hot'] else '否',
                    item['reason']
                ])

            filename = f"seventh_smart20_{lottery_type}_{datetime.now().strftime('%Y%m%d')}.csv"
            return create_csv_response(headers, rows, filename)

        # 计算逐期命中率
        hit_stats = {}
        if show_details and period_details:
            total_records = len(period_details)
            hit_count = sum(1 for d in period_details if d['is_hit'])
            hit_rate = round((hit_count / total_records * 100), 2) if total_records > 0 else 0

            hit_stats = {
                'total_records': total_records,
                'hit_count': hit_count,
                'hit_rate': hit_rate,
                'final_current_miss': period_details[0]['current_miss'] if period_details else 0,
                'final_history_max_miss': period_details[0]['history_max_miss'] if period_details else 0
            }

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'recommend_top20': top20,
                'analysis_summary': analysis_summary,
                'confidence_level': calculate_confidence_level(top20),
                'period_details': period_details if show_details else [],
                'hit_stats': hit_stats if show_details else {},
                'algorithm_version': '1.0',
                'generated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
        }

    except Exception as e:
        print(f"第7个号码智能推荐20码失败: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"分析失败: {str(e)}"}


def calculate_miss_stats(numbers):
    """
    计算遗漏统计
    返回每个号码的当前遗漏、平均遗漏、最大遗漏
    """
    stats = {}
    last_appearance = {}
    miss_history = defaultdict(list)

    for idx, num in enumerate(numbers):
        # 更新其他号码的遗漏
        for n in range(1, 50):
            if n != num:
                if n in last_appearance:
                    miss_history[n].append(idx - last_appearance[n] - 1)

        # 记录当前号码出现
        last_appearance[num] = idx

    # 计算统计值
    total_periods = len(numbers)
    for num in range(1, 50):
        if num in last_appearance:
            current_miss = total_periods - last_appearance[num] - 1
            misses = miss_history.get(num, [])
            avg_miss = sum(misses) / len(misses) if misses else 0
            max_miss = max(misses) if misses else current_miss
        else:
            current_miss = total_periods
            avg_miss = total_periods
            max_miss = total_periods

        stats[num] = {
            'current_miss': current_miss,
            'avg_miss': avg_miss,
            'max_miss': max_miss
        }

    return stats


def calculate_trend_scores(overall_freq, recent_freq, total_periods):
    """
    计算趋势评分
    对比整体频率和近期频率，判断上升/下降趋势
    """
    scores = {}
    recent_total = sum(recent_freq.values())

    for num in range(1, 50):
        overall_rate = overall_freq.get(num, 0) / total_periods
        recent_rate = recent_freq.get(num, 0) / recent_total

        # 趋势强度 = (近期频率 - 整体频率) / 整体频率
        if overall_rate > 0:
            trend_strength = (recent_rate - overall_rate) / overall_rate
            # 映射到0-100分
            score = 50 + min(50, max(-50, trend_strength * 100))
        else:
            # 从未出现过的号码，如果近期出现则给高分
            score = 100 if recent_freq.get(num, 0) > 0 else 0

        scores[num] = score

    return scores


def calculate_consecutive_scores(numbers):
    """
    计算连号评分（仅香港彩）
    如果上一期的号码是N，则N-1和N+1的评分提高
    """
    scores = {n: 0 for n in range(1, 50)}

    if len(numbers) < 2:
        return scores

    last_number = numbers[-1]

    # 上期号码的±1号码得高分
    if 1 < last_number < 49:
        scores[last_number - 1] = 100
        scores[last_number + 1] = 100
    elif last_number == 1:
        scores[2] = 100
    elif last_number == 49:
        scores[48] = 100

    return scores


def get_trend_label(score):
    """获取趋势标签"""
    if score >= 80:
        return "强烈上升"
    elif score >= 60:
        return "上升"
    elif score >= 40:
        return "平稳"
    elif score >= 20:
        return "下降"
    else:
        return "强烈下降"


def calculate_confidence_level(top20):
    """
    计算置信度
    基于Top20的评分分布
    """
    if not top20:
        return "低"

    top5_avg = sum(item['total_score'] for item in top20[:5]) / 5
    top20_avg = sum(item['total_score'] for item in top20) / 20

    # Top5平均分比Top20平均分高很多，说明梯度明显，置信度高
    if top5_avg > top20_avg * 1.3:
        return "高"
    elif top5_avg > top20_avg * 1.1:
        return "中"
    else:
        return "低"


def calculate_period_top20(seventh_numbers, lottery_type):
    """
    基于给定的历史数据计算该期的Top20推荐号码

    参数:
    - seventh_numbers: 历史第7个号码列表（从旧到新）
    - lottery_type: 彩种类型（'am' 或 'hk'）

    返回:
    - Top20推荐号码列表（包含评分等详细信息）
    """
    total_periods = len(seventh_numbers)
    recent_30 = seventh_numbers[-30:] if len(seventh_numbers) >= 30 else seventh_numbers

    # 1. 频率分析
    overall_freq = Counter(seventh_numbers)
    recent_freq = Counter(recent_30)

    # 2. 遗漏分析
    miss_stats = calculate_miss_stats(seventh_numbers)

    # 3. 趋势分析
    trend_scores = calculate_trend_scores(overall_freq, recent_freq, total_periods)

    # 4. 连号分析（仅香港彩）
    consecutive_scores = {}
    if lottery_type == 'hk':
        consecutive_scores = calculate_consecutive_scores(seventh_numbers)

    # 5. 综合评分
    scores = {}
    for num in range(1, 50):
        # 频率分 (30%)
        freq_score = (overall_freq.get(num, 0) / total_periods) * 100 * 0.3

        # 遗漏分 (25%)
        miss_info = miss_stats.get(num, {})
        current_miss = miss_info.get('current_miss', 0)
        max_miss = miss_info.get('max_miss', 1)
        avg_miss = miss_info.get('avg_miss', 1)

        # 遗漏评分：当前遗漏接近平均遗漏时得分最高
        if avg_miss > 0:
            miss_ratio = current_miss / avg_miss
            if 0.5 <= miss_ratio <= 1.5:
                miss_score = 100 * 0.25
            elif miss_ratio < 0.5:
                miss_score = (1 - (0.5 - miss_ratio)) * 100 * 0.25
            else:
                miss_score = (1 / (miss_ratio - 0.5)) * 100 * 0.25
        else:
            miss_score = 0

        # 趋势分 (25%)
        trend_score = trend_scores.get(num, 0) * 0.25

        # 连号分 (10%) - 仅香港彩
        consecutive_score = consecutive_scores.get(num, 0) * 0.1 if lottery_type == 'hk' else 0

        # 稳定性分 (10%) - 出现次数在合理范围内
        appearance_count = overall_freq.get(num, 0)
        expected = total_periods / 49
        stability_ratio = appearance_count / expected if expected > 0 else 0
        if 0.5 <= stability_ratio <= 2.0:
            stability_score = 100 * 0.1
        else:
            stability_score = max(0, (1 - abs(stability_ratio - 1)) * 100 * 0.1)

        # 总分
        total_score = freq_score + miss_score + trend_score + consecutive_score + stability_score

        scores[num] = {
            'number': num,
            'total_score': round(total_score, 2),
            'frequency': overall_freq.get(num, 0),
            'frequency_rate': round((overall_freq.get(num, 0) / total_periods) * 100, 2),
            'recent_frequency': recent_freq.get(num, 0),
            'recent_rate': round((recent_freq.get(num, 0) / len(recent_30)) * 100, 2) if recent_30 else 0,
            'current_miss': current_miss,
            'avg_miss': round(avg_miss, 1),
            'max_miss': max_miss,
            'trend': get_trend_label(trend_scores.get(num, 0)),
            'is_hot': recent_freq.get(num, 0) >= 3,
            'is_cold': current_miss > avg_miss * 1.5,
            'consecutive_bonus': consecutive_scores.get(num, 0) if lottery_type == 'hk' else 0
        }

    # 排序获取Top20
    sorted_numbers = sorted(scores.values(), key=lambda x: x['total_score'], reverse=True)
    top20 = sorted_numbers[:20]

    # 添加推荐理由
    for item in top20:
        reasons = []
        if item['is_hot']:
            reasons.append("近期高频")
        if item['trend'] == "强烈上升":
            reasons.append("趋势强劲")
        elif item['trend'] == "上升":
            reasons.append("趋势向好")
        if 0.5 <= item['current_miss'] / max(item['avg_miss'], 1) <= 1.5:
            reasons.append("遗漏适中")
        if item['consecutive_bonus'] > 50 and lottery_type == 'hk':
            reasons.append("连号优势")
        if not reasons:
            reasons.append("综合评分高")
        item['reason'] = "+".join(reasons)

    return top20


def _generate_seventh_smart_history_internal(lottery_type: str):
    """
    内部函数：批量生成历史推荐数据

    遍历每一期开奖数据，基于该期往前100期的历史独立计算Top20并保存到数据库
    """
    try:
        with get_db_cursor(commit=True) as cursor:
            # 获取所有历史数据
            sql = """
            SELECT
                period,
                CAST(SUBSTRING_INDEX(numbers, ',', -1) AS UNSIGNED) as seventh_number,
                open_time
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period ASC
            """
            cursor.execute(sql, (lottery_type,))
            all_records = cursor.fetchall()

            if len(all_records) < 100:
                return {"success": False, "message": f"数据不足，至少需要100期数据，当前只有{len(all_records)}期"}

            generated_count = 0
            skipped_count = 0
            updated_count = 0

            # 从第100期开始，每期基于往前100期计算Top20
            for idx in range(100, len(all_records)):
                current_period = all_records[idx]['period']

                # 检查是否已存在
                cursor.execute("""
                    SELECT COUNT(*) as cnt FROM seventh_smart20_history
                    WHERE period = %s AND lottery_type = %s
                """, (current_period, lottery_type))
                exists = cursor.fetchone()['cnt'] > 0

                if exists:
                    skipped_count += 1
                    # 虽然当前期已存在，但仍需检查并更新上一期的next_period信息
                    if idx > 100:  # 确保上一期存在
                        prev_period = all_records[idx - 1]['period']
                        current_seventh = all_records[idx]['seventh_number']

                        # 检查上一期是否已有next_period数据
                        cursor.execute("""
                            SELECT recommend_numbers, next_period FROM seventh_smart20_history
                            WHERE period = %s AND lottery_type = %s
                        """, (prev_period, lottery_type))
                        prev_record = cursor.fetchone()

                        # 如果上一期存在且没有next_period数据，则更新
                        if prev_record and not prev_record['next_period']:
                            prev_top20_numbers = list(map(int, prev_record['recommend_numbers'].split(',')))
                            prev_is_hit = current_seventh in prev_top20_numbers
                            prev_hit_number = current_seventh if prev_is_hit else None

                            cursor.execute("""
                                UPDATE seventh_smart20_history
                                SET next_period = %s, next_seventh = %s, is_hit = %s, hit_number = %s
                                WHERE period = %s AND lottery_type = %s
                            """, (current_period, current_seventh, prev_is_hit, prev_hit_number, prev_period, lottery_type))
                            updated_count += 1

                    continue

                # 获取往前100期数据（不包括当前期）
                historical_data = [all_records[i]['seventh_number'] for i in range(idx - 100, idx)]

                # 计算Top20
                top20 = calculate_period_top20(historical_data, lottery_type)
                top20_numbers = [item['number'] for item in top20]

                # 获取下一期信息（如果存在）
                next_period = None
                next_seventh = None
                is_hit = None
                hit_number = None

                if idx + 1 < len(all_records):
                    next_period = all_records[idx + 1]['period']
                    next_seventh = all_records[idx + 1]['seventh_number']
                    is_hit = next_seventh in top20_numbers
                    hit_number = next_seventh if is_hit else None

                # 计算置信度
                confidence = calculate_confidence_level(top20)

                # 保存到数据库
                cursor.execute("""
                    INSERT INTO seventh_smart20_history
                    (period, lottery_type, recommend_numbers, recommend_details,
                     next_period, next_seventh, is_hit, hit_number, confidence_level, analysis_periods)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    current_period,
                    lottery_type,
                    ','.join(map(str, top20_numbers)),
                    json.dumps(top20, ensure_ascii=False),
                    next_period,
                    next_seventh,
                    is_hit,
                    hit_number,
                    confidence,
                    100
                ))

                generated_count += 1

                # 同时更新上一期的next_period信息（如果上一期存在）
                if idx > 100:  # 确保上一期存在
                    prev_period = all_records[idx - 1]['period']
                    current_seventh = all_records[idx]['seventh_number']

                    # 获取上一期的推荐号码
                    cursor.execute("""
                        SELECT recommend_numbers FROM seventh_smart20_history
                        WHERE period = %s AND lottery_type = %s
                    """, (prev_period, lottery_type))
                    prev_record = cursor.fetchone()

                    if prev_record:
                        prev_top20_numbers = list(map(int, prev_record['recommend_numbers'].split(',')))
                        prev_is_hit = current_seventh in prev_top20_numbers
                        prev_hit_number = current_seventh if prev_is_hit else None

                        cursor.execute("""
                            UPDATE seventh_smart20_history
                            SET next_period = %s, next_seventh = %s, is_hit = %s, hit_number = %s
                            WHERE period = %s AND lottery_type = %s
                        """, (current_period, current_seventh, prev_is_hit, prev_hit_number, prev_period, lottery_type))
                        updated_count += 1

        return {
            "success": True,
            "message": f"成功生成 {generated_count} 期推荐数据，更新 {updated_count} 期历史数据，跳过 {skipped_count} 期已存在数据",
            "generated_count": generated_count,
            "updated_count": updated_count,
            "skipped_count": skipped_count,
            "total_periods": len(all_records)
        }

    except Exception as e:
        print(f"生成历史推荐数据失败: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "message": f"生成失败: {str(e)}"}

@router.post("/api/seventh_smart_generate_history")
def generate_seventh_smart_history(lottery_type: str = Query('am')):
    """
    批量生成历史推荐数据

    遍历每一期开奖数据，基于该期往前100期的历史独立计算Top20并保存到数据库
    """
    return _generate_seventh_smart_history_internal(lottery_type)
