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

# ============ 向后兼容层 ============
# 以下函数保留用于向后兼容,内部调用新工具箱模块
# 新代码请直接使用 backend.utils.number_utils 中的函数

def plus49_wrap(value: int) -> int:
    """
    正向循环包装(兼容性包装器)

    注意:此函数保留用于向后兼容。
    新代码请使用:from backend.utils import number_utils
    然后调用:number_utils.plus49_wrap(value)
    """
    return number_utils.plus49_wrap(value)

def minus49_wrap(value: int) -> int:
    """
    反向循环包装(兼容性包装器)

    注意:此函数保留用于向后兼容。
    新代码请使用:from backend.utils import number_utils
    然后调用:number_utils.minus49_wrap(value)
    """
    return number_utils.minus49_wrap(value)

@router.get("/tens_analysis")
def tens_analysis_api(lottery_type: str = Query('am'), year: str = Query(None)):
    tens_cols = ["00","01","02","03","04","11","12","13","14","22","23","24","33","34","44"]
    with get_db_cursor() as cursor:
        cursor.execute("SELECT period, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC", (lottery_type,))
        rows = cursor.fetchall()
    # 按年份筛选
    if year:
        rows = [row for row in rows if row['period'].startswith(year)]
    result = []
    max_miss = []
    max_miss_period = []
    for pos in range(7):  # 从第7位到第1位倒序遍历
        miss_counter = {col: 0 for col in tens_cols}
        max_counter = {col: 0 for col in tens_cols}
        max_period = {col: None for col in tens_cols}
        sorted_rows = sorted(rows, key=lambda r: r['period'])
        pos_result = []
        for row in sorted_rows:
            nums = row['numbers'].split(',')
            n = nums[pos] if pos < len(nums) else ''
            t = n.zfill(2)[0]  # 十位
            row_data = {
                'period': row['period'],
                'num': n,
                'miss': {col: 0 for col in tens_cols}
            }
            for col in tens_cols:
                if t in col:
                    row_data['miss'][col] = 0
                    if miss_counter[col] > max_counter[col]:
                        max_counter[col] = miss_counter[col]
                        max_period[col] = row['period']
                    miss_counter[col] = 0
                else:
                    miss_counter[col] += 1
                    row_data['miss'][col] = miss_counter[col]
            pos_result.append(row_data)
        for col in tens_cols:
            if miss_counter[col] > max_counter[col]:
                max_counter[col] = miss_counter[col]
                max_period[col] = sorted_rows[-1]['period'] if sorted_rows else None
        max_miss.append(max_counter)
        max_miss_period.append(max_period)
        result.append(list(reversed(pos_result)))
    return {'data': result, 'tens_cols': tens_cols, 'max_miss': max_miss, 'max_miss_period': max_miss_period}

@router.get("/units_analysis")
def units_analysis_api(lottery_type: str = Query('am'), year: str = Query(None)):
    group1 = set(['0','1','2','3','4'])  # 只包含0,1,2,3,4尾
    group2 = set(['5','6','7','8'])      # 只包含5,6,7,8尾,不含9
    not_in1 = {'11','22','33','44'}      # 这些数不算1组命中
    with get_db_cursor() as cursor:
        cursor.execute("SELECT period, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC", (lottery_type,))
        rows = cursor.fetchall()
    if year:
        rows = [row for row in rows if row['period'].startswith(year)]
    result = []
    max_miss = []
    cur_miss = []
    max_alt_miss = []
    cur_alt_miss = []
    for pos in range(7):
        sorted_rows = sorted(rows, key=lambda r: r['period'])
        pos_result = []
        miss1 = 0
        miss2 = 0
        hit1 = 0
        hit2 = 0
        last_group = None
        alt_miss = 0
        max_alt = 0
        for row in sorted_rows:
            nums = row['numbers'].split(',')
            n = nums[pos] if pos < len(nums) else ''
            u = n[-1] if n else ''
            # 判断属于哪组
            in1 = (u in group1) and (n not in not_in1)
            in2 = (u in group2)
            if in1:
                group = 1
            elif in2:
                group = 2
            else:
                group = 0
            # 只要不在该组内都算遗漏
            if in1:
                miss1 = 0
                hit1 += 1
            else:
                miss1 += 1
                hit1 = 0
            if in2:
                miss2 = 0
                hit2 += 1
            else:
                miss2 += 1
                hit2 = 0
            # 交替遗漏统计:只累计遗漏,命中则清零
            if last_group in (1,2) and group in (1,2):
                if (last_group == 1 and group == 2) or (last_group == 2 and group == 1):
                    alt_miss = 0
                else:
                    alt_miss += 1
            else:
                alt_miss += 1
            if alt_miss > max_alt:
                max_alt = alt_miss
            last_group = group if group in (1,2) else last_group
            pos_result.append({
                'period': row['period'],
                'num': n,
                'group': group,
                'miss1': miss1,
                'miss2': miss2,
                'hit1': hit1,
                'hit2': hit2,
                'alt_miss': alt_miss
            })
        max1 = max([row['miss1'] for row in pos_result]) if pos_result else 0
        max2 = max([row['miss2'] for row in pos_result]) if pos_result else 0
        max_miss.append({'miss1': max1, 'miss2': max2})
        cur_miss.append({'miss1': miss1, 'miss2': miss2})
        max_alt_miss.append(max_alt)
        cur_alt_miss.append(alt_miss)
        result.append(list(reversed(pos_result)))
    return {'data': result, 'desc': '1组: 0,1,2,3,4尾(不含11,22,33,44);2组: 5,6,7,8尾', 'group1': list(group1), 'group2': list(group2), 'max_miss': max_miss, 'cur_miss': cur_miss, 'max_alt_miss': max_alt_miss, 'cur_alt_miss': cur_alt_miss}
