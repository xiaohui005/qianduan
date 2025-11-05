"""
号码间隔期数分析模块
计算每期开奖号码在对应位置距离上次出现的间隔期数
"""
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from typing import Optional
try:
    from backend.utils import get_db_cursor, create_csv_response
except ImportError:
    from utils import get_db_cursor, create_csv_response

router = APIRouter()

def calculate_number_gaps(records):
    """
    计算每期每个位置号码的间隔期数

    Args:
        records: 开奖记录列表（按期号正序排列）

    Returns:
        list: 每期的间隔数据
    """
    # 7个位置分别记录每个号码最后出现的索引
    last_appearance = [{} for _ in range(7)]

    result = []

    for idx, record in enumerate(records):
        period = record['period']
        open_time = record['open_time']
        numbers = record['numbers'].split(',')

        # 计算当前期每个位置的间隔
        gaps = []
        for pos in range(7):
            if pos < len(numbers):
                num = numbers[pos]

                # 检查该号码在该位置是否之前出现过
                if num in last_appearance[pos]:
                    # 计算间隔：当前索引 - 上次索引 - 1
                    gap = idx - last_appearance[pos][num] - 1
                    gaps.append(gap)
                else:
                    # 首次出现，标记为 -1
                    gaps.append(-1)

                # 更新该号码在该位置的最后出现索引
                last_appearance[pos][num] = idx
            else:
                gaps.append(None)

        result.append({
            'period': period,
            'open_time': str(open_time) if open_time else '',
            'numbers': numbers,
            'gaps': gaps
        })

    return result

@router.get("/api/number_gap_analysis")
def get_number_gap_analysis(
    lottery_type: str = Query('am', description='彩种类型：am=澳门, hk=香港'),
    page: int = Query(1, ge=1, description='页码'),
    page_size: int = Query(50, ge=1, le=100, description='每页条数'),
    year: Optional[str] = Query(None, description='年份筛选，例如：2025'),
    query_position: Optional[int] = Query(None, ge=1, le=7, description='查询位置（1-7），筛选该位置间隔期数 >= min_gap 的记录'),
    min_gap: Optional[int] = Query(None, ge=0, le=999, description='最小间隔期数（0-999），与query_position配合使用')
):
    """
    号码间隔期数分析

    返回每期开奖数据及7个位置每个号码距离上次在同位置开出的间隔期数
    间隔期数定义：当前期索引 - 上次出现索引 - 1
    首次出现的号码标记为 -1

    支持筛选功能：
    - 如果提供了 query_position 和 min_gap，则只返回该位置间隔期数 >= min_gap 的记录
    - 筛选在内存中进行，但会影响分页结果
    """
    try:
        with get_db_cursor() as cursor:
            # 构建查询SQL
            sql = """
                SELECT period, open_time, numbers
                FROM lottery_result
                WHERE lottery_type = %s
            """
            params = [lottery_type]

            # 年份筛选
            if year:
                sql += " AND period LIKE %s"
                params.append(f"{year}%")

            # 按期号正序排列（用于计算间隔）
            sql += " ORDER BY period ASC"

            cursor.execute(sql, tuple(params))
            all_records = cursor.fetchall()

        if not all_records:
            return {
                "success": True,
                "data": [],
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": 0,
                    "total_pages": 0
                },
                "message": "没有找到数据"
            }

        # 计算间隔期数
        gap_data = calculate_number_gaps(all_records)

        # 倒序排列（最新期在前）
        gap_data.reverse()

        # 应用筛选条件（如果提供）
        filtered_data = gap_data
        if query_position is not None and min_gap is not None:
            # 位置索引从0开始
            position_idx = query_position - 1

            # 筛选该位置间隔期数 >= min_gap 的记录
            filtered_data = [
                record for record in gap_data
                if position_idx < len(record['gaps']) and
                   record['gaps'][position_idx] is not None and
                   record['gaps'][position_idx] >= min_gap
            ]

        # 分页处理（基于筛选后的数据）
        total = len(filtered_data)
        total_pages = (total + page_size - 1) // page_size if total > 0 else 0
        start_idx = (page - 1) * page_size
        end_idx = min(start_idx + page_size, total)

        page_data = filtered_data[start_idx:end_idx]

        return {
            "success": True,
            "data": page_data,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages
            },
            "lottery_type": lottery_type,
            "year": year,
            "query_position": query_position,
            "min_gap": min_gap
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"查询失败: {str(e)}",
            "data": []
        }

@router.get("/api/number_gap_analysis/export")
def export_number_gap_analysis(
    lottery_type: str = Query('am', description='彩种类型：am=澳门, hk=香港'),
    year: Optional[str] = Query(None, description='年份筛选，例如：2025'),
    query_position: Optional[int] = Query(None, ge=1, le=7, description='查询位置（1-7）'),
    min_gap: Optional[int] = Query(None, ge=0, le=999, description='最小间隔期数（0-999）')
):
    """
    导出号码间隔期数分析数据为CSV

    支持筛选：如果提供了 query_position 和 min_gap，则只导出符合条件的记录
    """
    try:
        with get_db_cursor() as cursor:
            # 构建查询SQL
            sql = """
                SELECT period, open_time, numbers
                FROM lottery_result
                WHERE lottery_type = %s
            """
            params = [lottery_type]

            # 年份筛选
            if year:
                sql += " AND period LIKE %s"
                params.append(f"{year}%")

            # 按期号正序排列
            sql += " ORDER BY period ASC"

            cursor.execute(sql, tuple(params))
            all_records = cursor.fetchall()

        if not all_records:
            return {
                "success": False,
                "message": "没有找到数据"
            }

        # 计算间隔期数
        gap_data = calculate_number_gaps(all_records)

        # 倒序排列（最新期在前）
        gap_data.reverse()

        # 应用筛选条件（如果提供）
        if query_position is not None and min_gap is not None:
            position_idx = query_position - 1
            gap_data = [
                record for record in gap_data
                if position_idx < len(record['gaps']) and
                   record['gaps'][position_idx] is not None and
                   record['gaps'][position_idx] >= min_gap
            ]

        # 准备CSV数据
        csv_rows = []
        for item in gap_data:
            row = [
                item['period'],
                item['open_time']
            ]

            # 添加7个号码及其间隔
            numbers = item['numbers']
            gaps = item['gaps']
            for i in range(7):
                if i < len(numbers) and i < len(gaps):
                    num = numbers[i]
                    gap = gaps[i]
                    if gap == -1:
                        # 首次出现
                        display = f"{num}(首次)"
                    else:
                        # 显示间隔期数
                        display = f"{num}({gap}期)"
                    row.append(display)
                else:
                    row.append('')

            csv_rows.append(row)

        # CSV表头
        headers = ['期号', '开奖时间']
        for i in range(7):
            headers.append(f'球{i+1}(间隔)')

        # 生成文件名
        filename_parts = [lottery_type.upper(), '号码间隔期数分析']
        if year:
            filename_parts.append(year)
        filename = '_'.join(filename_parts) + '.csv'

        # 使用工具箱的CSV导出函数
        return create_csv_response(csv_rows, headers, filename)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"导出失败: {str(e)}"
        }

@router.get("/api/number_gap_analysis/stats")
def get_number_gap_stats(
    lottery_type: str = Query('am', description='彩种类型：am=澳门, hk=香港')
):
    """
    获取号码间隔期数的统计信息

    返回每个位置每个号码的统计：
    - 出现次数
    - 平均间隔
    - 最大间隔
    - 当前遗漏（距离最后一次出现的期数）
    """
    try:
        with get_db_cursor() as cursor:
            sql = """
                SELECT period, numbers
                FROM lottery_result
                WHERE lottery_type = %s
                ORDER BY period ASC
            """
            cursor.execute(sql, (lottery_type,))
            all_records = cursor.fetchall()

        if not all_records:
            return {
                "success": False,
                "message": "没有找到数据"
            }

        # 统计数据结构
        stats = []
        for pos in range(7):
            position_stats = {}
            last_idx = {}
            gap_history = {}  # 记录每个号码的所有间隔

            for idx, record in enumerate(all_records):
                numbers = record['numbers'].split(',')
                if pos < len(numbers):
                    num = numbers[pos]

                    # 初始化号码统计
                    if num not in position_stats:
                        position_stats[num] = {
                            'number': num,
                            'count': 0,
                            'gaps': []
                        }
                        gap_history[num] = []

                    # 计算间隔
                    if num in last_idx:
                        gap = idx - last_idx[num] - 1
                        gap_history[num].append(gap)

                    position_stats[num]['count'] += 1
                    last_idx[num] = idx

            # 计算统计指标
            total_records = len(all_records)
            result_list = []

            for num, stat in position_stats.items():
                gaps = gap_history.get(num, [])
                avg_gap = sum(gaps) / len(gaps) if gaps else 0
                max_gap = max(gaps) if gaps else 0

                # 当前遗漏
                if num in last_idx:
                    current_miss = total_records - last_idx[num] - 1
                else:
                    current_miss = total_records

                result_list.append({
                    'number': num,
                    'count': stat['count'],
                    'avg_gap': round(avg_gap, 2),
                    'max_gap': max_gap,
                    'current_miss': current_miss
                })

            # 按号码排序
            result_list.sort(key=lambda x: int(x['number']))
            stats.append({
                'position': pos + 1,
                'numbers': result_list
            })

        return {
            "success": True,
            "data": stats,
            "lottery_type": lottery_type,
            "total_records": total_records
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"统计失败: {str(e)}"
        }
