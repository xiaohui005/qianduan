#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
推荐30码分析模块
基于历史开奖数据生成推荐30码，并计算命中情况和周统计
"""
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from datetime import datetime
from backend.utils import get_db_cursor, create_csv_response
from collections import Counter
import io

router = APIRouter()


def calculate_week_number(date_input):
    """
    计算自然周（周一到周日）
    返回 (年份, 周数)

    Args:
        date_input: datetime对象或日期字符串
    """
    if not date_input:
        return None, None
    try:
        # 如果是字符串，解析为datetime
        if isinstance(date_input, str):
            dt = datetime.strptime(date_input, '%Y-%m-%d %H:%M:%S')
        else:
            # 如果已经是datetime对象，直接使用
            dt = date_input

        # 获取ISO周数（周一为一周开始）
        year, week, _ = dt.isocalendar()
        return year, week
    except Exception as e:
        print(f"计算周数错误: {e}, 输入: {date_input}, 类型: {type(date_input)}")
        return None, None


def generate_recommend30_for_period(lottery_type: str, period: str):
    """
    为指定期号生成推荐30码（最热30码算法）

    核心策略：
    1. 统计最近200期第7位号码的出现频率
    2. 选择出现频率最高的30个号码
    3. 目标：在保持合理命中率的同时，控制遗漏

    Args:
        lottery_type: 彩种类型 (am/hk)
        period: 期号

    Returns:
        推荐的30个号码列表，如果数据不足返回None
    """
    with get_db_cursor() as cursor:
        # 获取最近200期的第7位号码数据
        sql = """
        SELECT numbers
        FROM lottery_result
        WHERE lottery_type = %s
        ORDER BY period DESC
        LIMIT 200
        """
        cursor.execute(sql, (lottery_type,))
        rows = cursor.fetchall()

        if len(rows) < 50:  # 至少需要50期数据
            return None

        # 统计第7位号码的出现频率
        number_freq = Counter()
        for row in rows:
            numbers = row['numbers'].split(',')
            if len(numbers) >= 7:
                seventh_num = int(numbers[6])
                number_freq[seventh_num] += 1

        # 选择出现频率最高的30个号码
        target_count = 30
        if len(number_freq) >= target_count:
            # 有足够的号码，直接选择频率最高的30个
            recommend_numbers = [num for num, freq in number_freq.most_common(target_count)]
        else:
            # 不够30个，先选择所有出现过的号码
            recommend_numbers = list(number_freq.keys())

            # 用1-49补齐到30个
            if len(recommend_numbers) < target_count:
                all_numbers = set(range(1, 50))
                used_numbers = set(recommend_numbers)
                remaining = sorted(all_numbers - used_numbers)
                recommend_numbers.extend(remaining[:target_count - len(recommend_numbers)])

        # 返回前30个号码，按数字排序
        return sorted(recommend_numbers[:target_count])


def update_recommend30_hit_status():
    """
    更新所有推荐30码的命中情况
    遍历所有未计算命中情况的记录，根据下一期的第7个号码判断是否命中
    """
    with get_db_cursor(commit=True) as cursor:
        # 获取所有未计算命中情况的记录
        sql = """
        SELECT id, period, lottery_type, recommend_numbers
        FROM range_recommend30
        WHERE is_hit IS NULL
        ORDER BY period ASC
        """
        cursor.execute(sql)
        records = cursor.fetchall()

        for record in records:
            rec_id = record['id']
            period = record['period']
            lottery_type = record['lottery_type']
            recommend_nums = set(map(int, record['recommend_numbers'].split(',')))

            # 查找下一期数据
            next_sql = """
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE lottery_type = %s AND period > %s
            ORDER BY period ASC
            LIMIT 1
            """
            cursor.execute(next_sql, (lottery_type, period))
            next_row = cursor.fetchone()

            if next_row:
                next_period = next_row['period']
                next_numbers = next_row['numbers'].split(',')
                next_seventh = int(next_numbers[6]) if len(next_numbers) >= 7 else None

                if next_seventh:
                    is_hit = 1 if next_seventh in recommend_nums else 0

                    # 计算周信息
                    week_year, week_number = calculate_week_number(next_row['open_time'])

                    # 更新记录
                    update_sql = """
                    UPDATE range_recommend30
                    SET next_period = %s,
                        next_number = %s,
                        is_hit = %s,
                        week_year = %s,
                        week_number = %s
                    WHERE id = %s
                    """
                    cursor.execute(update_sql, (
                        next_period, next_seventh, is_hit,
                        week_year, week_number, rec_id
                    ))


def update_miss_count():
    """
    更新遗漏值和最大遗漏
    按期号正序遍历，计算当前遗漏和历史最大遗漏
    """
    with get_db_cursor(commit=True) as cursor:
        # 分别处理每个彩种
        for lottery_type in ['am', 'hk']:
            sql = """
            SELECT id, is_hit, miss_count, max_miss
            FROM range_recommend30
            WHERE lottery_type = %s AND is_hit IS NOT NULL
            ORDER BY period ASC
            """
            cursor.execute(sql, (lottery_type,))
            records = cursor.fetchall()

            current_miss = 0
            max_miss = 0

            for record in records:
                rec_id = record['id']
                is_hit = record['is_hit']

                if is_hit == 1:
                    # 命中，重置遗漏
                    current_miss = 0
                else:
                    # 遗漏，累加
                    current_miss += 1
                    if current_miss > max_miss:
                        max_miss = current_miss

                # 更新记录
                update_sql = """
                UPDATE range_recommend30
                SET miss_count = %s, max_miss = %s
                WHERE id = %s
                """
                cursor.execute(update_sql, (current_miss, max_miss, rec_id))


@router.get("/api/recommend30/generate")
async def generate_recommend30(
    lottery_type: str = Query(..., description="彩种类型：am=澳门, hk=香港")
):
    """
    为所有期号生成推荐30码
    遍历所有开奖记录，为每期生成推荐30码
    """
    with get_db_cursor(commit=True) as cursor:
        # 获取所有开奖记录
        sql = """
        SELECT period, open_time
        FROM lottery_result
        WHERE lottery_type = %s
        ORDER BY period ASC
        """
        cursor.execute(sql, (lottery_type,))
        periods = cursor.fetchall()

        generated_count = 0
        for period_row in periods:
            period = period_row['period']

            # 检查是否已存在
            check_sql = """
            SELECT id FROM range_recommend30
            WHERE period = %s AND lottery_type = %s
            """
            cursor.execute(check_sql, (period, lottery_type))
            if cursor.fetchone():
                continue  # 已存在，跳过

            # 生成推荐30码
            recommend30 = generate_recommend30_for_period(lottery_type, period)
            if not recommend30:
                continue

            # 插入数据库
            insert_sql = """
            INSERT INTO range_recommend30
            (period, lottery_type, recommend_numbers, created_at)
            VALUES (%s, %s, %s, NOW())
            """
            recommend_str = ','.join(map(str, recommend30))
            cursor.execute(insert_sql, (period, lottery_type, recommend_str))
            generated_count += 1

        # 生成完成后，更新命中情况
        update_recommend30_hit_status()
        # 更新遗漏值
        update_miss_count()

    return {
        "success": True,
        "message": f"成功生成 {generated_count} 期推荐30码",
        "generated_count": generated_count
    }


@router.get("/api/recommend30/history")
async def get_recommend30_history(
    lottery_type: str = Query(..., description="彩种类型：am=澳门, hk=香港"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
    year: int = Query(None, description="年份筛选")
):
    """
    查询推荐30码历史记录
    """
    with get_db_cursor() as cursor:
        # 构建查询条件
        where_clauses = ["lottery_type = %s"]
        params = [lottery_type]

        if year:
            where_clauses.append("period LIKE %s")
            params.append(f"{year}%")

        where_sql = " AND ".join(where_clauses)

        # 查询总数
        count_sql = f"""
        SELECT COUNT(*) as total
        FROM range_recommend30
        WHERE {where_sql}
        """
        cursor.execute(count_sql, params)
        total = cursor.fetchone()['total']

        # 查询数据
        offset = (page - 1) * page_size
        data_sql = f"""
        SELECT
            period,
            recommend_numbers,
            next_period,
            next_number,
            is_hit,
            miss_count,
            max_miss,
            week_year,
            week_number,
            created_at
        FROM range_recommend30
        WHERE {where_sql}
        ORDER BY period DESC
        LIMIT %s OFFSET %s
        """
        cursor.execute(data_sql, params + [page_size, offset])
        rows = cursor.fetchall()

        # 格式化数据
        results = []
        for row in rows:
            results.append({
                'period': row['period'],
                'recommend_numbers': row['recommend_numbers'],
                'next_period': row['next_period'],
                'next_number': row['next_number'],
                'is_hit': row['is_hit'],
                'hit_status': '命中' if row['is_hit'] == 1 else ('遗漏' if row['is_hit'] == 0 else '-'),
                'miss_count': row['miss_count'],
                'max_miss': row['max_miss'],
                'week_year': row['week_year'],
                'week_number': row['week_number'],
                'created_at': row['created_at'].strftime('%Y-%m-%d %H:%M:%S') if row['created_at'] else None
            })

    return {
        "success": True,
        "data": results,
        "pagination": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    }


@router.get("/api/recommend30/week_stats")
async def get_week_stats(
    lottery_type: str = Query(..., description="彩种类型：am=澳门, hk=香港"),
    year: int = Query(None, description="年份筛选")
):
    """
    按周统计错误次数
    要求：每周错误次数不能超过2次
    """
    with get_db_cursor() as cursor:
        # 构建查询条件
        where_clauses = ["lottery_type = %s", "is_hit IS NOT NULL"]
        params = [lottery_type]

        if year:
            where_clauses.append("week_year = %s")
            params.append(year)

        where_sql = " AND ".join(where_clauses)

        # 查询按周分组的统计
        sql = f"""
        SELECT
            week_year,
            week_number,
            COUNT(*) as total_count,
            SUM(CASE WHEN is_hit = 1 THEN 1 ELSE 0 END) as hit_count,
            SUM(CASE WHEN is_hit = 0 THEN 1 ELSE 0 END) as miss_count
        FROM range_recommend30
        WHERE {where_sql}
        GROUP BY week_year, week_number
        ORDER BY week_year DESC, week_number DESC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 格式化数据
        results = []
        for row in rows:
            miss_count = row['miss_count']
            is_exceed = miss_count > 2  # 超过2次错误

            results.append({
                'week_year': row['week_year'],
                'week_number': row['week_number'],
                'week_label': f"{row['week_year']}年第{row['week_number']}周",
                'total_count': row['total_count'],
                'hit_count': row['hit_count'],
                'miss_count': miss_count,
                'hit_rate': f"{(row['hit_count'] / row['total_count'] * 100):.2f}%" if row['total_count'] > 0 else "0%",
                'is_exceed': is_exceed,
                'status': '超标' if is_exceed else '正常'
            })

    return {
        "success": True,
        "data": results,
        "total_weeks": len(results)
    }


@router.get("/api/recommend30/export")
async def export_recommend30(
    lottery_type: str = Query(..., description="彩种类型：am=澳门, hk=香港"),
    year: int = Query(None, description="年份筛选")
):
    """
    导出推荐30码数据为CSV
    """
    with get_db_cursor() as cursor:
        # 构建查询条件
        where_clauses = ["lottery_type = %s"]
        params = [lottery_type]

        if year:
            where_clauses.append("period LIKE %s")
            params.append(f"{year}%")

        where_sql = " AND ".join(where_clauses)

        # 查询所有数据
        sql = f"""
        SELECT
            period,
            recommend_numbers,
            next_period,
            next_number,
            is_hit,
            miss_count,
            max_miss,
            week_year,
            week_number,
            created_at
        FROM range_recommend30
        WHERE {where_sql}
        ORDER BY period DESC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 准备CSV数据
        data = []
        for row in rows:
            data.append({
                '期号': row['period'],
                '推荐30码': row['recommend_numbers'],
                '下一期': row['next_period'] or '-',
                '下期第7码': row['next_number'] if row['next_number'] else '-',
                '命中状态': '命中' if row['is_hit'] == 1 else ('遗漏' if row['is_hit'] == 0 else '-'),
                '当前遗漏': row['miss_count'],
                '最大遗漏': row['max_miss'],
                '年份': row['week_year'] if row['week_year'] else '-',
                '周数': row['week_number'] if row['week_number'] else '-',
                '生成时间': row['created_at'].strftime('%Y-%m-%d %H:%M:%S') if row['created_at'] else '-'
            })

        headers = ['期号', '推荐30码', '下一期', '下期第7码', '命中状态', '当前遗漏', '最大遗漏', '年份', '周数', '生成时间']
        filename = f"推荐30码_{lottery_type}_{year if year else 'all'}_{datetime.now().strftime('%Y%m%d')}.csv"

        return create_csv_response(data, headers, filename)


@router.get("/api/recommend30/miss_analysis")
async def get_miss_analysis(
    lottery_type: str = Query(..., description="彩种类型：am=澳门, hk=香港"),
    year: int = Query(None, description="年份筛选")
):
    """
    查询遗漏期数分析
    返回所有期数的遗漏情况，包括当前遗漏和最大遗漏
    """
    with get_db_cursor() as cursor:
        # 构建查询条件
        where_clauses = ["lottery_type = %s", "is_hit IS NOT NULL"]
        params = [lottery_type]

        if year:
            where_clauses.append("period LIKE %s")
            params.append(f"{year}%")

        where_sql = " AND ".join(where_clauses)

        # 查询所有数据（按期号正序）
        sql = f"""
        SELECT
            period,
            is_hit,
            miss_count,
            max_miss,
            next_period,
            next_number
        FROM range_recommend30
        WHERE {where_sql}
        ORDER BY period ASC
        """
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # 格式化数据
        results = []
        for row in rows:
            results.append({
                'period': row['period'],
                'is_hit': row['is_hit'],
                'hit_status': '命中' if row['is_hit'] == 1 else '遗漏',
                'miss_count': row['miss_count'],
                'max_miss': row['max_miss'],
                'next_period': row['next_period'],
                'next_number': row['next_number']
            })

    return {
        "success": True,
        "data": results,
        "total": len(results)
    }
