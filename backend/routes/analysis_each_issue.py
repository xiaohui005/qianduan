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

@router.get("/each_issue_analysis")
def each_issue_analysis_api(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000),
    unit_group: Optional[str] = Query(None)
):
    """
    每期分析API,支持分页,最大page_size=10000。
    支持unit_group参数筛选期号个位分组:
    - unit_group=0: 期号个位为0或5
    - unit_group=1: 期号个位为1或6
    - unit_group=2: 期号个位为2或7
    - unit_group=3: 期号个位为3或8
    - unit_group=4: 期号个位为4或9
    取近100期,按期号升序,每一期独立累加miss_count,只有自己命中(后续某一期的第7个号码在本期7个号码中)才定格,否则一直累加到最后一期。
    增加 stop_reason 字段,标识是因为命中(hit)还是到最后一期(end)停止累加。
    支持分页,返回时按期号从大到小排序。
    返回:{total, page, page_size, data: [{period, open_time, numbers, miss_count, stop_reason}]}
    """
    with get_db_cursor() as cursor:
        # 先查出近300期,按期号升序
        cursor.execute(
            "SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT 300",
            (lottery_type,)
        )
        all_rows = cursor.fetchall()[::-1]  # 逆序变为升序

    # 保存原始完整数据用于计算遗漏
    original_all_rows = all_rows.copy()

    # 按期数个位分组筛选
    if unit_group is not None:
        unit_group = int(unit_group)
        # 定义分组规则:0/5, 1/6, 2/7, 3/8, 4/9
        group_digits = {
            0: ['0', '5'],
            1: ['1', '6'],
            2: ['2', '7'],
            3: ['3', '8'],
            4: ['4', '9']
        }
        if unit_group in group_digits:
            allowed_digits = group_digits[unit_group]
            # 只筛选期号个位数属于该分组的记录
            all_rows = [row for row in all_rows if str(row['period'])[-1] in allowed_digits]

    result = []
    n = len(all_rows)
    for idx in range(n):
        row = all_rows[idx]
        period = row['period']
        open_time = row['open_time'].strftime('%Y-%m-%d') if hasattr(row['open_time'], 'strftime') else str(row['open_time'])
        numbers = row['numbers'].split(',')
        miss_count = 1
        stop_reason = 'end'

        # 在原始完整数据中找到当前期的位置
        original_idx = None
        for i, orig_row in enumerate(original_all_rows):
            if orig_row['period'] == period:
                original_idx = i
                break

        if original_idx is not None:
            # 从当前期往后找,直到命中或到最后一期(基于原始完整数据)
            for j in range(original_idx+1, len(original_all_rows)):
                next_row = original_all_rows[j]
                next_numbers = next_row['numbers'].split(',')
                next_num7 = next_numbers[6] if len(next_numbers) >= 7 else ''
                if next_num7 and next_num7 in numbers:
                    stop_reason = 'hit'
                    break
                else:
                    miss_count += 1

        result.append({
            'period': period,
            'open_time': open_time,
            'numbers': ','.join(numbers),
            'miss_count': miss_count,
            'stop_reason': stop_reason
        })
    # 按期号从大到小排序
    result = sorted(result, key=lambda x: x['period'], reverse=True)
    total = len(result)
    start = (page - 1) * page_size
    end = start + page_size
    page_data = result[start:end]
    # 统计当前最大遗漏和历史最大遗漏及其期号
    history_max_miss = 0
    history_max_miss_period = ''
    current_max_miss = 0
    current_max_miss_period = ''
    for item in result:
        if item['stop_reason'] == 'hit':
            if item['miss_count'] > history_max_miss:
                history_max_miss = item['miss_count']
                history_max_miss_period = item['period']
        elif item['stop_reason'] == 'end':
            if item['miss_count'] > current_max_miss:
                current_max_miss = item['miss_count']
                current_max_miss_period = item['period']
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': page_data,
        'current_max_miss': current_max_miss,
        'current_max_miss_period': current_max_miss_period,
        'history_max_miss': history_max_miss,
        'history_max_miss_period': history_max_miss_period,
        'unit_group': unit_group  # 返回当前选择的分组,便于前端显示
    }
