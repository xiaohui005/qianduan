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

def analyze_intervals(lottery_type, period):
    """
    区间分析:分析当前期号码对下一期的预测区间命中情况
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
            # 判断下一期开奖号码是否在区间内
            hit[label] = any(n in rng for n in next_numbers)
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
    区间分析API,返回指定期号的区间分析结果
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
    区间分析API,支持分页,最大page_size=10000。
    返回每期开奖信息、7个球的区间命中情况(命中为0,未命中为距离上次命中的期数,区间只显示头和尾两个数),每个球的区间只和下一期同位置的球比较。最后一列只显示下一期的第N个球。期号倒序,分页返回。
    header=[期号, 开奖时间, 球1, ..., 球7, 下一期球N]。
    新增返回:每个球每个区间的历史最大遗漏、最大遗漏发生期号、当前遗漏,支持按年份过滤。
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
    desc = f"分析{lottery_type}彩种每期开奖信息、7个球的区间命中情况(命中为0,未命中为距离上次命中的期数,区间只显示头和尾两个数,每个球的区间只和下一期同位置的球比较),最后一列只显示下一期的第{pos}个球。期号倒序,分页返回。"
    # 最新一期开奖号码
    last_open = None
    if all_rows:
        last_row = all_rows[-1]
        last_open = {
            'period': str(last_row['period']),
            'open_time': last_row['open_time'].strftime('%Y-%m-%d') if hasattr(last_row['open_time'], 'strftime') else str(last_row['open_time']),
            'balls': [str(int(n)).zfill(2) for n in last_row['numbers'].split(',')[:7]]
        }
    # 最新一期预测(最大期号+1,开奖号码未知)
    if all_rows:
        last_period = str(all_rows[-1]['period'])
        try:
            predict_period = str(int(last_period) + 1)
        except Exception:
            predict_period = last_period + '_next'
        # 预测区间范围(每球每区间的头尾)
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
    负区间分析API,返回每期开奖信息、7个球的区间命中情况(命中为0,未命中为距离上次命中的期数,区间只显示头和尾两个数),每个球的区间只和下一期同位置的球比较。最后一列只显示下一期的第N个球。期号倒序,分页返回。
    header=[期号, 开奖时间, 球1, ..., 球7, 下一期球N]。
    新增返回:每个球每个区间的历史最大遗漏、最大遗漏发生期号、当前遗漏,支持按年份过滤。
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
    desc = f"负区间分析,每期开奖信息、7个球的区间命中情况(命中为0,未命中为距离上次命中的期数,区间只显示头和尾两个数,每个球的区间只和下一期同位置的球比较),最后一列只显示下一期的第{pos}个球。期号倒序,分页返回。"
    # 最新一期开奖号码
    last_open = None
    if all_rows:
        last_row = all_rows[-1]
        last_open = {
            'period': str(last_row['period']),
            'open_time': last_row['open_time'].strftime('%Y-%m-%d') if hasattr(last_row['open_time'], 'strftime') else str(last_row['open_time']),
            'balls': [str(int(n)).zfill(2) for n in last_row['numbers'].split(',')[:7]]
        }
    # 最新一期预测(最大期号+1,开奖号码未知)
    if all_rows:
        last_period = str(all_rows[-1]['period'])
        try:
            predict_period = str(int(last_period) + 1)
        except Exception:
            predict_period = last_period + '_next'
        # 预测区间范围(每球每区间的头尾)
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
    加减6分析API,支持分页,最大page_size=10000。
    每期取前6个号码,分别加减1~6,分为6组,每组12个数。每组用下一期第N位(N=1~7可选)判断是否命中,统计每组的遗漏期数(连续多少期未命中),最大遗漏、当前遗漏。返回每组的号码、命中、遗漏、最大遗漏、当前遗漏。
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
        # 新增:下一期开奖号码
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
    desc = f"每期前6码加减1~6分为6组,每组12个数,用下一期第{pos}位判断命中,统计每组遗漏。"
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

@router.get("/api/twenty_range_analysis")
def get_twenty_range_analysis(lottery_type: str = Query('am'), position: int = Query(1, ge=1, le=7)):
    """
    获取20区间分析数据
    """
    try:
        # 获取最近的200期数据,按期数排序
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

        # 按期数分组,并计算每个位置的20区间计数
        periods_data = {}
        for record in records:
            period = record['period']
            numbers_str = record['numbers']

            if period not in periods_data:
                periods_data[period] = {'period': period, 'positions': [None] * 7}

            # 解析numbers字段,获取每个位置的号码
            numbers = numbers_str.split(',')
            for pos in range(min(7, len(numbers))):
                try:
                    num = int(numbers[pos])
                    # 计算20区间(1-10, 11-20, 21-30, 31-40, 41-49)
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

@router.get("/api/seventh_number_range_analysis")
def get_seventh_number_range_analysis(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    export: str | None = Query(None)
):
    """
    获取第7个号码+1~+20区间命中遗漏分析
    每一期开奖的第7个号码在开奖号码+1~+20区间,下一期开奖的第7个号码在这区间为命中,不在为遗漏
    """
    try:
        # 获取最近的若干期数据,按期数升序排列(提高上限,便于观察长遗漏段)
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
            return {"success": False, "message": "数据不足,需要至少2期数据"}

        results = []
        total_hit_count = 0  # 总命中次数累加(从历史开始)
        current_miss = 0  # 当前连续遗漏期数(从最后一次命中后开始计算)
        max_miss = 0  # 最大连续遗漏期数

        # 按期数字典快速查找下一期
        period_dict = {record['period']: record for record in records}

        # 按期数升序排列,确保正确的遗漏统计顺序
        sorted_records = sorted(records, key=lambda x: int(x['period']))

        # 从第一期开始,逐期累积统计
        current_miss = 0  # 当前连续遗漏期数

        # 记录按期的命中序列(升序)以便后续从当前期到最新期的统计
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

                # 计算+1~+20区间(超过49的转换为1,然后继续加后续值)
                range_numbers = set()
                for offset in range(1, 21):  # +1到+20
                    range_num = current_seventh + offset
                    if range_num > 49:
                        # 超过49的转换为1,然后加(range_num - 49 - 1)
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

                # 更新统计 - 从历史开始累积的命中计算,遗漏只计算从最后一次命中后到现在
                if is_hit:
                    total_hit_count += 1  # 总命中次数+1
                    # 命中后停止当前连续遗漏,重置连续遗漏计数器
                    final_miss = current_miss  # 记录命中前的连续遗漏期数
                    current_miss = 0  # 重置连续遗漏计数器
                else:
                    # 遗漏,连续遗漏期数+1(从最后一次命中后开始计算)
                    current_miss += 1
                    final_miss = current_miss
                    if current_miss > max_miss:
                        max_miss = current_miss

                # 记录结果(先按升序累积)
                results.append({
                    'current_period': current_period,
                    'next_period': next_period,
                    'current_open_time': current_record['open_time'].strftime('%Y-%m-%d') if hasattr(current_record['open_time'], 'strftime') else str(current_record['open_time']),
                    'current_seventh': current_seventh,
                    'range_numbers': sorted(list(range_numbers)),
                    'next_seventh': next_seventh,
                    'is_hit': is_hit,
                    # 为避免混淆,不在每条记录上返回全局累计命中与当前遗漏
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

        # 基于升序命中序列,计算:
        # - series_hit_count:从当前期开始向后连续命中次数,遇到第一次遗漏即停止累加
        # - series_total_miss:遗漏段长度(从上一次命中之后开始 +1,一直加到下一次命中为止;命中期为0)
        n = len(asc_is_hit)

        # 连续命中次数 DP(从后往前):若本期命中,则为 1 + 后一位连续命中次数;否则为 0
        consec_hits = [0] * (n + 1)
        for i in range(n - 1, -1, -1):
            consec_hits[i] = (1 + consec_hits[i + 1]) if asc_is_hit[i] else 0

        # 计算每个遗漏段的长度,并赋值给段内所有索引,同时记录段起止索引
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

        # 写回(与升序 results 对齐)
        for i in range(n):
            results[i]['series_hit_count'] = consec_hits[i]
            if asc_is_hit[i]:
                results[i]['series_total_miss'] = 0
            else:
                results[i]['series_total_miss'] = miss_run_len[i]
                # 附带遗漏段的起止期号,便于前端核对显示
                start_idx = miss_run_start[i]
                end_idx = miss_run_end[i]
                if start_idx != -1 and end_idx != -1:
                    results[i]['miss_span_start_period'] = asc_periods[start_idx]
                    # miss 段是 [start_idx, end_idx](均为遗漏行,对应当前期),下一次命中是 end_idx+1(若存在)
                    results[i]['miss_span_end_period'] = asc_periods[end_idx]
                    results[i]['miss_span_length'] = miss_run_len[i]

        # 为每期增加"与其他期第7码对比命中"统计
        # 构建第7码到索引列表的映射,加速查找
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
            # 在 matched_indices 中二分可更快,这里 n<=500 直接线性找邻近即可
            for j in matched_indices:
                if j < i:
                    prev_idx = j
                elif j > i and next_idx == -1:
                    next_idx = j
                    break
            # 左侧遗漏期数:若存在前命中,则 i - prev_idx - 1,否则 i - 0(从开头到 i-1 全是遗漏)
            left_gap = (i - prev_idx - 1) if prev_idx != -1 else i
            # 右侧遗漏期数:若存在后命中,则 next_idx - i - 1,否则 n - 1 - i
            right_gap = (next_idx - i - 1) if next_idx != -1 else (n - 1 - i)
            results[i]['around_prev_hit_period'] = asc_periods[prev_idx] if prev_idx != -1 else None
            results[i]['around_next_hit_period'] = asc_periods[next_idx] if next_idx != -1 else None
            results[i]['around_left_omission'] = left_gap
            results[i]['around_right_omission'] = right_gap
            results[i]['around_total_omission'] = left_gap + right_gap

        # 计算命中率
        total_analysis = len(results)
        hit_rate = (total_hit_count / total_analysis * 100) if total_analysis > 0 else 0

        # 按期数从大到小排序(最新期数在前)
        results.sort(key=lambda x: x['current_period'], reverse=True)

        # CSV 导出(导出全部,不分页)
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
