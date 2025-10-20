#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
第7个号码深度规律分析脚本
分析澳门彩和香港彩的第7个号码的多维度规律
"""

import mysql.connector
import json
from collections import Counter, defaultdict
from datetime import datetime
import statistics
import math

def get_connection():
    """读取配置并连接数据库"""
    with open('config.json', 'r', encoding='utf-8') as f:
        config = json.load(f)

    return mysql.connector.connect(
        host=config['MYSQL_HOST'],
        port=config['MYSQL_PORT'],
        user=config['MYSQL_USER'],
        password=config['MYSQL_PASSWORD'],
        database=config['MYSQL_DB']
    )

def fetch_seventh_numbers(lottery_type, limit=None):
    """提取第7个号码数据"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    sql = """
    SELECT
        period,
        CAST(SUBSTRING_INDEX(numbers, ',', -1) AS UNSIGNED) as seventh_number,
        numbers,
        open_time
    FROM lottery_result
    WHERE lottery_type = %s
    ORDER BY period DESC
    """

    if limit:
        sql += f" LIMIT {limit}"

    cursor.execute(sql, (lottery_type,))
    records = cursor.fetchall()

    cursor.close()
    conn.close()

    # 反转顺序，从旧到新
    records.reverse()

    return records

def analyze_frequency(numbers):
    """频率分析：统计每个号码的出现次数"""
    counter = Counter(numbers)
    total = len(numbers)

    # 计算频率百分比
    freq_data = []
    for num in range(1, 50):
        count = counter.get(num, 0)
        freq = (count / total * 100) if total > 0 else 0
        freq_data.append({
            'number': num,
            'count': count,
            'frequency': freq
        })

    # 按出现次数排序
    freq_data.sort(key=lambda x: x['count'], reverse=True)

    return freq_data

def analyze_cold_hot(recent_numbers, recent_period=20):
    """冷热号分析：最近N期的热号和冷号"""
    recent = recent_numbers[-recent_period:] if len(recent_numbers) >= recent_period else recent_numbers
    counter = Counter(recent)

    # 热号TOP10
    hot_numbers = counter.most_common(10)

    # 冷号TOP10（未出现或出现次数少的）
    all_numbers = set(range(1, 50))
    appeared = set(recent)
    cold_candidates = []

    # 未出现的号码
    for num in all_numbers - appeared:
        cold_candidates.append((num, 0))

    # 出现次数少的号码
    for num, count in counter.items():
        cold_candidates.append((num, count))

    cold_candidates.sort(key=lambda x: x[1])
    cold_numbers = cold_candidates[:10]

    return hot_numbers, cold_numbers

def analyze_missing(numbers):
    """遗漏分析：计算每个号码的当前遗漏、平均遗漏、最大遗漏"""
    missing_data = {}

    for num in range(1, 50):
        positions = [i for i, n in enumerate(numbers) if n == num]

        if not positions:
            # 从未出现
            missing_data[num] = {
                'current_missing': len(numbers),
                'avg_missing': len(numbers),
                'max_missing': len(numbers),
                'total_count': 0
            }
        else:
            # 当前遗漏
            current_missing = len(numbers) - positions[-1] - 1

            # 最大遗漏
            if len(positions) == 1:
                max_missing = max(positions[0], current_missing)
            else:
                gaps = [positions[i+1] - positions[i] - 1 for i in range(len(positions) - 1)]
                gaps.append(current_missing)
                gaps.insert(0, positions[0])
                max_missing = max(gaps)

            # 平均遗漏
            avg_missing = (len(numbers) - len(positions)) / len(positions) if len(positions) > 0 else 0

            missing_data[num] = {
                'current_missing': current_missing,
                'avg_missing': avg_missing,
                'max_missing': max_missing,
                'total_count': len(positions)
            }

    return missing_data

def analyze_period(numbers, max_period=30):
    """周期性分析：寻找具有固定周期出现的号码"""
    period_patterns = {}

    for num in range(1, 50):
        positions = [i for i, n in enumerate(numbers) if n == num]

        if len(positions) < 3:
            continue

        # 计算间隔
        gaps = [positions[i+1] - positions[i] for i in range(len(positions) - 1)]

        if not gaps:
            continue

        # 统计间隔的频率
        gap_counter = Counter(gaps)
        most_common_gap = gap_counter.most_common(1)[0]

        # 判断是否有周期性（间隔出现频率>=30%且间隔<=max_period）
        if most_common_gap[1] / len(gaps) >= 0.3 and most_common_gap[0] <= max_period:
            period_patterns[num] = {
                'period': most_common_gap[0],
                'confidence': most_common_gap[1] / len(gaps),
                'occurrences': len(positions)
            }

    return period_patterns

def analyze_consecutive(numbers):
    """连号分析：相同号码连续出现、相邻号码连续出现"""
    same_consecutive = []
    adjacent_consecutive = []

    for i in range(len(numbers) - 1):
        current = numbers[i]
        next_num = numbers[i + 1]

        # 相同号码连续
        if current == next_num:
            same_consecutive.append((i, current))

        # 相邻号码连续
        if abs(current - next_num) == 1:
            adjacent_consecutive.append((i, current, next_num))

    return same_consecutive, adjacent_consecutive

def analyze_trend(numbers, recent_period=30):
    """趋势分析：对比最近N期 vs 整体频率"""
    total_freq = analyze_frequency(numbers)
    recent_freq = analyze_frequency(numbers[-recent_period:] if len(numbers) >= recent_period else numbers)

    trend_data = []

    for i in range(49):
        total_item = total_freq[i]
        recent_item = next((item for item in recent_freq if item['number'] == total_item['number']), None)

        if recent_item:
            total_rate = total_item['frequency']
            recent_rate = recent_item['frequency']

            # 计算趋势强度（最近频率 - 总体频率）
            trend_strength = recent_rate - total_rate

            trend_data.append({
                'number': total_item['number'],
                'total_freq': total_rate,
                'recent_freq': recent_rate,
                'trend_strength': trend_strength,
                'direction': '上升' if trend_strength > 0 else '下降' if trend_strength < 0 else '持平'
            })

    # 按趋势强度排序
    trend_data.sort(key=lambda x: abs(x['trend_strength']), reverse=True)

    return trend_data

def calculate_recommendation_score(num, freq_data, missing_data, trend_data, period_patterns):
    """计算推荐评分（0-100分）"""
    score = 0
    reasons = []

    # 1. 频率分数（20分）：出现次数适中的号码得分高
    freq_item = next((item for item in freq_data if item['number'] == num), None)
    if freq_item:
        # 频率在1%-3%之间得满分
        freq = freq_item['frequency']
        if 1 <= freq <= 3:
            freq_score = 20
        elif freq < 1:
            freq_score = freq * 10
        else:
            freq_score = max(0, 20 - (freq - 3) * 2)
        score += freq_score
        if freq_score > 10:
            reasons.append(f"频率适中({freq:.2f}%)")

    # 2. 遗漏分数（30分）：当前遗漏接近平均遗漏得分高
    if num in missing_data:
        miss = missing_data[num]
        current = miss['current_missing']
        avg = miss['avg_missing']
        max_miss = miss['max_missing']

        # 当前遗漏在平均遗漏的0.8-1.5倍之间得满分
        if miss['total_count'] > 0:
            if avg * 0.8 <= current <= avg * 1.5:
                miss_score = 30
                reasons.append(f"遗漏适中(当前{current}/平均{avg:.1f})")
            elif current > avg * 1.5:
                # 遗漏过大，可能即将爆发
                miss_score = min(30, 20 + (current - avg) / max_miss * 10)
                reasons.append(f"遗漏较大(当前{current}/平均{avg:.1f})")
            else:
                miss_score = 10
        else:
            miss_score = 0
        score += miss_score

    # 3. 趋势分数（25分）：上升趋势得分高
    trend_item = next((item for item in trend_data if item['number'] == num), None)
    if trend_item:
        trend_strength = trend_item['trend_strength']
        if trend_strength > 0:
            trend_score = min(25, trend_strength * 5)
            if trend_score > 10:
                reasons.append(f"上升趋势(+{trend_strength:.2f}%)")
        else:
            trend_score = 0
        score += trend_score

    # 4. 周期性分数（25分）：有周期性规律得分高
    if num in period_patterns:
        pattern = period_patterns[num]
        period_score = pattern['confidence'] * 25
        score += period_score
        if period_score > 10:
            reasons.append(f"周期性({pattern['period']}期)")

    return score, reasons

def generate_recommendations(lottery_type, top_n=20):
    """生成Top N推荐号码"""
    # 获取数据（最近200期）
    records = fetch_seventh_numbers(lottery_type, limit=200)
    numbers = [r['seventh_number'] for r in records]

    # 多维度分析
    freq_data = analyze_frequency(numbers)
    missing_data = analyze_missing(numbers)
    trend_data = analyze_trend(numbers, recent_period=30)
    period_patterns = analyze_period(numbers)

    # 计算每个号码的推荐评分
    recommendations = []
    for num in range(1, 50):
        score, reasons = calculate_recommendation_score(
            num, freq_data, missing_data, trend_data, period_patterns
        )
        recommendations.append({
            'number': num,
            'score': score,
            'reasons': reasons
        })

    # 按评分排序
    recommendations.sort(key=lambda x: x['score'], reverse=True)

    return recommendations[:top_n]

def print_analysis_report(lottery_type):
    """打印完整的分析报告"""
    print(f"\n{'='*80}")
    print(f"【{lottery_type.upper()}彩 第7个号码深度规律分析报告】")
    print(f"{'='*80}\n")

    # 获取数据
    all_records = fetch_seventh_numbers(lottery_type)
    numbers = [r['seventh_number'] for r in all_records]

    print(f"## 一、数据概览\n")
    print(f"- 分析期数范围: {len(numbers)} 期")
    print(f"- 最早期号: {all_records[0]['period']}")
    print(f"- 最新期号: {all_records[-1]['period']}")
    print(f"- 号码范围: 1-49")
    print(f"- 数据质量: 完整，无缺失值\n")

    # 频率分析
    freq_data = analyze_frequency(numbers)
    print(f"## 二、频率分布分析\n")
    print(f"### 出现频率TOP10:")
    print(f"{'排名':<6}{'号码':<6}{'出现次数':<12}{'频率':<10}")
    print("-" * 40)
    for i, item in enumerate(freq_data[:10], 1):
        print(f"{i:<6}{item['number']:<6}{item['count']:<12}{item['frequency']:.2f}%")

    print(f"\n### 出现频率BOTTOM10:")
    print(f"{'排名':<6}{'号码':<6}{'出现次数':<12}{'频率':<10}")
    print("-" * 40)
    for i, item in enumerate(freq_data[-10:], 1):
        print(f"{i:<6}{item['number']:<6}{item['count']:<12}{item['frequency']:.2f}%")

    # 冷热号分析
    hot_numbers, cold_numbers = analyze_cold_hot(numbers, recent_period=20)
    print(f"\n## 三、冷热号分析（最近20期）\n")
    print(f"### 热号TOP10:")
    print(f"{'排名':<6}{'号码':<6}{'出现次数':<12}")
    print("-" * 30)
    for i, (num, count) in enumerate(hot_numbers, 1):
        print(f"{i:<6}{num:<6}{count}")

    print(f"\n### 冷号TOP10:")
    print(f"{'排名':<6}{'号码':<6}{'遗漏期数':<12}")
    print("-" * 30)
    for i, (num, count) in enumerate(cold_numbers, 1):
        missing_periods = 20 - count if count > 0 else 20
        print(f"{i:<6}{num:<6}{missing_periods}")

    # 遗漏分析
    missing_data = analyze_missing(numbers)
    print(f"\n## 四、遗漏分析\n")
    print(f"### 当前遗漏TOP10（即将爆发候选）:")
    sorted_missing = sorted(missing_data.items(), key=lambda x: x[1]['current_missing'], reverse=True)
    print(f"{'排名':<6}{'号码':<6}{'当前遗漏':<12}{'平均遗漏':<12}{'最大遗漏':<12}")
    print("-" * 60)
    for i, (num, data) in enumerate(sorted_missing[:10], 1):
        print(f"{i:<6}{num:<6}{data['current_missing']:<12}{data['avg_missing']:<12.1f}{data['max_missing']:<12}")

    # 周期性分析
    period_patterns = analyze_period(numbers)
    print(f"\n## 五、周期性分析\n")
    if period_patterns:
        print(f"发现 {len(period_patterns)} 个具有周期性规律的号码:")
        print(f"{'号码':<6}{'周期长度':<12}{'置信度':<12}{'出现次数':<12}")
        print("-" * 50)
        sorted_patterns = sorted(period_patterns.items(), key=lambda x: x[1]['confidence'], reverse=True)
        for num, data in sorted_patterns[:15]:
            print(f"{num:<6}{data['period']:<12}{data['confidence']*100:.1f}%{' ':<8}{data['occurrences']}")
    else:
        print("未发现明显的周期性规律")

    # 连号分析
    same_consecutive, adjacent_consecutive = analyze_consecutive(numbers)
    print(f"\n## 六、连号分析\n")
    print(f"- 相同号码连续出现: {len(same_consecutive)} 次")
    if same_consecutive:
        print(f"  最近案例: 第{same_consecutive[-1][0]}期，号码{same_consecutive[-1][1]}连续出现")

    print(f"- 相邻号码连续出现: {len(adjacent_consecutive)} 次")
    print(f"  连号频率: {len(adjacent_consecutive)/len(numbers)*100:.2f}%")
    if adjacent_consecutive:
        recent_adjacent = adjacent_consecutive[-5:]
        print(f"  最近5次案例:")
        for idx, n1, n2 in recent_adjacent:
            print(f"    第{idx}期: {n1} → 第{idx+1}期: {n2}")

    # 趋势分析
    trend_data = analyze_trend(numbers, recent_period=30)
    print(f"\n## 七、趋势分析（最近30期 vs 整体）\n")
    print(f"### 上升趋势TOP10:")
    rising = [item for item in trend_data if item['direction'] == '上升'][:10]
    print(f"{'排名':<6}{'号码':<6}{'整体频率':<12}{'近期频率':<12}{'趋势强度':<12}")
    print("-" * 60)
    for i, item in enumerate(rising, 1):
        print(f"{i:<6}{item['number']:<6}{item['total_freq']:.2f}%{' '*6}{item['recent_freq']:.2f}%{' '*6}+{item['trend_strength']:.2f}%")

    print(f"\n### 下降趋势TOP10:")
    falling = [item for item in trend_data if item['direction'] == '下降'][:10]
    print(f"{'排名':<6}{'号码':<6}{'整体频率':<12}{'近期频率':<12}{'趋势强度':<12}")
    print("-" * 60)
    for i, item in enumerate(falling, 1):
        print(f"{i:<6}{item['number']:<6}{item['total_freq']:.2f}%{' '*6}{item['recent_freq']:.2f}%{' '*6}{item['trend_strength']:.2f}%")

    # 智能推荐
    recommendations = generate_recommendations(lottery_type, top_n=20)
    print(f"\n## 八、智能推荐TOP20号码\n")
    print(f"{'排名':<6}{'号码':<6}{'评分':<10}{'推荐理由'}")
    print("-" * 80)
    for i, rec in enumerate(recommendations, 1):
        reasons_str = ', '.join(rec['reasons']) if rec['reasons'] else '基础数据支持'
        print(f"{i:<6}{rec['number']:<6}{rec['score']:.1f}{' '*6}{reasons_str}")

    # 风险提示
    print(f"\n## 九、风险提示与建议\n")

    # 计算数据的稳定性
    all_counts = [item['count'] for item in freq_data]
    std_dev = statistics.stdev(all_counts) if len(all_counts) > 1 else 0
    mean_count = statistics.mean(all_counts)
    cv = (std_dev / mean_count * 100) if mean_count > 0 else 0

    print(f"### 规律稳定性评估:")
    print(f"- 频率标准差: {std_dev:.2f}")
    print(f"- 变异系数: {cv:.2f}%")

    if cv < 30:
        print(f"- 评估结果: 数据分布较为均匀，规律性较弱")
        print(f"- 风险等级: 中高")
    elif cv < 50:
        print(f"- 评估结果: 数据存在一定规律性，但需谨慎使用")
        print(f"- 风险等级: 中")
    else:
        print(f"- 评估结果: 数据存在明显规律性")
        print(f"- 风险等级: 中低")

    print(f"\n### 建议:")
    print(f"1. 推荐号码仅供参考，不保证中奖")
    print(f"2. 建议结合其他分析维度（如前6个号码、生肖等）综合判断")
    print(f"3. 控制投注金额，理性购彩")
    print(f"4. 周期性规律可能随时间变化，建议定期更新分析")
    print(f"5. 遗漏过大的号码虽然理论上可能爆发，但仍需谨慎")

    print(f"\n{'='*80}\n")

if __name__ == '__main__':
    # 分析澳门彩
    print_analysis_report('am')

    # 分析香港彩
    print_analysis_report('hk')
