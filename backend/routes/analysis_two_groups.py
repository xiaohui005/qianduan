"""
2组观察分析模块
功能：分析指定期号往前100期数据，找出冷门9码，将剩余40码分成2组
"""
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from backend.utils import get_db_cursor, query_records, create_csv_response
from collections import defaultdict
import io
import csv
from urllib.parse import quote

router = APIRouter()


def get_cold_9_numbers(lottery_type: str, base_period: str, history_count: int = 100):
    """
    找出最冷门的9个号码

    Args:
        lottery_type: 彩种类型 (am/hk)
        base_period: 基准期号
        history_count: 往前查询的期数

    Returns:
        dict: {
            'cold_numbers': [1, 2, 3, ...],  # 冷门9码列表
            'statistics': {号码: 出现次数}
        }
    """
    sql = """
    SELECT numbers FROM lottery_result
    WHERE lottery_type = %s AND period <= %s
    ORDER BY period DESC
    LIMIT %s
    """

    rows = query_records(sql, (lottery_type, base_period, history_count))

    # 统计每个号码在第7位的出现次数
    number_count = defaultdict(int)

    for row in rows:
        numbers = row['numbers'].split(',')
        if len(numbers) >= 7:
            seventh_num = int(numbers[6])  # 第7个号码
            number_count[seventh_num] += 1

    # 确保所有1-49的号码都在统计中
    for i in range(1, 50):
        if i not in number_count:
            number_count[i] = 0

    # 按出现次数升序排序，取最少的9个
    sorted_numbers = sorted(number_count.items(), key=lambda x: x[1])
    cold_9 = [num for num, count in sorted_numbers[:9]]

    statistics = {num: count for num, count in sorted_numbers[:9]}

    return {
        'cold_numbers': cold_9,
        'statistics': statistics,
        'total_periods': len(rows)
    }


def analyze_remaining_40_numbers(lottery_type: str, base_period: str,
                                  cold_numbers: list, history_count: int = 100):
    """
    将剩余40个号码分成2组，各20个号码

    Args:
        lottery_type: 彩种类型
        base_period: 基准期号
        cold_numbers: 要排除的冷门9码
        history_count: 往前查询的期数

    Returns:
        dict: {
            'group_a': [],  # 高频组（20个号码，平均间隔最小）
            'group_b': [],  # 低频组（20个号码，平均间隔较大）
            'group_a_stats': {},
            'group_b_stats': {}
        }
    """
    sql = """
    SELECT period, numbers FROM lottery_result
    WHERE lottery_type = %s AND period <= %s
    ORDER BY period DESC
    LIMIT %s
    """

    rows = query_records(sql, (lottery_type, base_period, history_count))

    # 剩余40个号码
    remaining_40 = [i for i in range(1, 50) if i not in cold_numbers]

    # 统计每个号码的详细信息
    number_info = {}

    for num in remaining_40:
        appearances = []  # 记录该号码出现的期数索引

        for idx, row in enumerate(rows):
            numbers = row['numbers'].split(',')
            if len(numbers) >= 7:
                seventh_num = int(numbers[6])
                if seventh_num == num:
                    appearances.append(idx)

        # 计算统计数据
        total_count = len(appearances)

        if total_count == 0:
            # 使用一个很大的数字代替 infinity，表示从未出现
            avg_interval = 999
            max_miss = len(rows)
        else:
            # 计算间隔
            intervals = []
            for i in range(len(appearances)):
                if i == 0:
                    intervals.append(appearances[i])
                else:
                    intervals.append(appearances[i] - appearances[i-1])

            # 添加最后一次出现到现在的间隔
            if appearances:
                intervals.append(len(rows) - appearances[-1] - 1)

            avg_interval = sum(intervals) / len(intervals) if intervals else 999
            max_miss = max(intervals) if intervals else len(rows)

        number_info[num] = {
            'count': total_count,
            'avg_interval': avg_interval,
            'max_miss': max_miss,
            'appearances': appearances
        }

    # 按平均间隔排序，分成两组各20个号码
    # 平均间隔越小，说明出现越频繁（高频组）
    sorted_by_interval = sorted(number_info.items(), key=lambda x: x[1]['avg_interval'])

    # A组：前20个（平均间隔最小的20个，即高频组）
    group_a = [num for num, _ in sorted_by_interval[:20]]

    # B组：后20个（平均间隔较大的20个，即低频组）
    group_b = [num for num, _ in sorted_by_interval[20:40]]

    # 计算分组统计
    group_a_stats = {num: number_info[num] for num in group_a}
    group_b_stats = {num: number_info[num] for num in group_b}

    return {
        'group_a': sorted(group_a),
        'group_b': sorted(group_b),
        'group_a_stats': group_a_stats,
        'group_b_stats': group_b_stats,
        'total_periods': len(rows)
    }


def verify_groups(lottery_type: str, base_period: str, group_a: list,
                  group_b: list, verify_count: int = 30):
    """
    验证分组的准确性

    Args:
        lottery_type: 彩种类型
        base_period: 基准期号
        group_a: 高频组号码
        group_b: 低频组号码
        verify_count: 验证的期数

    Returns:
        dict: 验证结果统计
    """
    sql = """
    SELECT period, numbers FROM lottery_result
    WHERE lottery_type = %s AND period > %s
    ORDER BY period ASC
    LIMIT %s
    """

    rows = query_records(sql, (lottery_type, base_period, verify_count))

    group_a_hits = []
    group_b_hits = []

    for row in rows:
        numbers = row['numbers'].split(',')
        if len(numbers) >= 7:
            seventh_num = int(numbers[6])

            if seventh_num in group_a:
                group_a_hits.append({
                    'period': row['period'],
                    'number': seventh_num
                })
            elif seventh_num in group_b:
                group_b_hits.append({
                    'period': row['period'],
                    'number': seventh_num
                })

    # 计算命中率
    total_verified = len(rows)
    group_a_rate = len(group_a_hits) / total_verified * 100 if total_verified > 0 else 0
    group_b_rate = len(group_b_hits) / total_verified * 100 if total_verified > 0 else 0

    # 分析高频组的间隔
    group_a_intervals = []
    if group_a_hits:
        prev_idx = -1
        for idx, row in enumerate(rows):
            numbers = row['numbers'].split(',')
            if len(numbers) >= 7 and int(numbers[6]) in group_a:
                if prev_idx >= 0:
                    group_a_intervals.append(idx - prev_idx)
                prev_idx = idx

    avg_a_interval = sum(group_a_intervals) / len(group_a_intervals) if group_a_intervals else 0
    max_a_miss = max(group_a_intervals) if group_a_intervals else 0

    return {
        'total_verified': total_verified,
        'group_a_hits': len(group_a_hits),
        'group_b_hits': len(group_b_hits),
        'group_a_rate': round(group_a_rate, 2),
        'group_b_rate': round(group_b_rate, 2),
        'group_a_avg_interval': round(avg_a_interval, 2),
        'group_a_max_miss': max_a_miss,
        'group_a_hit_details': group_a_hits,
        'group_b_hit_details': group_b_hits
    }


@router.get("/api/two_groups/analyze")
async def analyze_two_groups(
    lottery_type: str = Query(..., description="彩种类型 (am/hk)"),
    period: str = Query(..., description="基准期号"),
    history_count: int = Query(100, description="往前查询的期数")
):
    """
    分析冷门9码和2组号码
    """
    try:
        # 1. 找出冷门9码
        cold_result = get_cold_9_numbers(lottery_type, period, history_count)

        # 2. 分析剩余40码
        group_result = analyze_remaining_40_numbers(
            lottery_type, period, cold_result['cold_numbers'], history_count
        )

        return {
            'success': True,
            'data': {
                'base_period': period,
                'lottery_type': lottery_type,
                'history_count': history_count,
                'cold_9': {
                    'numbers': cold_result['cold_numbers'],
                    'statistics': cold_result['statistics']
                },
                'group_a': {
                    'name': '高频组（4期内至少出现1次）',
                    'numbers': group_result['group_a'],
                    'count': len(group_result['group_a']),
                    'statistics': group_result['group_a_stats']
                },
                'group_b': {
                    'name': '低频组（4期以上出现1次）',
                    'numbers': group_result['group_b'],
                    'count': len(group_result['group_b']),
                    'statistics': group_result['group_b_stats']
                }
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@router.get("/api/two_groups/verify")
async def verify_two_groups(
    lottery_type: str = Query(..., description="彩种类型 (am/hk)"),
    period: str = Query(..., description="基准期号"),
    history_count: int = Query(100, description="往前查询的期数"),
    verify_count: int = Query(30, description="验证的期数")
):
    """
    验证分组的准确性
    """
    try:
        # 1. 找出冷门9码
        cold_result = get_cold_9_numbers(lottery_type, period, history_count)

        # 2. 分析剩余40码
        group_result = analyze_remaining_40_numbers(
            lottery_type, period, cold_result['cold_numbers'], history_count
        )

        # 3. 验证
        verify_result = verify_groups(
            lottery_type, period,
            group_result['group_a'],
            group_result['group_b'],
            verify_count
        )

        return {
            'success': True,
            'data': {
                'base_period': period,
                'lottery_type': lottery_type,
                'verification': verify_result
            }
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


@router.get("/api/two_groups/export")
async def export_two_groups(
    lottery_type: str = Query(..., description="彩种类型 (am/hk)"),
    period: str = Query(..., description="基准期号"),
    history_count: int = Query(100, description="往前查询的期数"),
    verify_count: int = Query(30, description="验证的期数")
):
    """
    导出2组分析结果为CSV
    """
    try:
        # 1. 找出冷门9码
        cold_result = get_cold_9_numbers(lottery_type, period, history_count)

        # 2. 分析剩余40码
        group_result = analyze_remaining_40_numbers(
            lottery_type, period, cold_result['cold_numbers'], history_count
        )

        # 3. 验证
        verify_result = verify_groups(
            lottery_type, period,
            group_result['group_a'],
            group_result['group_b'],
            verify_count
        )

        # 准备CSV数据
        csv_data = []

        # 冷门9码部分
        csv_data.append(['=== 冷门9码 ==='])
        csv_data.append(['号码', '出现次数'])
        for num in cold_result['cold_numbers']:
            csv_data.append([num, cold_result['statistics'][num]])

        csv_data.append([])  # 空行

        # 高频组
        csv_data.append(['=== 高频组（4期内至少出现1次）==='])
        csv_data.append(['号码', '出现次数', '平均间隔', '最大遗漏'])
        for num in group_result['group_a']:
            stats = group_result['group_a_stats'][num]
            csv_data.append([
                num,
                stats['count'],
                round(stats['avg_interval'], 2),
                stats['max_miss']
            ])

        csv_data.append([])  # 空行

        # 低频组
        csv_data.append(['=== 低频组（4期以上出现1次）==='])
        csv_data.append(['号码', '出现次数', '平均间隔', '最大遗漏'])
        for num in group_result['group_b']:
            stats = group_result['group_b_stats'][num]
            csv_data.append([
                num,
                stats['count'],
                round(stats['avg_interval'], 2),
                stats['max_miss']
            ])

        csv_data.append([])  # 空行

        # 验证结果
        csv_data.append(['=== 验证结果 ==='])
        csv_data.append(['项目', '数值'])
        csv_data.append(['验证期数', verify_result['total_verified']])
        csv_data.append(['高频组命中次数', verify_result['group_a_hits']])
        csv_data.append(['高频组命中率%', verify_result['group_a_rate']])
        csv_data.append(['高频组平均间隔', verify_result['group_a_avg_interval']])
        csv_data.append(['高频组最大遗漏', verify_result['group_a_max_miss']])
        csv_data.append(['低频组命中次数', verify_result['group_b_hits']])
        csv_data.append(['低频组命中率%', verify_result['group_b_rate']])

        csv_data.append([])  # 空行

        # 高频组命中详情
        csv_data.append(['=== 高频组命中详情 ==='])
        csv_data.append(['期号', '命中号码'])
        for hit in verify_result['group_a_hit_details']:
            csv_data.append([hit['period'], hit['number']])

        csv_data.append([])  # 空行

        # 低频组命中详情
        csv_data.append(['=== 低频组命中详情 ==='])
        csv_data.append(['期号', '命中号码'])
        for hit in verify_result['group_b_hit_details']:
            csv_data.append([hit['period'], hit['number']])

        # 使用工具箱的CSV导出功能
        filename = f"two_groups_{lottery_type}_{period}.csv"

        # 使用csv.writer正确生成CSV
        output = io.StringIO()
        writer = csv.writer(output)
        for row in csv_data:
            writer.writerow(row)

        # 添加BOM支持Excel
        csv_content = '\ufeff' + output.getvalue()
        encoded_filename = quote(filename)

        return StreamingResponse(
            iter([csv_content.encode('utf-8')]),
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
            }
        )

    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
