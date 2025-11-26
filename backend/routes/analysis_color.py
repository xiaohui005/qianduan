from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from collections import Counter, defaultdict
from typing import Optional
try:
    from backend import collect
    from backend.utils import number_utils
    from backend.utils.db_utils import get_db_cursor
    from backend.utils.export_utils import create_csv_response
except ImportError:
    import collect
    # 兼容直接运行的情况
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from utils import number_utils
    from utils.db_utils import get_db_cursor
    from utils.export_utils import create_csv_response

router = APIRouter()

@router.get("/color_analysis")
def color_analysis_api(lottery_type: str = Query('am'), export: str = Query(None)):
    """
    波色分析API
    根据当前期前6个号码的第2位波色,预测下一期第7位号码的波色

    参数:
    - lottery_type: 彩种类型 (am=澳门, hk=香港)
    - export: 导出格式 (csv=导出CSV文件)
    """
    try:
        # 波色定义
        color_groups = {
            'red': [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
            'blue': [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
            'green': [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]
        }

        def get_number_color_group(number):
            """获取号码所属的波色组"""
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

            current = str(current_period)
            next_period_str = str(next_period)

            if len(current) != len(next_period_str):
                return False

            try:
                current_num = int(current)
                next_num = int(next_period_str)
                return next_num == current_num + 1
            except ValueError:
                return False

        # 获取指定彩种的开奖记录,按时间倒序排列
        with get_db_cursor() as cursor:
            sql = """
            SELECT period, open_time, numbers, lottery_type
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY open_time DESC
            """
            cursor.execute(sql, (lottery_type,))
            records = cursor.fetchall()

        if not records:
            return {"success": False, "message": f"没有找到{lottery_type}彩种的开奖记录"}

        # 按时间正序排列(从旧到新)
        records.reverse()

        analysis_results = []
        current_miss = 0
        max_miss = 0

        # 进行波色分析
        for i in range(len(records) - 1):
            current_record = records[i]
            next_record = records[i + 1]

            # 检查期数连续性
            if not is_consecutive_periods(current_record['period'], next_record['period']):
                continue

            # 解析开奖号码
            try:
                current_numbers = [int(n.strip()) for n in current_record['numbers'].split(',') if n.strip().isdigit()]
                next_numbers = [int(n.strip()) for n in next_record['numbers'].split(',') if n.strip().isdigit()]

                if len(current_numbers) < 7 or len(next_numbers) < 7:
                    continue

                # 获取当前期前6个号码并排序
                first6_numbers = sorted(current_numbers[:6])
                second_number = first6_numbers[1]  # 第2位号码
                second_color = get_number_color_group(second_number)

                # 获取下一期第7位号码
                next_seventh_number = next_numbers[6]  # 第7位号码
                next_seventh_color = get_number_color_group(next_seventh_number)

                # 判断是否命中
                is_hit = second_color == next_seventh_color

                # 更新遗漏统计
                if is_hit:
                    current_miss = 0
                else:
                    current_miss += 1
                    if current_miss > max_miss:
                        max_miss = current_miss

                analysis_results.append({
                    'current_period': current_record['period'],
                    'current_open_time': current_record['open_time'],
                    'current_numbers': current_numbers,
                    'first6_sorted': first6_numbers,
                    'second_number': second_number,
                    'second_color': second_color,
                    'next_period': next_record['period'],
                    'next_seventh_number': next_seventh_number,
                    'next_seventh_color': next_seventh_color,
                    'is_hit': is_hit,
                    'current_miss': current_miss,
                    'max_miss': max_miss
                })

            except (ValueError, IndexError) as e:
                continue

        # 获取最新一期的预测
        latest_prediction = None
        if records:
            latest_record = records[-1]  # 最新一期
            try:
                latest_numbers = [int(n.strip()) for n in latest_record['numbers'].split(',') if n.strip().isdigit()]
                if len(latest_numbers) >= 6:
                    first6_sorted = sorted(latest_numbers[:6])
                    second_number = first6_sorted[1]
                    second_color = get_number_color_group(second_number)

                    # 计算下一期期数
                    next_period = int(latest_record['period']) + 1

                    latest_prediction = {
                        'current_period': latest_record['period'],
                        'next_period': str(next_period),
                        'second_number': second_number,
                        'second_color': second_color,
                        'predicted_color': second_color,
                        'prediction_basis': f"基于{latest_record['period']}期第2位号码{second_number}的波色({second_color})"
                    }
            except (ValueError, IndexError):
                pass

        # 统计信息
        total_periods = len(analysis_results)
        hit_count = sum(1 for r in analysis_results if r['is_hit'])
        hit_rate = (hit_count / total_periods * 100) if total_periods > 0 else 0

        # CSV导出(继承项目的导出封装方案)
        if export == 'csv':
            # 按期号倒序排列(最新的在前)
            sorted_results = sorted(analysis_results, key=lambda x: x['current_period'], reverse=True)

            headers = [
                '当前期数', '开奖时间', '当前期开奖号码', '第2个号码', '第2个号码波色',
                '下一期期数', '下一期第7个号码', '下一期第7个号码波色',
                '结果', '当前错误次数', '历史最大错误次数'
            ]

            # 波色名称映射
            color_names = {
                'red': '红波',
                'blue': '蓝波',
                'green': '绿波'
            }

            rows = []
            for item in sorted_results:
                rows.append([
                    item.get('current_period', ''),
                    item.get('current_open_time', ''),
                    ','.join(str(n).zfill(2) for n in item.get('current_numbers', [])),
                    str(item.get('second_number', '')).zfill(2),
                    color_names.get(item.get('second_color', ''), ''),
                    item.get('next_period', ''),
                    str(item.get('next_seventh_number', '')).zfill(2),
                    color_names.get(item.get('next_seventh_color', ''), ''),
                    '对' if item.get('is_hit') else '错',
                    item.get('current_miss', 0),
                    item.get('max_miss', 0)
                ])

            lottery_name = "澳门" if lottery_type == "am" else "香港"
            filename = f"波色分析_{lottery_name}.csv"
            return create_csv_response(headers, rows, filename)

        return {
            "success": True,
            "data": {
                "lottery_type": lottery_type,
                "analysis_results": analysis_results,
                "latest_prediction": latest_prediction,
                "stats": {
                    "total_periods": total_periods,
                    "hit_count": hit_count,
                    "miss_count": total_periods - hit_count,
                    "hit_rate": round(hit_rate, 2),
                    "current_miss": current_miss,
                    "max_miss": max_miss
                },
                "color_groups": color_groups
            }
        }

    except Exception as e:
        return {"success": False, "message": f"波色分析失败: {str(e)}"}
