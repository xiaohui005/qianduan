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
# 以下函数保留用于向后兼容，内部调用新工具箱模块
# 新代码请直接使用 backend.utils.number_utils 中的函数

def plus49_wrap(value: int) -> int:
    """
    正向循环包装（兼容性包装器）

    注意：此函数保留用于向后兼容。
    新代码请使用：from backend.utils import number_utils
    然后调用：number_utils.plus49_wrap(value)
    """
    return number_utils.plus49_wrap(value)

def minus49_wrap(value: int) -> int:
    """
    反向循环包装（兼容性包装器）

    注意：此函数保留用于向后兼容。
    新代码请使用：from backend.utils import number_utils
    然后调用：number_utils.minus49_wrap(value)
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
    group2 = set(['5','6','7','8'])      # 只包含5,6,7,8尾，不含9
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
            # 交替遗漏统计：只累计遗漏，命中则清零
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
    return {'data': result, 'desc': '1组: 0,1,2,3,4尾（不含11,22,33,44）；2组: 5,6,7,8尾', 'group1': list(group1), 'group2': list(group2), 'max_miss': max_miss, 'cur_miss': cur_miss, 'max_alt_miss': max_alt_miss, 'cur_alt_miss': cur_alt_miss}

def analyze_intervals(lottery_type, period):
    """
    区间分析：分析当前期号码对下一期的预测区间命中情况
    """
    with get_db_cursor() as cursor:
        # 获取当前期开奖号码
        cursor.execute(
            "SELECT numbers FROM lottery_result WHERE period=%s AND lottery_type=%s",
            (period, lottery_type)
        )
        row = cursor.fetchone()
        if not row:
            return {'error': f'未找到期号{period}的数据'}
        base_numbers = row['numbers'].split(',')
        # 获取下一期期号和开奖号码
        cursor.execute(
            "SELECT period, numbers FROM lottery_result WHERE period > %s AND lottery_type=%s ORDER BY period ASC LIMIT 1",
            (period, lottery_type)
        )
        row = cursor.fetchone()
        if not row:
            return {'error': f'未找到期号{period}的下一期数据'}
        next_period = row['period']
        next_numbers = row['numbers'].split(',')
    # 区间定义
    intervals = [('+1~+20', 1, 20), ('+5~+24', 5, 24), ('+10~+29', 10, 29), ('+15~+34', 15, 34), ('+20~+39', 20, 39), ('+25~+44', 25, 44)]
    analysis = []
    for num in base_numbers:
        num_int = int(num)
        ranges = {}
        hit = {}
        for label, start, end in intervals:
            rng = [str(num_int + i).zfill(2) for i in range(start, end+1)]
            ranges[label] = rng
            # 判断下一期开奖号码是否在区间内（标准化为整数比较）
            rng_int = [int(r) for r in rng]
            next_numbers_int = [int(n) for n in next_numbers]
            hit[label] = any(n in rng_int for n in next_numbers_int)
        analysis.append({
            'number': num,
            'ranges': ranges,
            'hit': hit
        })
    return {
        'base_period': period,
        'next_period': next_period,
        'base_numbers': base_numbers,
        'next_numbers': next_numbers,
        'analysis': analysis
    }

@router.get("/interval_analysis")
def interval_analysis_api(lottery_type: str = Query(...), period: str = Query(...)):
    """
    区间分析API，返回指定期号的区间分析结果
    """
    result = analyze_intervals(lottery_type, period)
    return JSONResponse(content=result)

@router.get("/range_analysis")
def range_analysis_api(
    lottery_type: str = Query('am'),
    pos: int = Query(1, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000),
    year: str = Query(None)
):
    """
    区间分析API，支持分页，最大page_size=10000。
    返回每期开奖信息、7个球的区间命中情况（命中为0，未命中为距离上次命中的期数，区间只显示头和尾两个数），每个球的区间只和下一期同位置的球比较。最后一列只显示下一期的第N个球。期号倒序，分页返回。
    header=[期号, 开奖时间, 球1, ..., 球7, 下一期球N]。
    新增返回：每个球每个区间的历史最大遗漏、最大遗漏发生期号、当前遗漏，支持按年份过滤。
    """
    def plus49(n, k):
        v = (n + k - 1) % 49 + 1
        return str(v).zfill(2)
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period ASC",
            (lottery_type,)
        )
        all_rows = cursor.fetchall()
    if not all_rows or len(all_rows) < 2:
        return {"data": [], "desc": "无该彩种历史数据或数据不足"}
    # 年份过滤
    if year:
        all_rows = [row for row in all_rows if str(row['period']).startswith(year)]
        if len(all_rows) < 2:
            return {"data": [], "desc": f"{year}年无数据或数据不足"}
    intervals = [('+1~+20', 1, 20), ('+5~+24', 5, 24), ('+10~+29', 10, 29), ('+15~+34', 15, 34), ('+20~+39', 20, 39), ('+25~+44', 25, 44)]
    miss_counter = [[0 for _ in intervals] for _ in range(7)]
    max_miss = [[0 for _ in intervals] for _ in range(7)]
    max_miss_period = [['' for _ in intervals] for _ in range(7)]
    cur_miss = [[0 for _ in intervals] for _ in range(7)]
    all_data = []
    for idx in range(len(all_rows)-1):
        row = all_rows[idx]
        next_row = all_rows[idx+1]
        period = row['period']
        open_time = row['open_time'].strftime('%Y-%m-%d') if hasattr(row['open_time'], 'strftime') else str(row['open_time'])
        nums = row['numbers'].split(',')
        next_nums = next_row['numbers'].split(',')
        balls = []
        for i in range(7):
            cell = '-'
            if i < len(nums):
                num = int(nums[i])
                cell = f"{str(num).zfill(2)}"
                for j, (label, start, end) in enumerate(intervals):
                    head = plus49(num, start)
                    tail = plus49(num, end)
                    rng_str = f"{head}~{tail}"
                    rng = set()
                    for k in range(start, end+1):
                        rng.add(str(int(plus49(num, k))).zfill(2))
                    # 所有球的区间都只和下一期的第N个球比较
                    if pos-1 < len(next_nums):
                        next_ball = str(int(next_nums[pos-1])).zfill(2)
                        hit = next_ball in rng
                        if hit:
                            if miss_counter[i][j] > max_miss[i][j]:
                                max_miss[i][j] = miss_counter[i][j]
                                max_miss_period[i][j] = period
                            miss_counter[i][j] = 0
                        else:
                            miss_counter[i][j] += 1
                    else:
                        pass
                    cell += f"<br>{label}:{rng_str} <b>{miss_counter[i][j]}</b>"
            balls.append(cell)
        if pos-1 < len(next_nums):
            next_n_ball = str(next_nums[pos-1]).zfill(2)
        else:
            next_n_ball = '-'
        all_data.append([period, open_time] + balls + [next_n_ball])
    # 统计当前遗漏
    for i in range(7):
        for j in range(len(intervals)):
            cur_miss[i][j] = miss_counter[i][j]
    all_data.reverse()
    years = sorted({str(row['period'])[:4] for row in all_rows})
    total = len(all_data)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    data = all_data[start_idx:end_idx]
    header = ["期号", "开奖时间"] + [f"球{i+1}" for i in range(7)] + [f"下一期球{pos}"]
    desc = f"分析{lottery_type}彩种每期开奖信息、7个球的区间命中情况（命中为0，未命中为距离上次命中的期数，区间只显示头和尾两个数，每个球的区间只和下一期同位置的球比较），最后一列只显示下一期的第{pos}个球。期号倒序，分页返回。"
    # 最新一期开奖号码
    last_open = None
    if all_rows:
        last_row = all_rows[-1]
        last_open = {
            'period': str(last_row['period']),
            'open_time': last_row['open_time'].strftime('%Y-%m-%d') if hasattr(last_row['open_time'], 'strftime') else str(last_row['open_time']),
            'balls': [str(int(n)).zfill(2) for n in last_row['numbers'].split(',')[:7]]
        }
    # 最新一期预测（最大期号+1，开奖号码未知）
    if all_rows:
        last_period = str(all_rows[-1]['period'])
        try:
            predict_period = str(int(last_period) + 1)
        except Exception:
            predict_period = last_period + '_next'
        # 预测区间范围（每球每区间的头尾）
        predict_ranges = []
        if all_rows:
            last_row = all_rows[-1]
            nums = last_row['numbers'].split(',')
            for i in range(7):
                ball_ranges = []
                if i < len(nums):
                    num = int(nums[i])
                    for (label, start, end) in intervals:
                        head = plus49(num, start)
                        tail = plus49(num, end)
                        rng_str = f"{head}~{tail}"
                        ball_ranges.append({'label': label, 'range': rng_str})
                else:
                    for (label, start, end) in intervals:
                        ball_ranges.append({'label': label, 'range': '-'})
                predict_ranges.append(ball_ranges)
        predict_info = {
            'period': predict_period,
            'ranges': predict_ranges,
            'desc': f"最新一期({predict_period})预测区间范围如下"
        }
    else:
        predict_info = None
    return {"header": header, "data": data, "total": total, "page": page, "page_size": page_size, "desc": desc, "years": years, "max_miss": max_miss, "max_miss_period": max_miss_period, "cur_miss": cur_miss, "predict": predict_info, "last_open": last_open}

@router.get("/range_analysis_minus")
def range_analysis_minus_api(
    lottery_type: str = Query('am'),
    pos: int = Query(1, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000),
    year: str = Query(None)
):
    """
    负区间分析API，返回每期开奖信息、7个球的区间命中情况（命中为0，未命中为距离上次命中的期数，区间只显示头和尾两个数），每个球的区间只和下一期同位置的球比较。最后一列只显示下一期的第N个球。期号倒序，分页返回。
    header=[期号, 开奖时间, 球1, ..., 球7, 下一期球N]。
    新增返回：每个球每个区间的历史最大遗漏、最大遗漏发生期号、当前遗漏，支持按年份过滤。
    区间为-1~-20, -5~-24, -10~-29, -15~-34, -20~-39, -25~-44。
    """
    def plus49(n, k):
        v = (n + k - 1) % 49 + 1
        return str(v).zfill(2)
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period ASC",
            (lottery_type,)
        )
        all_rows = cursor.fetchall()
    if not all_rows or len(all_rows) < 2:
        return {"data": [], "desc": "无该彩种历史数据或数据不足"}
    # 年份过滤
    if year:
        all_rows = [row for row in all_rows if str(row['period']).startswith(year)]
        if len(all_rows) < 2:
            return {"data": [], "desc": f"{year}年无数据或数据不足"}
    intervals = [('-1~-20', -1, -20), ('-5~-24', -5, -24), ('-10~-29', -10, -29), ('-15~-34', -15, -34), ('-20~-39', -20, -39), ('-25~-44', -25, -44)]
    miss_counter = [[0 for _ in intervals] for _ in range(7)]
    max_miss = [[0 for _ in intervals] for _ in range(7)]
    max_miss_period = [['' for _ in intervals] for _ in range(7)]
    cur_miss = [[0 for _ in intervals] for _ in range(7)]
    all_data = []
    for idx in range(len(all_rows)-1):
        row = all_rows[idx]
        next_row = all_rows[idx+1]
        period = row['period']
        open_time = row['open_time'].strftime('%Y-%m-%d') if hasattr(row['open_time'], 'strftime') else str(row['open_time'])
        nums = row['numbers'].split(',')
        next_nums = next_row['numbers'].split(',')
        balls = []
        for i in range(7):
            cell = '-'
            if i < len(nums):
                num = int(nums[i])
                cell = f"{str(num).zfill(2)}"
                for j, (label, start, end) in enumerate(intervals):
                    head = plus49(num, start)
                    tail = plus49(num, end)
                    rng_str = f"{head}~{tail}"
                    rng = set()
                    # 负区间累加
                    for k in range(start, end-1, -1):
                        rng.add(str(int(plus49(num, k))).zfill(2))
                    # 只和下一期同位置的球比较
                    if pos-1 < len(next_nums):
                        next_ball = str(int(next_nums[pos-1])).zfill(2)
                        hit = next_ball in rng
                        if hit:
                            if miss_counter[i][j] > max_miss[i][j]:
                                max_miss[i][j] = miss_counter[i][j]
                                max_miss_period[i][j] = period
                            miss_counter[i][j] = 0
                        else:
                            miss_counter[i][j] += 1
                    else:
                        pass
                    cell += f"<br>{label}:{rng_str} <b>{miss_counter[i][j]}</b>"
            balls.append(cell)
        if pos-1 < len(next_nums):
            next_n_ball = str(next_nums[pos-1]).zfill(2)
        else:
            next_n_ball = '-'
        all_data.append([period, open_time] + balls + [next_n_ball])
    # 统计当前遗漏
    for i in range(7):
        for j in range(len(intervals)):
            cur_miss[i][j] = miss_counter[i][j]
    all_data.reverse()
    years = sorted({str(row['period'])[:4] for row in all_rows})
    total = len(all_data)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    data = all_data[start_idx:end_idx]
    header = ["期号", "开奖时间"] + [f"球{i+1}" for i in range(7)] + [f"下一期球{pos}"]
    desc = f"负区间分析，每期开奖信息、7个球的区间命中情况（命中为0，未命中为距离上次命中的期数，区间只显示头和尾两个数，每个球的区间只和下一期同位置的球比较），最后一列只显示下一期的第{pos}个球。期号倒序，分页返回。"
    # 最新一期开奖号码
    last_open = None
    if all_rows:
        last_row = all_rows[-1]
        last_open = {
            'period': str(last_row['period']),
            'open_time': last_row['open_time'].strftime('%Y-%m-%d') if hasattr(last_row['open_time'], 'strftime') else str(last_row['open_time']),
            'balls': [str(int(n)).zfill(2) for n in last_row['numbers'].split(',')[:7]]
        }
    # 最新一期预测（最大期号+1，开奖号码未知）
    if all_rows:
        last_period = str(all_rows[-1]['period'])
        try:
            predict_period = str(int(last_period) + 1)
        except Exception:
            predict_period = last_period + '_next'
        # 预测区间范围（每球每区间的头尾）
        predict_ranges = []
        if all_rows:
            last_row = all_rows[-1]
            nums = last_row['numbers'].split(',')
            for i in range(7):
                ball_ranges = []
                if i < len(nums):
                    num = int(nums[i])
                    for (label, start, end) in intervals:
                        head = plus49(num, start)
                        tail = plus49(num, end)
                        rng_str = f"{head}~{tail}"
                        ball_ranges.append({'label': label, 'range': rng_str})
                else:
                    for (label, start, end) in intervals:
                        ball_ranges.append({'label': label, 'range': '-'})
                predict_ranges.append(ball_ranges)
        predict_info = {
            'period': predict_period,
            'ranges': predict_ranges,
            'desc': f"最新一期({predict_period})预测区间范围如下"
        }
    else:
        predict_info = None
    return {"header": header, "data": data, "total": total, "page": page, "page_size": page_size, "desc": desc, "years": years, "max_miss": max_miss, "max_miss_period": max_miss_period, "cur_miss": cur_miss, "predict": predict_info, "last_open": last_open}

@router.get("/plus_minus6_analysis")
def plus_minus6_analysis_api(
    lottery_type: str = Query('am'),
    pos: int = Query(1, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000),
    year: str = Query(None)
):
    """
    加减6分析API，支持分页，最大page_size=10000。
    每期取前6个号码，分别加减1~6，分为6组，每组12个数。每组用下一期第N位（N=1~7可选）判断是否命中，统计每组的遗漏期数（连续多少期未命中），最大遗漏、当前遗漏。返回每组的号码、命中、遗漏、最大遗漏、当前遗漏。
    """
    def plus49(n, k):
        v = (n + k - 1) % 49 + 1
        return str(v).zfill(2)
    with get_db_cursor() as cursor:
        cursor.execute(
            "SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period ASC",
            (lottery_type,)
        )
        all_rows = cursor.fetchall()
    if not all_rows or len(all_rows) < 2:
        return {"data": [], "desc": "无该彩种历史数据或数据不足"}
    # 年份过滤
    if year:
        all_rows = [row for row in all_rows if str(row['period']).startswith(year)]
        if len(all_rows) < 2:
            return {"data": [], "desc": f"{year}年无数据或数据不足"}
    N_range = list(range(1, 7))  # N=1~6
    group_miss_counter = [0]*6
    group_max_miss = [0]*6
    group_max_miss_period = ['']*6
    group_cur_miss = [0]*6
    all_data = []
    group_stats = []
    for idx in range(len(all_rows)-1):
        row = all_rows[idx]
        next_row = all_rows[idx+1]
        period = row['period']
        open_time = row['open_time'].strftime('%Y-%m-%d') if hasattr(row['open_time'], 'strftime') else str(row['open_time'])
        nums = row['numbers'].split(',')
        next_nums = next_row['numbers'].split(',')
        group_numbers = []
        group_hit = []
        for n in N_range:
            group = set()
            for i in range(6):
                if i < len(nums):
                    num = int(nums[i])
                    group.add(plus49(num, n))
                    group.add(plus49(num, -n))
            group = sorted(list(group))
            group_numbers.append(group)
            # 命中统计
            if pos-1 < len(next_nums):
                next_ball = str(int(next_nums[pos-1])).zfill(2)
                hit = next_ball in group
                group_hit.append(hit)
                if hit:
                    if group_miss_counter[n-1] > group_max_miss[n-1]:
                        group_max_miss[n-1] = group_miss_counter[n-1]
                        group_max_miss_period[n-1] = period
                    group_miss_counter[n-1] = 0
                else:
                    group_miss_counter[n-1] += 1
            else:
                group_hit.append(False)
        # 下一期第N码
        if pos-1 < len(next_nums):
            next_n_ball = str(next_nums[pos-1]).zfill(2)
        else:
            next_n_ball = '-'
        # 新增：下一期开奖号码
        next_nums_str = ",".join([str(int(n)).zfill(2) for n in next_nums[:7]]) if next_nums else "-"
        # 记录每组命中、遗漏
        all_data.append([
            period, open_time,
            [
                {
                    'n': n,
                    'numbers': group_numbers[n-1],
                    'hit': group_hit[n-1],
                    'miss': group_miss_counter[n-1]
                } for n in N_range
            ],
            next_n_ball,
            next_nums_str  # 下一期开奖号码
        ])
    # 统计当前遗漏
    for n in N_range:
        group_cur_miss[n-1] = group_miss_counter[n-1]
    all_data.reverse()
    years = sorted({str(row['period'])[:4] for row in all_rows})
    total = len(all_data)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    data = all_data[start_idx:end_idx]
    header = ["期号", "开奖时间", "加减1~6组详情", f"下一期球{pos}", "下一期开奖号码"]
    desc = f"每期前6码加减1~6分为6组，每组12个数，用下一期第{pos}位判断命中，统计每组遗漏。"
    # 最新一期开奖号码
    last_open = None
    if all_rows:
        last_row = all_rows[-1]
        last_open = {
            'period': str(last_row['period']),
            'open_time': last_row['open_time'].strftime('%Y-%m-%d') if hasattr(last_row['open_time'], 'strftime') else str(last_row['open_time']),
            'balls': [str(int(n)).zfill(2) for n in last_row['numbers'].split(',')[:6]]
        }
    # 最新一期推算12码
    predict_info = None
    if all_rows:
        last_row = all_rows[-1]
        nums = last_row['numbers'].split(',')
        predict_groups = []
        for n in N_range:
            group = set()
            for i in range(6):
                if i < len(nums):
                    num = int(nums[i])
                    group.add(plus49(num, n))
                    group.add(plus49(num, -n))
            group = sorted(list(group))
            predict_groups.append({'n': n, 'numbers': group})
        predict_info = {
            'period': str(int(last_open['period'])+1) if last_open else '-',
            'groups': predict_groups,
            'desc': f"最新一期({str(int(last_open['period'])+1) if last_open else '-'})推算12码"
        }
    return {
        "header": header,
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "desc": desc,
        "years": years,
        "max_miss": group_max_miss,
        "max_miss_period": group_max_miss_period,
        "cur_miss": group_cur_miss,
        "predict": predict_info,
        "last_open": last_open
    }

@router.get("/each_issue_analysis")
def each_issue_analysis_api(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000),
    unit_group: Optional[str] = Query(None)
):
    """
    每期分析API，支持分页，最大page_size=10000。
    支持unit_group参数筛选期号个位分组：
    - unit_group=0: 期号个位为0或5
    - unit_group=1: 期号个位为1或6
    - unit_group=2: 期号个位为2或7
    - unit_group=3: 期号个位为3或8
    - unit_group=4: 期号个位为4或9
    取近100期，按期号升序，每一期独立累加miss_count，只有自己命中（后续某一期的第7个号码在本期7个号码中）才定格，否则一直累加到最后一期。
    增加 stop_reason 字段，标识是因为命中（hit）还是到最后一期（end）停止累加。
    支持分页，返回时按期号从大到小排序。
    返回：{total, page, page_size, data: [{period, open_time, numbers, miss_count, stop_reason}]}
    """
    with get_db_cursor() as cursor:
        # 先查出近300期，按期号升序
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
        # 定义分组规则：0/5, 1/6, 2/7, 3/8, 4/9
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
            # 从当前期往后找，直到命中或到最后一期（基于原始完整数据）
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
        'unit_group': unit_group  # 返回当前选择的分组，便于前端显示
    }

@router.get("/color_analysis")
def color_analysis_api(lottery_type: str = Query('am'), export: str = Query(None)):
    """
    波色分析API
    根据当前期前6个号码的第2位波色，预测下一期第7位号码的波色

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

        # 获取指定彩种的开奖记录，按时间倒序排列
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

        # 按时间正序排列（从旧到新）
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

        # CSV导出（继承项目的导出封装方案）
        if export == 'csv':
            # 按期号倒序排列（最新的在前）
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

@router.get("/api/twenty_range_analysis")
def get_twenty_range_analysis(lottery_type: str = Query('am'), position: int = Query(1, ge=1, le=7)):
    """
    获取20区间分析数据
    """
    try:
        # 获取最近的200期数据，按期数排序
        with get_db_cursor() as cursor:
            sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period DESC
            LIMIT 200
            """
            cursor.execute(sql, (lottery_type,))
            records = cursor.fetchall()

        if not records:
            return {"success": False, "message": "没有找到开奖数据"}

        # 按期数分组，并计算每个位置的20区间计数
        periods_data = {}
        for record in records:
            period = record['period']
            numbers_str = record['numbers']

            if period not in periods_data:
                periods_data[period] = {'period': period, 'positions': [None] * 7}

            # 解析numbers字段，获取每个位置的号码
            numbers = numbers_str.split(',')
            for pos in range(min(7, len(numbers))):
                try:
                    num = int(numbers[pos])
                    # 计算20区间（1-10, 11-20, 21-30, 31-40, 41-49）
                    if 1 <= num <= 10:
                        range_group = 1
                    elif 11 <= num <= 20:
                        range_group = 2
                    elif 21 <= num <= 30:
                        range_group = 3
                    elif 31 <= num <= 40:
                        range_group = 4
                    else:  # 41-49
                        range_group = 5

                    periods_data[period]['positions'][pos] = {
                        'number': num,
                        'range_group': range_group
                    }
                except (ValueError, IndexError):
                    continue

        return {
            "success": True,
            "data": {
                "lottery_type": lottery_type,
                "position": position,
                "periods": list(periods_data.values())
            }
        }

    except Exception as e:
        print(f"20区间分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/sixth_number_threexiao")
def get_sixth_number_threexiao(
    lottery_type: str = Query('am'),
    position: int = Query(6, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    export: str | None = Query(None)
):
    """
    第6个号码6肖分析：
    - 取该期第 position 个开奖号码，先循环减12直到小于12停止
    - 对结果进行原有偏移：-1,+0,+1,+11,+12,+13,+23,+24,+25,+35,+36,+37运算
    - 再额外添加新偏移：+5,+6,+7,+18,+19,+20,+31,+32,+33,+41,+42,+43
    - 超过49按1起算继续加，小于1按49起算继续减
    - 判定下一期第7个号码是否在这些号码中，命中/遗漏
    - 统计最大遗漏和历史遗漏
    """
    try:
        with get_db_cursor() as cursor:
            sql = """
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period DESC
            LIMIT 670
            """
            cursor.execute(sql, (lottery_type,))
            rows = cursor.fetchall()
        if not rows:
            return {"success": False, "message": "暂无数据"}

        # 按期号升序，便于查找下一期
        records = sorted(rows, key=lambda r: int(r['period']))
        period_to_idx = {r['period']: idx for idx, r in enumerate(records)}

        def gen_threexiao_nums(base_num: int) -> list[int]:
            """
            生成三肖号码
            逻辑：
            1. 先对base_num循环减12，直到 <= 12
            2. 对得到的数进行 -1, 0, +1 操作（在1-12范围内循环）
            3. 再对这个数进行 +5, +6, +7 操作（在1-12范围内循环）
            4. 最后将1-12范围的数转换为1-49范围（每个数对应4个生肖号码）
            """
            # 辅助函数：在1-12范围内循环
            def wrap_12(value: int) -> int:
                while value > 12:
                    value -= 12
                while value < 1:
                    value += 12
                return value

            # 第一步：循环减12，直到 <= 12
            reduced_num = base_num
            while reduced_num > 12:
                reduced_num -= 12

            # 第二步：生成基础偏移集合（-1, 0, +1）和扩展偏移集合（+5, +6, +7）
            base_offsets = [-1, 0, 1]
            extended_offsets = [5, 6, 7]

            # 第三步：在1-12范围内生成所有候选数
            xiao_nums_12 = set()
            for off in base_offsets + extended_offsets:
                xiao_nums_12.add(wrap_12(reduced_num + off))

            # 第四步：将1-12的生肖号码转换为1-49范围的所有对应号码
            # 每个生肖对应4个号码：n, n+12, n+24, n+36
            result_nums = []
            for xiao in xiao_nums_12:
                for i in range(4):  # 0, 12, 24, 36
                    num = xiao + i * 12
                    if num <= 49:
                        result_nums.append(num)

            # 特殊处理：如果结果中包含49，同时加入1（49和1在循环中相邻）
            if 49 in result_nums and 1 not in result_nums:
                result_nums.append(1)
            # 特殊处理：如果结果中包含1，同时加入49（49和1在循环中相邻）
            if 1 in result_nums and 49 not in result_nums:
                result_nums.append(49)
                
            # 去重并排序
            return sorted(list(set(result_nums)))

        results = []
        total_hit = 0
        current_miss = 0
        max_miss = 0
        history_max_miss = 0

        for idx, rec in enumerate(records):
            period = rec['period']
            # 解析第 position 个号码
            try:
                nums = [int(n.strip()) for n in rec['numbers'].split(',') if n.strip().isdigit()]
                if len(nums) < position:
                    continue
                base_num = nums[position - 1]
            except Exception:
                continue

            gen_nums = gen_threexiao_nums(base_num)

            # 查找下一期
            next_period = str(int(period) + 1)
            next_idx = period_to_idx.get(next_period)
            is_hit = False
            next_seventh = None

            if next_idx is not None:
                next_rec = records[next_idx]
                try:
                    next_nums = [int(n.strip()) for n in next_rec['numbers'].split(',') if n.strip().isdigit()]
                    if len(next_nums) >= 7:
                        next_seventh = next_nums[6]
                        is_hit = next_seventh in gen_nums
                except Exception:
                    pass

            if is_hit:
                total_hit += 1
                if current_miss > history_max_miss:
                    history_max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1
                if current_miss > max_miss:
                    max_miss = current_miss

            results.append({
                'current_period': period,
                'current_open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'base_position': position,
                'current_base': base_num,
                'generated_numbers': gen_nums,
                'next_period': next_period,
                'next_seventh': next_seventh,
                'is_hit': is_hit,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss
            })

        # 最新期在前
        results.sort(key=lambda x: x['current_period'], reverse=True)
        total = len(results)
        hit_rate = round((total_hit / total * 100), 2) if total else 0.0

        # 导出 CSV（导出全部结果，忽略分页）
        if export == 'csv':
            headers = ['期号', '开奖时间', '基础位置', '基础号码', '生成号码', '下一期期号', '下一期第7个号码', '是否命中', '当前遗漏', '最大遗漏', '历史最大遗漏']
            rows = []
            for item in results:
                rows.append([
                    item.get('current_period', ''),
                    item.get('current_open_time', ''),
                    item.get('base_position', ''),
                    item.get('current_base', ''),
                    ','.join(str(n) for n in item.get('generated_numbers', [])),
                    item.get('next_period', ''),
                    '' if item.get('next_seventh') is None else item.get('next_seventh'),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('current_miss', ''),
                    item.get('max_miss', ''),
                    item.get('history_max_miss', '')
                ])
            filename = f"sixth_sixxiao_{lottery_type}_pos{position}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'base_position': position,
                'total_analysis': total,
                'hit_count': total_hit,
                'hit_rate': hit_rate,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"第6个号码6肖分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/second_number_fourxiao")
def get_second_number_fourxiao(
    lottery_type: str = Query('am'),
    position: int = Query(2, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    year: int | None = Query(None, description="年份筛选"),
    export: str | None = Query(None)
):
    """
    第二个号码"四肖"分析：
    - 仅当期号个位为3或8时触发（封3结尾/封8结尾）。
    - 取该期第 position 个开奖号码，生成16个号码：+3,+6,...,+48,+0（超过49按1起算继续加，+0为自身）。
    - 周期为后续5期（当前期后1~5期）。若这5期内任一期第7个号码在这16个号码中，则命中，否则遗漏。
    返回每个触发期的窗口详情与命中情况。
    """
    try:
        with get_db_cursor() as cursor:
            # 构建查询条件
            where_clauses = ["lottery_type = %s"]
            params = [lottery_type]

            if year:
                where_clauses.append("period LIKE %s")
                params.append(f"{year}%")

            where_sql = " AND ".join(where_clauses)

            sql = f"""
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE {where_sql}
            ORDER BY period DESC
            LIMIT 500
            """
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        if not rows:
            return {"success": False, "message": "暂无数据"}

        # 按期号升序，便于窗口查找
        records = sorted(rows, key=lambda r: int(r['period']))
        period_to_idx = {r['period']: idx for idx, r in enumerate(records)}

        def gen_16_nums(base_num: int) -> list[int]:
            offsets = [3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,0]
            nums = []

            def custom_wrap(num: int) -> int:
                if num <= 49:
                    return num
                else:
                    # 大于49：变成1 + (num - 50) + 1
                    return 1 + (num - 50) + 1
            for off in offsets:
                n = custom_wrap(base_num + off)
                nums.append(n)

            # 特殊规则：如果包含4,7,10且不包含1，则补上1
            if (4 in nums or 7 in nums or 10 in nums) and 1 not in nums:
                nums.append(1)
            # 去重并排序
            return sorted(list(dict.fromkeys(nums)))

        results = []
        total_hit = 0
        for idx, rec in enumerate(records):
            period = rec['period']
            # 仅处理期号末位为3或8
            try:
                if int(period) % 10 not in (3, 8):
                    continue
            except Exception:
                continue
            # 解析第 position 个号码
            try:
                nums = [int(n.strip()) for n in rec['numbers'].split(',') if n.strip().isdigit()]
                if len(nums) < position:
                    continue
                base_num = nums[position - 1]
            except Exception:
                continue

            gen_nums = gen_16_nums(base_num)

            # 窗口：后续5期
            window = []
            window7 = []
            hit_period = None
            for k in range(1, 6):
                j = idx + k
                if j >= len(records):
                    break
                recj = records[j]
                window.append(recj['period'])
                try:
                    numsj = [int(n.strip()) for n in recj['numbers'].split(',') if n.strip().isdigit()]
                    if len(numsj) >= 7:
                        seventh = numsj[6]
                        window7.append(seventh)
                        if hit_period is None and seventh in gen_nums:
                            hit_period = recj['period']
                    else:
                        window7.append(None)
                except Exception:
                    window7.append(None)

            is_hit = hit_period is not None
            if is_hit:
                total_hit += 1

            results.append({
                'current_period': period,
                'current_open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'base_position': position,
                'current_base': base_num,
                'generated_numbers': gen_nums,
                'window_periods': window,
                'window_seventh_numbers': window7,
                'cycle_size': 5,
                'is_hit': is_hit,
                'hit_period': hit_period
            })

        # 最新期在前
        results.sort(key=lambda x: x['current_period'], reverse=True)
        total = len(results)
        hit_rate = round((total_hit / total * 100), 2) if total else 0.0

        # 计算最大连续遗漏：需要按时间顺序遍历
        max_consecutive_miss = 0
        current_consecutive_miss = 0
        # 按期号正序遍历（从旧到新）
        sorted_by_period = sorted(results, key=lambda x: x['current_period'])
        for item in sorted_by_period:
            if not item['is_hit']:
                current_consecutive_miss += 1
                max_consecutive_miss = max(max_consecutive_miss, current_consecutive_miss)
            else:
                current_consecutive_miss = 0

        # 导出 CSV（导出全部结果，忽略分页）
        if export == 'csv':
            headers = ['触发期数', '开奖时间', '基础位置', '基础号码', '生成16码', '窗口期(后5期)', '窗口第7码', '是否命中', '命中期']
            rows = []
            for item in results:
                rows.append([
                    item.get('current_period', ''),
                    item.get('current_open_time', ''),
                    item.get('base_position', ''),
                    item.get('current_base', ''),
                    ','.join(str(n) for n in item.get('generated_numbers', [])),
                    ','.join(item.get('window_periods', [])),
                    ','.join('-' if n is None else str(n) for n in item.get('window_seventh_numbers', [])),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('hit_period', '') or '-'
                ])
            filename = f"second_fourxiao_{lottery_type}_pos{position}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'total_triggers': total,
                'hit_count': total_hit,
                'miss_count': total - total_hit,
                'hit_rate': hit_rate,
                'max_consecutive_miss': max_consecutive_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"第二个号码四肖分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/seventh_number_range_analysis")
def get_seventh_number_range_analysis(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    export: str | None = Query(None)
):
    """
    获取第7个号码+1~+20区间命中遗漏分析
    每一期开奖的第7个号码在开奖号码+1~+20区间，下一期开奖的第7个号码在这区间为命中，不在为遗漏
    """
    try:
        # 获取最近的若干期数据，按期数升序排列（提高上限，便于观察长遗漏段）
        with get_db_cursor() as cursor:
            sql = """
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period desc
            LIMIT 500
            """
            cursor.execute(sql, (lottery_type,))
            records = cursor.fetchall()

        if len(records) < 2:
            return {"success": False, "message": "数据不足，需要至少2期数据"}

        results = []
        total_hit_count = 0  # 总命中次数累加（从历史开始）
        current_miss = 0  # 当前连续遗漏期数（从最后一次命中后开始计算）
        max_miss = 0  # 最大连续遗漏期数

        # 按期数字典快速查找下一期
        period_dict = {record['period']: record for record in records}

        # 按期数升序排列，确保正确的遗漏统计顺序
        sorted_records = sorted(records, key=lambda x: int(x['period']))

        # 从第一期开始，逐期累积统计
        current_miss = 0  # 当前连续遗漏期数

        # 记录按期的命中序列（升序）以便后续从当前期到最新期的统计
        asc_periods: list[str] = []
        asc_is_hit: list[bool] = []
        asc_seventh: list[int] = []
        asc_ranges: list[list[int]] = []

        for record in sorted_records:
            current_record = record
            current_period = current_record['period']

            # 计算下一期期数
            try:
                next_period = str(int(current_period) + 1)
            except ValueError:
                continue

            # 查找下一期记录
            if next_period not in period_dict:
                continue

            next_record = period_dict[next_period]

            try:
                # 解析当前期开奖号码
                current_numbers = [int(n.strip()) for n in current_record['numbers'].split(',') if n.strip().isdigit()]
                if len(current_numbers) < 7:
                    continue

                # 获取当前期第7个号码
                current_seventh = current_numbers[6]

                # 计算+1~+20区间（超过49的转换为1，然后继续加后续值）
                range_numbers = set()
                for offset in range(1, 21):  # +1到+20
                    range_num = current_seventh + offset
                    if range_num > 49:
                        # 超过49的转换为1，然后加(range_num - 49 - 1)
                        range_num = 1 + (range_num - 49 - 1)
                    range_numbers.add(range_num)

                # 解析下一期开奖号码
                next_numbers = [int(n.strip()) for n in next_record['numbers'].split(',') if n.strip().isdigit()]
                if len(next_numbers) < 7:
                    continue

                # 获取下一期第7个号码
                next_seventh = next_numbers[6]

                # 判断是否命中
                is_hit = next_seventh in range_numbers

                # 更新统计 - 从历史开始累积的命中计算，遗漏只计算从最后一次命中后到现在
                if is_hit:
                    total_hit_count += 1  # 总命中次数+1
                    # 命中后停止当前连续遗漏，重置连续遗漏计数器
                    final_miss = current_miss  # 记录命中前的连续遗漏期数
                    current_miss = 0  # 重置连续遗漏计数器
                else:
                    # 遗漏，连续遗漏期数+1（从最后一次命中后开始计算）
                    current_miss += 1
                    final_miss = current_miss
                    if current_miss > max_miss:
                        max_miss = current_miss

                # 记录结果（先按升序累积）
                results.append({
                    'current_period': current_period,
                    'next_period': next_period,
                    'current_open_time': current_record['open_time'].strftime('%Y-%m-%d') if hasattr(current_record['open_time'], 'strftime') else str(current_record['open_time']),
                    'current_seventh': current_seventh,
                    'range_numbers': sorted(list(range_numbers)),
                    'next_seventh': next_seventh,
                    'is_hit': is_hit,
                    # 为避免混淆，不在每条记录上返回全局累计命中与当前遗漏
                    'max_miss': max_miss
                })

                # 记录升序的命中信息
                asc_periods.append(current_period)
                asc_is_hit.append(is_hit)
                asc_seventh.append(current_seventh)
                asc_ranges.append(sorted(list(range_numbers)))

            except (ValueError, IndexError) as e:
                print(f"处理记录时出错: {current_record['period']}, 错误: {e}")
                continue

        # 基于升序命中序列，计算：
        # - series_hit_count：从当前期开始向后连续命中次数，遇到第一次遗漏即停止累加
        # - series_total_miss：遗漏段长度（从上一次命中之后开始 +1，一直加到下一次命中为止；命中期为0）
        n = len(asc_is_hit)

        # 连续命中次数 DP（从后往前）：若本期命中，则为 1 + 后一位连续命中次数；否则为 0
        consec_hits = [0] * (n + 1)
        for i in range(n - 1, -1, -1):
            consec_hits[i] = (1 + consec_hits[i + 1]) if asc_is_hit[i] else 0

        # 计算每个遗漏段的长度，并赋值给段内所有索引，同时记录段起止索引
        miss_run_len = [0] * n
        miss_run_start = [-1] * n
        miss_run_end = [-1] * n
        i = 0
        while i < n:
            if asc_is_hit[i]:
                i += 1
                continue
            j = i
            while j < n and not asc_is_hit[j]:
                j += 1
            run_len = j - i
            for k in range(i, j):
                miss_run_len[k] = run_len
                miss_run_start[k] = i
                miss_run_end[k] = j - 1
            i = j

        # 写回（与升序 results 对齐）
        for i in range(n):
            results[i]['series_hit_count'] = consec_hits[i]
            if asc_is_hit[i]:
                results[i]['series_total_miss'] = 0
            else:
                results[i]['series_total_miss'] = miss_run_len[i]
                # 附带遗漏段的起止期号，便于前端核对显示
                start_idx = miss_run_start[i]
                end_idx = miss_run_end[i]
                if start_idx != -1 and end_idx != -1:
                    results[i]['miss_span_start_period'] = asc_periods[start_idx]
                    # miss 段是 [start_idx, end_idx]（均为遗漏行，对应当前期），下一次命中是 end_idx+1（若存在）
                    results[i]['miss_span_end_period'] = asc_periods[end_idx]
                    results[i]['miss_span_length'] = miss_run_len[i]

        # 为每期增加"与其他期第7码对比命中"统计
        # 构建第7码到索引列表的映射，加速查找
        value_to_indices: dict[int, list[int]] = {}
        for idx, sev in enumerate(asc_seventh):
            value_to_indices.setdefault(sev, []).append(idx)

        for i in range(n):
            rng = asc_ranges[i] if i < len(asc_ranges) else []
            matched_indices: list[int] = []
            for num in rng:
                for j in value_to_indices.get(num, []):
                    if j != i:
                        matched_indices.append(j)
            matched_indices = sorted(set(matched_indices))

            backward = [asc_periods[j] for j in matched_indices if j < i]
            forward = [asc_periods[j] for j in matched_indices if j > i]

            results[i]['compare_backward_hit_periods'] = backward
            results[i]['compare_forward_hit_periods'] = forward
            results[i]['compare_total_hit_count'] = len(backward) + len(forward)

            # 基于"固定当前期区间 vs 全体期第7码"的最近命中与双向遗漏期数
            # 最近的前命中索引
            prev_idx = -1
            next_idx = -1
            # 在 matched_indices 中二分可更快，这里 n<=500 直接线性找邻近即可
            for j in matched_indices:
                if j < i:
                    prev_idx = j
                elif j > i and next_idx == -1:
                    next_idx = j
                    break
            # 左侧遗漏期数：若存在前命中，则 i - prev_idx - 1，否则 i - 0（从开头到 i-1 全是遗漏）
            left_gap = (i - prev_idx - 1) if prev_idx != -1 else i
            # 右侧遗漏期数：若存在后命中，则 next_idx - i - 1，否则 n - 1 - i
            right_gap = (next_idx - i - 1) if next_idx != -1 else (n - 1 - i)
            results[i]['around_prev_hit_period'] = asc_periods[prev_idx] if prev_idx != -1 else None
            results[i]['around_next_hit_period'] = asc_periods[next_idx] if next_idx != -1 else None
            results[i]['around_left_omission'] = left_gap
            results[i]['around_right_omission'] = right_gap
            results[i]['around_total_omission'] = left_gap + right_gap

        # 计算命中率
        total_analysis = len(results)
        hit_rate = (total_hit_count / total_analysis * 100) if total_analysis > 0 else 0

        # 按期数从大到小排序（最新期数在前）
        results.sort(key=lambda x: x['current_period'], reverse=True)

        # CSV 导出（导出全部，不分页）
        if export == 'csv':
            headers = ['当前期数', '开奖时间', '当前期第7个号码', '+1~+20区间', '下一期期数', '下一期第7个号码', '是否命中',
                       '连续命中数(自本期起)', '遗漏段长度', '最大连续遗漏', '前最近命中', '后最近命中', '双向遗漏期数合计']
            rows = []
            for item in results:
                rows.append([
                    item.get('current_period', ''),
                    item.get('current_open_time', ''),
                    item.get('current_seventh', ''),
                    ','.join(str(n) for n in item.get('range_numbers', [])),
                    item.get('next_period', ''),
                    item.get('next_seventh', ''),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('series_hit_count', 0),
                    item.get('series_total_miss', 0),
                    item.get('max_miss', 0),
                    item.get('around_prev_hit_period', '') or '-',
                    item.get('around_next_hit_period', '') or '-',
                    item.get('around_total_omission', '')
                ])
            filename = f"seventh_plus20_{lottery_type}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total_analysis + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]


        return {
            "success": True,
            "data": {
                "lottery_type": lottery_type,
                "total_analysis": total_analysis,
                "hit_count": total_hit_count,
                "hit_rate": round(hit_rate, 2),
                "current_miss": current_miss,
                "max_miss": max_miss,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "results": paged_results
            }
        }

    except Exception as e:
        print(f"第7个号码区间分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/front6_sanzhong3")
def get_front6_sanzhong3(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    export: str | None = Query(None)
):
    """
    前6码三中三：
    - 触发期：期号尾数为0或5
    - 每个触发期生成6个推荐号码（基于前100期的前6码历史进行推荐）
    - 之后5期内，任意一期的前6个开奖号码中至少包含这6个号码中的任意3个，算命中，否则遗漏
    - 返回最大遗漏与当前遗漏
    - 支持分页与CSV导出
    备注：推荐生成策略（简化且稳定）：统计触发期之前最近100期的前6码出现频次，取频次最高的6个作为推荐；不足6个时按数值补齐。
    """
    try:
        # 取较多期，便于构造窗口
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT period, numbers, open_time
                FROM lottery_result
                WHERE lottery_type = %s
                ORDER BY period ASC
                """,
                (lottery_type,)
            )
            rows = cursor.fetchall()
        if not rows:
                        return {"success": False, "message": "暂无数据"}

        # 构建便捷结构
        records = []
        for r in rows:
            try:
                nums = [int(n.strip()) for n in (r['numbers'] or '').split(',') if n.strip().isdigit()]
            except Exception:
                nums = []
            records.append({
                'period': r['period'],
                'open_time': r['open_time'],
                'numbers': nums
            })

        period_to_index = {rec['period']: idx for idx, rec in enumerate(records)}

        def pick_top6_before(index: int) -> list[int]:
            start = max(0, index - 100)
            counter = Counter()
            for i in range(start, index):
                nums = records[i]['numbers'][:6]
                for n in nums:
                    counter[n] += 1
            # 选择频次最高的6个
            top = [n for n, _ in counter.most_common(8)]
            # 如果不足6个，按从1到49补齐（不与已有重复）
            if len(top) < 8:
                seen = set(top)
                for x in range(1, 50):
                    if x not in seen:
                        top.append(x)
                        if len(top) == 8:
                            break
            return sorted(top)

        results = []
        total_hit = 0
        current_miss = 0
        max_miss = 0

        # 遍历触发期（尾号0或5）
        for idx, rec in enumerate(records):
            period = rec['period']
            try:
                if int(period) % 10 not in (0, 5):
                    continue
            except Exception:
                continue

            # 生成6个推荐号码（基于触发期之前的100期前6位）
            recommend6 = pick_top6_before(idx)

            # 窗口后5期
            window_periods = []
            window_front6 = []
            hit = False
            hit_detail = None
            for k in range(1, 6):
                j = idx + k
                if j >= len(records):
                    break
                window_periods.append(records[j]['period'])
                front6 = records[j]['numbers'][:6]
                window_front6.append(front6)
                # 命中判定：推荐6中至少3个出现在该期前6
                common = set(recommend6).intersection(front6)
                if not hit and len(common) >= 3:
                    hit = True
                    hit_detail = {
                        'hit_period': records[j]['period'],
                        'hit_common_numbers': sorted(list(common))
                    }

            if hit:
                total_hit += 1
                current_miss = 0
            else:
                current_miss += 1
                if current_miss > max_miss:
                    max_miss = current_miss

            omission_streak = current_miss  # 命中后为0，未中则递增

            results.append({
                'trigger_period': period,
                'open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'recommend6': recommend6,
                'window_periods': window_periods,
                'window_front6': window_front6,
                'is_hit': hit,
                'hit_detail': hit_detail,
                'omission_streak': omission_streak
            })

        # 最新期在前
        results.sort(key=lambda x: x['trigger_period'], reverse=True)
        total_triggers = len(results)
        hit_rate = round((total_hit / total_triggers * 100), 2) if total_triggers else 0.0

        # 导出 CSV（导出全部）
        if export == 'csv':
            headers = ['触发期数', '开奖时间', '推荐6码', '窗口期(后5期)', '窗口前6号码', '是否命中', '命中期', '命中重合号码', '连续遗漏']
            rows = []
            for item in results:
                rows.append([
                    item.get('trigger_period', ''),
                    item.get('open_time', ''),
                    ','.join(str(n) for n in item.get('recommend6', [])),
                    ','.join(item.get('window_periods', [])),
                    '|'.join(','.join(str(n) for n in arr) for arr in item.get('window_front6', [])),
                    '命中' if item.get('is_hit') else '遗漏',
                    (item.get('hit_detail') or {}).get('hit_period', '-') ,
                    ','.join(str(n) for n in (item.get('hit_detail') or {}).get('hit_common_numbers', [])),
                    item.get('omission_streak', 0)
                ])
            filename = f"front6_sanzhong3_{lottery_type}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total_triggers + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'total_triggers': total_triggers,
                'hit_count': total_hit,
                'hit_rate': hit_rate,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"前6码三中三分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/five_period_threexiao")
def get_five_period_threexiao(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    year: int | None = Query(None, description="年份筛选"),
    export: str | None = Query(None)
):
    """
    5期3肖计算：
    - 触发条件：期号尾数为0或5（逢5和逢0尾数的期数）
    - 取前3个号码，先进行-12，直至3个号码都小于12大于0为止
    - 然后对这3个号码进行+0，+12，+24，+36，+48运算
    - 如果超过了49的话，这个数就不要了
    - 根据接下来的5期开奖的第7个号码有在这12/13个号码中间的话算命中，不在算遗漏
    """
    try:
        # 获取数据，按期号升序排列
        with get_db_cursor() as cursor:
            # 构建查询条件
            where_clauses = ["lottery_type = %s"]
            params = [lottery_type]

            if year:
                where_clauses.append("period LIKE %s")
                params.append(f"{year}%")

            where_sql = " AND ".join(where_clauses)

            cursor.execute(
                f"""
                SELECT period, numbers, open_time
                FROM lottery_result
                WHERE {where_sql}
                ORDER BY period ASC
                """,
                tuple(params)
            )
            rows = cursor.fetchall()
        if not rows:
            return {"success": False, "message": "暂无数据"}

        # 构建便捷结构
        records = []
        for r in rows:
            try:
                nums = [int(n.strip()) for n in (r['numbers'] or '').split(',') if n.strip().isdigit()]
            except Exception:
                nums = []
            records.append({
                'period': r['period'],
                'open_time': r['open_time'],
                'numbers': nums
            })

        def process_three_numbers(first_three: list[int]) -> list[int]:
            """
            处理前3个号码：
            1. 先进行-12，直至3个号码都小于等于12大于0为止
            2. 然后对这3个号码进行+0，+12，+24，+36，+48运算
            3. 如果超过了49的话，这个数就不要了
            """
            # 第一步：对每个号码进行-12，直到小于12大于0
            processed_numbers = []
            for num in first_three:
                while num > 12:
                    num -= 12
                if 0 < num <= 12:
                    processed_numbers.append(num)
            
            # 第二步：对处理后的号码进行+0，+12，+24，+36，+48运算
            offsets = [0, 12, 24, 36, 48]
            result_numbers = set()
            
            for base_num in processed_numbers:
                for offset in offsets:
                    new_num = base_num + offset
                    if new_num <= 49:  # 超过49的不要
                        result_numbers.add(new_num)
            
            return sorted(list(result_numbers))

        results = []
        total_hit = 0
        current_miss = 0
        max_miss = 0
        history_max_miss = 0

        # 遍历触发期（尾号0或5）
        for idx, rec in enumerate(records):
            period = rec['period']
            try:
                if int(period) % 10 not in (0, 5):
                    continue
            except Exception:
                continue

            # 获取前3个号码
            if len(rec['numbers']) < 3:
                continue
            
            first_three = rec['numbers'][:3]
            generated_numbers = process_three_numbers(first_three)

            # 窗口：后续5期
            window_periods = []
            window_seventh_numbers = []
            hit = False
            hit_period = None
            
            for k in range(1, 6):  # 后续5期
                j = idx + k
                if j >= len(records):
                    break
                
                window_periods.append(records[j]['period'])
                
                # 获取第7个号码
                if len(records[j]['numbers']) >= 7:
                    seventh_num = records[j]['numbers'][6]
                    window_seventh_numbers.append(seventh_num)
                    
                    # 检查是否命中
                    if not hit and seventh_num in generated_numbers:
                        hit = True
                        hit_period = records[j]['period']
                else:
                    window_seventh_numbers.append(None)

            # 更新统计
            if hit:
                total_hit += 1
                if current_miss > history_max_miss:
                    history_max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1
                if current_miss > max_miss:
                    max_miss = current_miss

            results.append({
                'trigger_period': period,
                'open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'first_three_numbers': first_three,
                'generated_numbers': generated_numbers,
                'window_periods': window_periods,
                'window_seventh_numbers': window_seventh_numbers,
                'is_hit': hit,
                'hit_period': hit_period,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss
            })

        # 最新期在前
        results.sort(key=lambda x: x['trigger_period'], reverse=True)
        total_triggers = len(results)
        hit_rate = round((total_hit / total_triggers * 100), 2) if total_triggers else 0.0

        # 导出 CSV（导出全部）
        if export == 'csv':
            headers = ['触发期数', '开奖时间', '前3个号码', '生成号码', '窗口期(后5期)', '窗口第7个号码', '是否命中', '命中期', '当前遗漏', '最大遗漏', '历史最大遗漏']
            rows = []
            for item in results:
                rows.append([
                    item.get('trigger_period', ''),
                    item.get('open_time', ''),
                    ','.join(str(n) for n in item.get('first_three_numbers', [])),
                    ','.join(str(n) for n in item.get('generated_numbers', [])),
                    ','.join(item.get('window_periods', [])),
                    ','.join('-' if n is None else str(n) for n in item.get('window_seventh_numbers', [])),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('hit_period', '') or '-',
                    item.get('current_miss', 0),
                    item.get('max_miss', 0),
                    item.get('history_max_miss', 0)
                ])
            filename = f"five_period_threexiao_{lottery_type}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total_triggers + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'total_triggers': total_triggers,
                'hit_count': total_hit,
                'miss_count': total_triggers - total_hit,
                'hit_rate': hit_rate,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"5期3肖分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

