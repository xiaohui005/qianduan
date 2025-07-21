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
        "latest_period": base_period
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

if __name__ == "__main__":
    import uvicorn
    import config
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT) 