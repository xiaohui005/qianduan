from fastapi import FastAPI, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
import collect
import config
from typing import Optional
from collections import defaultdict, Counter
import subprocess
import analysis  # 新增导入
from fastapi import Request
from fastapi.encoders import jsonable_encoder

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"msg": "彩票分析系统后端已启动"}

# 上传和分析接口示例
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    # 这里只做简单统计，实际可扩展
    result = {
        "行数": len(df),
        "列数": len(df.columns),
        "列名": list(df.columns)
    }
    return JSONResponse(content=result)

@app.get("/collect")
def collect_api(type: str = None):
    urls = config.COLLECT_URLS
    result = {}
    types = [type] if type in urls else urls.keys() if not type else []
    for t in types:
        print(f"开始采集: {t}")
        data = collect.fetch_lottery(urls[t], t)
        print(f"采集到{len(data)}条数据: {data[:1]}")
        collect.save_results(data)
        result[t] = f"采集{len(data)}条"
    print(f"采集结果: {result}")
    return result

@app.get("/collect_history")
def collect_history_api(type: str = None, url: str = None):
    urls = config.COLLECT_HISTORY_URLS.copy()
    if url and type in urls:
        urls[type] = url
    result = {}
    types = [type] if type in urls else urls.keys() if not type else []
    for t in types:
        print(f"开始采集历史: {t}")
        data = collect.fetch_lottery(urls[t], t, check_max_period=False)
        print(f"采集到{len(data)}条历史数据: {data[:1]}")
        collect.save_results(data)
        result[t] = f"采集{len(data)}条历史"
    print(f"历史采集结果: {result}")
    return result

@app.get("/records")
def get_records(
    lottery_type: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    sql = "SELECT * FROM lottery_result WHERE 1=1"
    params = []
    if lottery_type:
        sql += " AND lottery_type=%s"
        params.append(lottery_type)
    if start_time:
        sql += " AND open_time >= %s"
        params.append(start_time)
    if end_time:
        sql += " AND open_time <= %s"
        params.append(end_time)
    if period:
        sql += " AND period=%s"
        params.append(period)
    sql_count = f"SELECT COUNT(*) as total FROM ({sql}) t"
    cursor.execute(sql_count, params)
    total = cursor.fetchone()['total']
    sql += " ORDER BY open_time DESC, period DESC LIMIT %s OFFSET %s"
    params += [page_size, (page-1)*page_size]
    cursor.execute(sql, params)
    records = cursor.fetchall()
    cursor.close()
    conn.close()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "records": records
    }

@app.get("/recommend")
def recommend_api(lottery_type: str = Query('am')):
    print(f"收到推荐请求，彩种: {lottery_type}")
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    # 查找最新的0或5结尾期号
    sql_base = "SELECT period FROM lottery_result WHERE RIGHT(period,1) IN ('0','5') AND lottery_type=%s ORDER BY period DESC LIMIT 1"
    cursor.execute(sql_base, (lottery_type,))
    row = cursor.fetchone()
    if not row:
        return {"recommend": [], "latest_period": None}
    base_period = row['period']
    sql = "SELECT period, numbers FROM lottery_result WHERE period <= %s AND lottery_type=%s ORDER BY period DESC LIMIT 50"
    print(f"查询历史数据SQL: {sql} with params ({base_period}, {lottery_type})")
    cursor.execute(sql, (base_period, lottery_type))
    rows = cursor.fetchall()
    pos_freq = [Counter() for _ in range(7)]
    pos_last_idx = [{} for _ in range(7)]
    for idx, row in enumerate(rows):
        nums = row['numbers'].split(',')
        for i in range(min(7, len(nums))):
            n = nums[i]
            pos_freq[i][n] += 1
            if n not in pos_last_idx[i]:
                pos_last_idx[i][n] = idx
    pos_avg_gap = [{} for _ in range(7)]
    for i in range(7):
        for n in pos_freq[i]:
            count = pos_freq[i][n]
            last_idx = pos_last_idx[i][n]
            avg_gap = (50 - last_idx) / count if count else 999
            pos_avg_gap[i][n] = avg_gap
    recommend = []
    for i in range(7):
        candidates = [n for n in pos_avg_gap[i] if 4 <= pos_avg_gap[i][n] <= 6]
        candidates.sort(key=lambda n: pos_last_idx[i][n])
        if len(candidates) < 8:
            freq_sorted = [n for n, _ in pos_freq[i].most_common() if n not in candidates]
            candidates += freq_sorted[:8-len(candidates)]
        sorted_candidates = sorted(candidates[:8], key=int)
        recommend.append(sorted_candidates)
    # 保存推荐结果到 recommend_result 表
    for i, nums in enumerate(recommend):
        cursor.execute(
            """
            INSERT INTO recommend_result (lottery_type, period, position, numbers, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE numbers=VALUES(numbers), created_at=NOW()
            """,
            (lottery_type, base_period, i+1, ','.join(nums))
        )
    conn.commit()
    cursor.close()
    conn.close()
    return {
        "recommend": recommend,
        "latest_period": base_period,
        "used_period": base_period
    }

@app.get("/tens_analysis")
def tens_analysis_api(lottery_type: str = Query('am'), year: str = Query(None)):
    tens_cols = ["00","01","02","03","04","11","12","13","14","22","23","24","33","34","44"]
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT period, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC", (lottery_type,))
    rows = cursor.fetchall()
    # 按年份筛选
    if year:
        rows = [row for row in rows if row['period'].startswith(year)]
    result = []
    max_miss = []
    max_miss_period = []
    for pos in range(7):
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
    cursor.close()
    conn.close()
    return {'data': result, 'tens_cols': tens_cols, 'max_miss': max_miss, 'max_miss_period': max_miss_period}

@app.get("/units_analysis")
def units_analysis_api(lottery_type: str = Query('am'), year: str = Query(None)):
    group1 = set(['0','1','2','3','4'])  # 只包含0,1,2,3,4尾
    group2 = set(['5','6','7','8'])      # 只包含5,6,7,8尾，不含9
    not_in1 = {'11','22','33','44'}      # 这些数不算1组命中
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
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
    cursor.close()
    conn.close()
    return {'data': result, 'desc': '1组: 0,1,2,3,4尾（不含11,22,33,44）；2组: 5,6,7,8尾', 'group1': list(group1), 'group2': list(group2), 'max_miss': max_miss, 'cur_miss': cur_miss, 'max_alt_miss': max_alt_miss, 'cur_alt_miss': cur_alt_miss}

@app.get("/interval_analysis")
def interval_analysis_api(lottery_type: str = Query(...), period: str = Query(...)):
    """
    区间分析API，返回指定期号的区间分析结果
    """
    result = analysis.analyze_intervals(lottery_type, period)
    return JSONResponse(content=result)

@app.get("/range_analysis")
def range_analysis_api(
    lottery_type: str = Query('am'),
    pos: int = Query(1, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    year: str = Query(None)
):
    """
    区间分析API，返回每期开奖信息、7个球的区间命中情况（命中为0，未命中为距离上次命中的期数，区间只显示头和尾两个数），每个球的区间只和下一期同位置的球比较。最后一列只显示下一期的第N个球。期号倒序，分页返回。
    header=[期号, 开奖时间, 球1, ..., 球7, 下一期球N]。
    新增返回：每个球每个区间的历史最大遗漏、最大遗漏发生期号、当前遗漏，支持按年份过滤。
    """
    def plus49(n, k):
        v = (n + k - 1) % 49 + 1
        return str(v).zfill(2)
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
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
    cursor.close()
    conn.close()
    return {"header": header, "data": data, "total": total, "page": page, "page_size": page_size, "desc": desc, "years": years, "max_miss": max_miss, "max_miss_period": max_miss_period, "cur_miss": cur_miss, "predict": predict_info, "last_open": last_open}

@app.get("/range_analysis_minus")
def range_analysis_minus_api(
    lottery_type: str = Query('am'),
    pos: int = Query(1, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
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
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
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
    cursor.close()
    conn.close()
    return {"header": header, "data": data, "total": total, "page": page, "page_size": page_size, "desc": desc, "years": years, "max_miss": max_miss, "max_miss_period": max_miss_period, "cur_miss": cur_miss, "predict": predict_info, "last_open": last_open}

@app.get("/plus_minus6_analysis")
def plus_minus6_analysis_api(
    lottery_type: str = Query('am'),
    pos: int = Query(1, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    year: str = Query(None)
):
    """
    每期取前6个号码，分别加减1~6，分为6组，每组12个数。每组用下一期第N位（N=1~7可选）判断是否命中，统计每组的遗漏期数（连续多少期未命中），最大遗漏、当前遗漏。返回每组的号码、命中、遗漏、最大遗漏、当前遗漏。
    """
    def plus49(n, k):
        v = (n + k - 1) % 49 + 1
        return str(v).zfill(2)
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
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
    cursor.close()
    conn.close()
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

@app.get("/each_issue_analysis")
def each_issue_analysis_api(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    取近100期，按期号升序，每一期独立累加miss_count，只有自己命中（后续某一期的第7个号码在本期7个号码中）才定格，否则一直累加到最后一期。
    增加 stop_reason 字段，标识是因为命中（hit）还是到最后一期（end）停止累加。
    支持分页，返回时按期号从大到小排序。
    返回：{total, page, page_size, data: [{period, open_time, numbers, miss_count, stop_reason}]}
    """
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    # 先查出近300期，按期号升序
    cursor.execute(
        "SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT 300",
        (lottery_type,)
    )
    all_rows = cursor.fetchall()[::-1]  # 逆序变为升序
    result = []
    n = len(all_rows)
    for idx in range(n):
        row = all_rows[idx]
        period = row['period']
        open_time = row['open_time'].strftime('%Y-%m-%d') if hasattr(row['open_time'], 'strftime') else str(row['open_time'])
        numbers = row['numbers'].split(',')
        miss_count = 1
        stop_reason = 'end'
        # 从当前期往后找，直到命中或到最后一期
        for j in range(idx+1, n):
            next_row = all_rows[j]
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
    cursor.close()
    conn.close()
    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'data': page_data,
        'current_max_miss': current_max_miss,
        'current_max_miss_period': current_max_miss_period,
        'history_max_miss': history_max_miss,
        'history_max_miss_period': history_max_miss_period
    }

@app.get("/restart")
def restart_api(background_tasks: BackgroundTasks):
    import os
    import time
    import subprocess
    def kill_self():
        time.sleep(1)  # 等待响应返回
        for proc in subprocess.run(['tasklist'], capture_output=True, text=True, encoding='gbk').stdout.splitlines():
            if 'python.exe' in proc and 'main.py' in proc:
                pid = int(proc.split()[1])
                subprocess.run(['taskkill', '/PID', str(pid), '/F'])
        os._exit(0)
    background_tasks.add_task(kill_self)
    return {"msg": "后端即将重启，请稍后手动刷新页面"}

# --- 关注点 places 表的增删改查 API ---
@app.get("/api/places")
def get_places():
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM places ORDER BY created_at DESC, id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonable_encoder(rows)

@app.post("/api/places")
def add_place(req: Request):
    import asyncio
    async def inner():
        data = await req.json()
        name = data.get("name")
        description = data.get("description")
        conn = collect.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO places (name, description) VALUES (%s, %s)",
            (name, description)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True}
    return asyncio.run(inner())

@app.put("/api/places/{place_id}")
def update_place(place_id: int, req: Request):
    import asyncio
    async def inner():
        data = await req.json()
        name = data.get("name")
        description = data.get("description")
        conn = collect.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE places SET name=%s, description=%s WHERE id=%s",
            (name, description, place_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True}
    return asyncio.run(inner())

@app.delete("/api/places/{place_id}")
def delete_place(place_id: int):
    conn = collect.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM places WHERE id=%s", (place_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True}
# --- END ---

# --- 投注记录 bets 表的增删改查 API ---

@app.get("/api/bets")
def get_bets(place_id: int = None):
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    if place_id:
        cursor.execute("SELECT b.*, p.name as place_name FROM bets b LEFT JOIN places p ON b.place_id=p.id WHERE b.place_id=%s ORDER BY b.created_at DESC, b.id DESC", (place_id,))
    else:
        cursor.execute("SELECT b.*, p.name as place_name FROM bets b LEFT JOIN places p ON b.place_id=p.id ORDER BY b.created_at DESC, b.id DESC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonable_encoder(rows)

@app.post("/api/bets")
def add_bet(req: Request):
    import asyncio
    async def inner():
        data = await req.json()
        place_id = data.get("place_id")
        qishu = data.get("qishu")
        bet_amount = data.get("bet_amount")
        win_amount = data.get("win_amount")
        is_correct = data.get("is_correct")
        conn = collect.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO bets (place_id, qishu, bet_amount, win_amount, is_correct) VALUES (%s, %s, %s, %s, %s)",
            (place_id, qishu, bet_amount, win_amount, is_correct if is_correct != '' else None)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True}
    return asyncio.run(inner())

@app.put("/api/bets/{bet_id}")
def update_bet(bet_id: int, req: Request):
    import asyncio
    async def inner():
        data = await req.json()
        place_id = data.get("place_id")
        qishu = data.get("qishu")
        bet_amount = data.get("bet_amount")
        win_amount = data.get("win_amount")
        is_correct = data.get("is_correct")
        conn = collect.get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE bets SET place_id=%s, qishu=%s, bet_amount=%s, win_amount=%s, is_correct=%s WHERE id=%s",
            (place_id, qishu, bet_amount, win_amount, is_correct if is_correct != '' else None, bet_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return {"success": True}
    return asyncio.run(inner())

@app.delete("/api/bets/{bet_id}")
def delete_bet(bet_id: int):
    conn = collect.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bets WHERE id=%s", (bet_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"success": True}
# --- END ---

if __name__ == "__main__":
    import uvicorn
    import config
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT) 