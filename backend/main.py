from fastapi import FastAPI, UploadFile, File, Form, Query
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

@app.get("/restart")
def restart_api():
    try:
        # 查找并结束旧进程
        for proc in subprocess.run(['tasklist'], capture_output=True, text=True, encoding='gbk').stdout.splitlines():
            if 'python.exe' in proc and 'main.py' in proc:
                pid = int(proc.split()[1])
                subprocess.run(['taskkill', '/PID', str(pid), '/F'])
        # 启动新进程
        subprocess.Popen(['python', 'main.py'])
        return {"msg": "后端正在重启..."}
    except Exception as e:
        return {"msg": "重启失败", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    import config
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT) 