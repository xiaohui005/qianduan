"""
去10的最热20分析模块 - 每期显示版本
功能：排除最近10期出现的号码，显示最热的20个号码
"""
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from typing import Optional
from collections import Counter
from urllib.parse import quote
import io
import csv
try:
    from backend.utils import get_db_cursor, create_csv_response
except ImportError:
    from utils import get_db_cursor, create_csv_response

router = APIRouter()


def calculate_period_hot20(all_rows, target_period_idx, pos):
    """
    计算某一期的去10最热20分析

    "去10"的意思是：排除最近10期出现过的号码

    Args:
        all_rows: 所有期号数据（ASC排序）
        target_period_idx: 目标期号在all_rows中的索引
        pos: 位置(1-7)

    Returns:
        dict 或 None
    """
    if target_period_idx < 10:
        return None  # 数据不足10期

    target_row = all_rows[target_period_idx]
    period = target_row['period']

    # 1. 获取往前10期的数据（包括当前期本身）
    recent_10_start = max(0, target_period_idx - 9)  # 包含当前期，所以只需要往前9期
    recent_10 = all_rows[recent_10_start:target_period_idx + 1]  # 包含当前期

    # 2. 构建排除集（最近10期出现过的原始号码，保持出现顺序）
    exclude_list = []  # 用列表保持顺序
    exclude_set = set()  # 用集合快速查找
    for row in recent_10:
        nums = row['numbers'].split(',')
        if pos - 1 < len(nums):
            num = int(nums[pos - 1])  # 原始号码1-49
            if num not in exclude_set:  # 避免重复
                exclude_list.append(num)
                exclude_set.add(num)

    # 3. 获取往前200期的数据用于频率统计（包括当前期）
    analysis_start = max(0, target_period_idx - 199)  # 包含当前期，所以只需要往前199期
    analysis_200 = all_rows[analysis_start:target_period_idx + 1]  # 包含当前期

    if len(analysis_200) < 50:  # 数据不足
        return None

    # 4. 统计频率（排除exclude_set中的号码，使用原始号码）
    number_count = Counter()
    for row in analysis_200:
        nums = row['numbers'].split(',')
        if pos - 1 < len(nums):
            num = int(nums[pos - 1])  # 原始号码
            if num not in exclude_set:
                number_count[num] += 1

    # 5. 取Top20（已按频率从高到低排序）
    top20 = number_count.most_common(20)
    if not top20:
        return {
            'period': period,
            'exclude_numbers': exclude_list,  # 保持开奖顺序，不排序
            'hot20': []
        }

    # 6. 获取下一期的号码（如果存在）
    next_period_number = None
    next_period = None
    if target_period_idx + 1 < len(all_rows):
        next_row = all_rows[target_period_idx + 1]
        next_period = next_row['period']
        next_nums = next_row['numbers'].split(',')
        if pos - 1 < len(next_nums):
            next_period_number = int(next_nums[pos - 1])

    # 7. 只保留号码和频率
    hot_numbers_stats = []
    hot20_numbers = [num for num, freq in top20]

    for number, frequency in top20:
        hot_numbers_stats.append({
            'number': number,
            'frequency': frequency
        })

    return {
        'period': period,
        'exclude_numbers': exclude_list,  # 保持开奖顺序，不排序
        'hot20': hot_numbers_stats,  # 已按频率从高到低排序
        'next_period': next_period,
        'next_period_number': next_period_number,
        'next_period_in_hot20': next_period_number in hot20_numbers if next_period_number is not None else False
    }


@router.get("/api/hot20_minus10")
def hot20_minus10_api(
    lottery_type: str = Query('am', description='彩种类型: am=澳门, hk=香港'),
    pos: int = Query(7, ge=1, le=7, description='号码位置'),
    page: int = Query(1, ge=1, description='页码'),
    page_size: int = Query(20, ge=1, le=100, description='每页数量'),
    year: Optional[str] = Query(None, description='年份过滤')
):
    """
    去10的最热20分析 - 每一期显示

    返回每一期的分析结果，包括：
    - 期号
    - 去10期的号码列表（最近10期出现的原始号码）
    - 最热20个号码及其统计信息（排除了去10期的号码）
    """
    with get_db_cursor() as cursor:
        # 构建查询条件
        where_clause = "WHERE lottery_type=%s"
        params = [lottery_type]

        if year:
            where_clause += " AND period LIKE %s"
            params.append(f"{year}%")

        # 获取所有期号（ASC顺序用于计算）
        sql_all = f"""
            SELECT period, numbers
            FROM lottery_result
            {where_clause}
            ORDER BY period ASC
        """
        cursor.execute(sql_all, params)
        all_rows = cursor.fetchall()

        if not all_rows:
            return {
                "error": "没有数据",
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0
            }

        # 计算每一期的分析结果（从最新期往回遍历）
        results = []
        for idx in range(len(all_rows) - 1, -1, -1):
            period_result = calculate_period_hot20(all_rows, idx, pos)
            if period_result:
                results.append(period_result)

        if not results:
            return {
                "error": "数据不足，至少需要10期数据",
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "total_pages": 0
            }

        # 计算遗漏（需要正序遍历，从旧到新）
        # 反转results数组，使其按期号从旧到新排列
        results_asc = results[::-1]

        current_omission = 0  # 当前遗漏
        max_omission = 0  # 历史最大遗漏

        for item in results_asc:
            # 根据本期的下期结果判断本期的遗漏值
            if item.get('next_period_in_hot20') is not None:
                if item.get('next_period_in_hot20'):
                    # 本期命中（下期在热20中），本期遗漏=0
                    period_omission = 0
                else:
                    # 本期未中（下期不在热20中），本期遗漏=上期遗漏+1
                    period_omission = current_omission + 1
            else:
                # 没有下期结果，保持当前遗漏值
                period_omission = current_omission

            # 设置本期的遗漏值
            item['current_omission'] = period_omission

            # 更新历史最大遗漏
            if period_omission > max_omission:
                max_omission = period_omission
            item['max_omission'] = max_omission

            # 更新current_omission为本期的遗漏值（供下一期使用）
            current_omission = period_omission

        # 再次反转回按期号从新到旧的顺序
        results = results_asc[::-1]

        # 分页
        total = len(results)
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        page_results = results[start:end]

        # 格式化输出
        formatted_results = []
        for item in page_results:
            hot20_str = ','.join(str(h['number']) for h in item['hot20'])
            formatted_results.append({
                'period': item['period'],
                'exclude_numbers': item['exclude_numbers'],
                'exclude_numbers_str': ','.join(map(str, item['exclude_numbers'])),
                'hot20_str': hot20_str,
                'hot20_details': item['hot20'],
                'next_period': item.get('next_period'),
                'next_period_number': item.get('next_period_number'),
                'next_period_in_hot20': item.get('next_period_in_hot20', False),
                'current_omission': item.get('current_omission', 0),
                'max_omission': item.get('max_omission', 0)
            })

        return {
            "data": formatted_results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "lottery_type": lottery_type,
            "pos": pos,
            "year": year or ''
        }


@router.get("/api/hot20_minus10/export_all")
def export_hot20_csv(
    lottery_type: str = Query('am'),
    pos: int = Query(7, ge=1, le=7),
    year: Optional[str] = Query(None)
):
    """导出所有去10最热20分析数据为CSV"""
    with get_db_cursor() as cursor:
        where_clause = "WHERE lottery_type=%s"
        params = [lottery_type]

        if year:
            where_clause += " AND period LIKE %s"
            params.append(f"{year}%")

        sql_all = f"""
            SELECT period, numbers
            FROM lottery_result
            {where_clause}
            ORDER BY period ASC
        """
        cursor.execute(sql_all, params)
        all_rows = cursor.fetchall()

        if not all_rows:
            return {"error": "没有数据"}

        # 计算所有期的分析结果
        results = []
        for idx in range(len(all_rows) - 1, -1, -1):
            period_result = calculate_period_hot20(all_rows, idx, pos)
            if period_result:
                results.append(period_result)

        # 计算遗漏（需要正序遍历，从旧到新）
        results_asc = results[::-1]
        current_omission = 0
        max_omission = 0

        for item in results_asc:
            # 根据本期的下期结果判断本期的遗漏值
            if item.get('next_period_in_hot20') is not None:
                if item.get('next_period_in_hot20'):
                    # 本期命中，本期遗漏=0
                    period_omission = 0
                else:
                    # 本期未中，本期遗漏=上期遗漏+1
                    period_omission = current_omission + 1
            else:
                # 没有下期结果，保持当前遗漏值
                period_omission = current_omission

            # 设置本期的遗漏值
            item['current_omission'] = period_omission
            if period_omission > max_omission:
                max_omission = period_omission
            item['max_omission'] = max_omission

            # 更新current_omission为本期的遗漏值
            current_omission = period_omission

        # 再次反转回按期号从新到旧的顺序
        results = results_asc[::-1]

        # 准备CSV数据
        headers = ['期号', '去10期号码', '最热20号码', '下期结果', '当前遗漏', '历史最大遗漏']
        rows = []

        for item in results:
            exclude_str = ','.join(map(str, item['exclude_numbers']))
            hot20_str = ','.join(str(h['number']) for h in item['hot20'])

            # 下期结果
            if item.get('next_period') and item.get('next_period_number') is not None:
                if item.get('next_period_in_hot20'):
                    next_result = f"命中:{item['next_period_number']}"
                else:
                    next_result = f"未中:{item['next_period_number']}"
            else:
                next_result = '-'

            rows.append([
                item['period'],
                exclude_str,
                hot20_str,
                next_result,
                item.get('current_omission', 0),
                item.get('max_omission', 0)
            ])

        # 使用工具箱函数导出
        lottery_name = "澳门" if lottery_type == "am" else "香港"
        filename = f"去10最热20分析_{lottery_name}_第{pos}位_{year or '全部'}.csv"

        return create_csv_response(headers, rows, filename)
