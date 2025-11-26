"""
高20码分析路由
基于前600期，组合策略：近期热号(100期top10) + 中期稳定号(600期中频10码)
"""
from fastapi import APIRouter, Query
from collections import Counter
from backend.utils import get_db_cursor, create_csv_response

router = APIRouter()

def get_seventh_number(numbers_str):
    """获取第7个号码"""
    if not numbers_str:
        return None
    numbers = [int(n) for n in numbers_str.split(',')]
    return numbers[6] if len(numbers) >= 7 else None


@router.get("/api/high20_analysis")
def high20_analysis(
    lottery_type: str = Query(..., description="彩种类型：am或hk"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
    year: str = Query(None, description="年份筛选，如2025")
):
    """
    高20码分析 - 每期生成20个号码，根据下一期第7个号码判断命中情况

    策略：组合策略
    - 近100期的热号top10
    - 全部600期的中频号（排除top15和bottom15，取中间20个中的10个）

    特点：基于600期历史，命中率约38%，偶尔会超过5期连续错误
    """
    with get_db_cursor() as cursor:
        # 构建查询条件
        where_clause = "WHERE lottery_type=%s"
        params = [lottery_type]

        if year:
            where_clause += " AND period LIKE %s"
            params.append(f"{year}%")

        # 获取所有历史数据（按期号正序）
        sql = f"""
            SELECT period, numbers
            FROM lottery_result
            {where_clause}
            ORDER BY period ASC
        """
        cursor.execute(sql, tuple(params))
        all_records = cursor.fetchall()

    if len(all_records) < 601:
        return {
            "code": 400,
            "message": "数据不足，至少需要601期数据",
            "data": []
        }

    # 分析每期的高20码
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
        top20_str = ','.join(map(str, sorted(final_20)))

        # 检查下一期是否命中（如果存在下一期）
        is_hit = 0
        hit_number = None
        next_period = None

        if i + 1 < len(all_records):
            next_record = all_records[i + 1]
            next_period = next_record['period']
            next_seventh = get_seventh_number(next_record['numbers'])

            if next_seventh is not None:
                is_hit = 1 if next_seventh in final_20 else 0
                if is_hit:
                    hit_number = next_seventh

        results.append({
            'period': current_period,
            'top20_numbers': top20_str,
            'next_period': next_period,
            'is_hit': is_hit,
            'hit_number': hit_number
        })

    # 计算遗漏值和连续错误（正序遍历）
    omission = 0
    max_omission_ever = 0
    consecutive_miss = 0
    max_consecutive_miss = 0
    over5_periods = []  # 记录超过5期的情况

    for idx, result in enumerate(results):
        if result['next_period'] is None:
            result['omission'] = omission
            result['consecutive_miss'] = consecutive_miss
            result['max_omission_ever'] = max_omission_ever
            result['over5_alert'] = ''
            continue

        if result['is_hit'] == 0:
            omission += 1
            consecutive_miss += 1
            max_omission_ever = max(max_omission_ever, omission)
            max_consecutive_miss = max(max_consecutive_miss, consecutive_miss)
        else:
            omission = 0
            consecutive_miss = 0

        result['omission'] = omission
        result['consecutive_miss'] = consecutive_miss
        result['max_omission_ever'] = max_omission_ever

        # 标注超过5期的情况
        if consecutive_miss > 5:
            alert_msg = f"连续错{consecutive_miss}期"
            result['over5_alert'] = alert_msg
            # 记录开始期号
            if consecutive_miss == 6 or (idx > 0 and results[idx-1]['consecutive_miss'] <= 5):
                over5_periods.append({
                    'start_period': result['period'],
                    'consecutive_count': consecutive_miss
                })
        else:
            result['over5_alert'] = ''

    # 统计命中率
    total_checked = sum(1 for r in results if r['next_period'] is not None)
    hit_count = sum(1 for r in results if r['is_hit'] == 1)
    hit_rate = (hit_count / total_checked * 100) if total_checked > 0 else 0

    # 统计超过5期的次数（去重，只统计起始期）
    over5_count = len(set(p['start_period'] for p in over5_periods))

    # 获取当前遗漏期数（最新一期的遗漏值，倒序前是最后一条记录）
    current_omission = results[-1]['omission'] if results else 0

    # 倒序排列（最新期号在前）
    results.reverse()

    # 分页
    total_records = len(results)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_results = results[start_idx:end_idx]

    return {
        "code": 200,
        "message": "success",
        "data": {
            "records": paginated_results,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total_records,
                "total_pages": (total_records + page_size - 1) // page_size
            },
            "statistics": {
                "total_checked": total_checked,
                "hit_count": hit_count,
                "miss_count": total_checked - hit_count,
                "hit_rate": round(hit_rate, 2),
                "max_consecutive_miss": max_consecutive_miss,
                "max_omission_ever": max_omission_ever,
                "current_omission": current_omission,  # 当前遗漏期数
                "over5_count": over5_count
            },
            "over5_periods": over5_periods  # 超过5期的详细信息
        }
    }


@router.get("/api/high20_analysis/export_all")
def export_high20_analysis(
    lottery_type: str = Query(..., description="彩种类型：am或hk"),
    year: str = Query(None, description="年份筛选，如2025")
):
    """导出所有高20码分析数据为CSV"""
    # 获取所有数据（不分页）
    response = high20_analysis(
        lottery_type=lottery_type,
        page=1,
        page_size=999999,
        year=year
    )

    if response['code'] != 200:
        return {"code": response['code'], "message": response['message']}

    records = response['data']['records']

    # CSV表头
    headers = [
        "期号",
        "高20码",
        "下期期号",
        "是否命中",
        "命中号码",
        "当前遗漏",
        "连续错误",
        "超5期警告"
    ]

    # CSV数据
    csv_data = []
    for record in records:
        csv_data.append([
            record['period'],
            record['top20_numbers'],
            record['next_period'] or '',
            '是' if record['is_hit'] == 1 else '否',
            record['hit_number'] or '',
            record['omission'],
            record['consecutive_miss'],
            record['over5_alert']
        ])

    # 文件名
    filename = f"high20_analysis_{lottery_type}"
    if year:
        filename += f"_{year}"
    filename += ".csv"

    return create_csv_response(headers, csv_data, filename)
