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
                # 标准化号码：将"07"和"7"统一处理为"7"
                num = numbers[pos].strip()
                num = str(int(num))  # 去除前导零

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
                    # 标准化号码：将"07"和"7"统一处理为"7"
                    num = numbers[pos].strip()
                    num = str(int(num))  # 去除前导零

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

@router.get("/api/number_missing_analysis")
def get_number_missing_analysis(
    lottery_type: str = Query('am', description='彩种类型：am=澳门, hk=香港'),
    target_period: str = Query(..., description='目标期号，计算截止到此期号的遗漏'),
    position: Optional[int] = Query(None, ge=1, le=7, description='位置筛选（1-7），仅查看某个位置的遗漏')
):
    """
    查询遗漏期数开奖

    返回1-49每个号码最后一次开奖到输入期数的遗漏期数
    例如：2025320开28，输入2025323，则28的遗漏期数为3期

    Args:
        lottery_type: 彩种类型
        target_period: 目标期号
        position: 可选的位置筛选（1-7），如果指定则只统计该位置

    Returns:
        包含每个号码遗漏信息的JSON数据
    """
    try:
        with get_db_cursor() as cursor:
            # 查询目标期号是否存在
            cursor.execute(
                "SELECT period FROM lottery_result WHERE lottery_type = %s AND period = %s",
                (lottery_type, target_period)
            )
            target_record = cursor.fetchone()

            if not target_record:
                return {
                    "success": False,
                    "message": f"目标期号 {target_period} 不存在"
                }

            # 查询从最早到目标期号的所有开奖记录（按期号正序）
            cursor.execute("""
                SELECT period, numbers
                FROM lottery_result
                WHERE lottery_type = %s AND period <= %s
                ORDER BY period ASC
            """, (lottery_type, target_period))

            all_records = cursor.fetchall()

        if not all_records:
            return {
                "success": False,
                "message": "没有找到数据"
            }

        # 记录每个号码最后出现的期号索引
        # 如果指定了位置，只统计该位置；否则统计所有位置
        last_appearance = {}  # {号码: (期号, 索引, 位置)}

        # 遍历所有记录
        for idx, record in enumerate(all_records):
            period = record['period']
            numbers = record['numbers'].split(',')

            for pos in range(7):
                # 如果指定了位置筛选，只处理该位置
                if position is not None and pos != (position - 1):
                    continue

                if pos < len(numbers):
                    # 标准化号码：将"07"和"7"统一处理为"7"
                    num = numbers[pos].strip()
                    num = str(int(num))  # 去除前导零

                    # 更新该号码的最后出现信息
                    last_appearance[num] = {
                        'period': period,
                        'index': idx,
                        'position': pos + 1
                    }

        # 计算遗漏期数
        target_index = len(all_records) - 1  # 目标期号的索引
        result = []

        for num in range(1, 50):  # 1-49
            num_str = str(num)

            if num_str in last_appearance:
                info = last_appearance[num_str]
                missing_periods = target_index - info['index']

                result.append({
                    'number': num_str,
                    'last_period': info['period'],
                    'last_position': info['position'],
                    'missing_periods': missing_periods
                })
            else:
                # 该号码在统计范围内从未出现过
                result.append({
                    'number': num_str,
                    'last_period': None,
                    'last_position': None,
                    'missing_periods': len(all_records)  # 遗漏所有期数
                })

        # 按遗漏期数降序排序
        result.sort(key=lambda x: x['missing_periods'], reverse=True)

        return {
            "success": True,
            "data": result,
            "target_period": target_period,
            "lottery_type": lottery_type,
            "position": position,
            "total_periods": len(all_records),
            "message": f"查询成功，共 {len(all_records)} 期数据"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "success": False,
            "message": f"查询失败: {str(e)}"
        }

@router.get("/api/number_missing_analysis/export")
def export_number_missing_analysis(
    lottery_type: str = Query('am', description='彩种类型：am=澳门, hk=香港'),
    target_period: str = Query(..., description='目标期号'),
    position: Optional[int] = Query(None, ge=1, le=7, description='位置筛选（1-7）')
):
    """
    导出号码遗漏期数分析数据为CSV
    """
    try:
        # 调用查询函数获取数据
        result = get_number_missing_analysis(lottery_type, target_period, position)

        if not result.get('success'):
            return {
                "success": False,
                "message": result.get('message', '查询失败')
            }

        data = result.get('data', [])

        if not data:
            return {
                "success": False,
                "message": "没有数据可导出"
            }

        # 准备CSV数据
        csv_rows = []
        for item in data:
            row = [
                item['number'],
                item['last_period'] if item['last_period'] else '从未出现',
                item['last_position'] if item['last_position'] else '-',
                item['missing_periods']
            ]
            csv_rows.append(row)

        # CSV表头
        headers = ['号码', '最后出现期号', '所在位置', '遗漏期数']

        # 生成文件名
        filename_parts = [lottery_type.upper(), '遗漏期数分析', target_period]
        if position:
            filename_parts.append(f'位置{position}')
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
