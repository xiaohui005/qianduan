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
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:3000", 
        "http://localhost:8000",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "*"  # 开发环境允许所有来源
    ],
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
        
        # 检查是否有0或5结尾的期数，如果有则自动生成推荐号码
        if data:
            new_periods = [item['period'] for item in data]
            target_periods = [period for period in new_periods if period.endswith(('0', '5'))]
            
            if target_periods:
                print(f"发现0或5结尾的期数: {target_periods}，自动生成推荐号码")
                # 自动生成推荐8码
                try:
                    recommend_result = recommend_api(t)
                    if recommend_result.get('recommend'):
                        print(f"推荐8码生成成功，基于期号: {recommend_result.get('latest_period')}")
                except Exception as e:
                    print(f"生成推荐8码时出错: {e}")
                
                # 自动生成推荐16码
                try:
                    recommend16_result = recommend16_api(t)
                    if recommend16_result.get('recommend16'):
                        print(f"推荐16码生成成功，基于期号: {recommend16_result.get('latest_period')}")
                except Exception as e:
                    print(f"生成推荐16码时出错: {e}")
                
                result[t] = f"采集{len(data)}条，自动生成推荐号码"
            else:
                result[t] = f"采集{len(data)}条"
        else:
            result[t] = "无新数据"
    print(f"采集结果: {result}")
    return result

@app.get("/collect_wenlongzhu")
def collect_wenlongzhu_api(type: str = None):
    """
    文龙珠源头采集API
    澳门: https://hkamkl.wenlongzhu.com:2053/Macau-j-l/#dh
    香港: https://hkamkl.wenlongzhu.com:2053/hk-j-l/#dh
    """
    wenlongzhu_urls = {
        'am': 'https://hkamkl.wenlongzhu.com:2053/Macau-j-l/#dh',
        'hk': 'https://hkamkl.wenlongzhu.com:2053/hk-j-l/#dh'
    }
    
    result = {}
    types = [type] if type in wenlongzhu_urls else wenlongzhu_urls.keys() if not type else []
    
    for t in types:
        print(f"开始采集文龙珠源头: {t}")
        try:
            # 使用文龙珠URL进行采集
            data = collect.fetch_lottery(wenlongzhu_urls[t], t)
            print(f"文龙珠采集到{len(data)}条数据: {data[:1]}")
            collect.save_results(data)
            
            # 检查是否有0或5结尾的期数，如果有则自动生成推荐号码
            if data:
                new_periods = [item['period'] for item in data]
                target_periods = [period for period in new_periods if period.endswith(('0', '5'))]
                
                if target_periods:
                    print(f"发现0或5结尾的期数: {target_periods}，自动生成推荐号码")
                    # 自动生成推荐8码
                    try:
                        recommend_result = recommend_api(t)
                        if recommend_result.get('recommend'):
                            print(f"推荐8码生成成功，基于期号: {recommend_result.get('latest_period')}")
                    except Exception as e:
                        print(f"生成推荐8码时出错: {e}")
                    
                    # 自动生成推荐16码
                    try:
                        recommend16_result = recommend16_api(t)
                        if recommend16_result.get('recommend16'):
                            print(f"推荐16码生成成功，基于期号: {recommend16_result.get('latest_period')}")
                    except Exception as e:
                        print(f"生成推荐16码时出错: {e}")
                    
                    result[t] = f"文龙珠采集{len(data)}条，自动生成推荐号码"
                else:
                    result[t] = f"文龙珠采集{len(data)}条"
            else:
                result[t] = "文龙珠无新数据"
        except Exception as e:
            print(f"文龙珠采集{t}失败: {e}")
            result[t] = f"文龙珠采集失败: {str(e)}"
    
    print(f"文龙珠采集结果: {result}")
    return result


@app.get("/records")
def get_records(
    lottery_type: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000)
):
    """
    获取开奖记录，支持分页，最大page_size=10000。
    """
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

@app.get("/recommend16")
def recommend16_api(lottery_type: str = Query('am')):
    try:
        print(f"收到推荐16码请求，彩种: {lottery_type}")
        
        # 检查数据库连接
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 检查recommend16_result表是否存在
        try:
            cursor.execute("SHOW TABLES LIKE 'recommend16_result'")
            if not cursor.fetchone():
                print("recommend16_result表不存在，尝试创建...")
                # 这里可以调用创建表的逻辑
                return {"error": "recommend16_result表不存在，请先创建表", "recommend16": [], "latest_period": None}
        except Exception as e:
            print(f"检查表存在性时出错: {e}")
            return {"error": f"数据库错误: {str(e)}", "recommend16": [], "latest_period": None}
        
        # 查找最新的0或5结尾期号
        sql_base = "SELECT period FROM lottery_result WHERE RIGHT(period,1) IN ('0','5') AND lottery_type=%s ORDER BY period DESC LIMIT 1"
        cursor.execute(sql_base, (lottery_type,))
        row = cursor.fetchone()
        
        if not row:
            print("没有找到0或5结尾的期号")
            return {"recommend16": [], "latest_period": None, "message": "没有找到0或5结尾的期号"}
        
        base_period = row['period']
        print(f"找到基础期号: {base_period}")
        
        # 查询历史数据
        sql = "SELECT period, numbers FROM lottery_result WHERE period <= %s AND lottery_type=%s ORDER BY period DESC LIMIT 100"
        print(f"查询历史数据SQL: {sql} with params ({base_period}, {lottery_type})")
        cursor.execute(sql, (base_period, lottery_type))
        rows = cursor.fetchall()
        
        if not rows:
            print("没有找到历史数据")
            return {"recommend16": [], "latest_period": base_period, "message": "没有找到历史数据"}
        
        print(f"找到 {len(rows)} 条历史数据")
        
        # 计算位置频率和最后出现索引
        pos_freq = [Counter() for _ in range(7)]
        pos_last_idx = [{} for _ in range(7)]
        
        for idx, row in enumerate(rows):
            try:
                nums = row['numbers'].split(',')
                for i in range(min(7, len(nums))):
                    n = nums[i]
                    pos_freq[i][n] += 1
                    if n not in pos_last_idx[i]:
                        pos_last_idx[i][n] = idx
            except Exception as e:
                print(f"处理行数据时出错: {e}, row: {row}")
                continue
        
        # 计算平均间隔
        pos_avg_gap = [{} for _ in range(7)]
        for i in range(7):
            for n in pos_freq[i]:
                count = pos_freq[i][n]
                last_idx = pos_last_idx[i][n]
                avg_gap = (100 - last_idx) / count if count else 999
                pos_avg_gap[i][n] = avg_gap
        
        # 生成推荐16码
        recommend16 = []
        for i in range(7):
            candidates = [n for n in pos_avg_gap[i] if 4 <= pos_avg_gap[i][n] <= 6]
            candidates.sort(key=lambda n: pos_last_idx[i][n])
            
            if len(candidates) < 16:
                freq_sorted = [n for n, _ in pos_freq[i].most_common() if n not in candidates]
                candidates += freq_sorted[:16-len(candidates)]
            
            sorted_candidates = sorted(candidates[:16], key=int)
            recommend16.append(sorted_candidates)
        
        print(f"生成推荐16码完成，位置数量: {len(recommend16)}")
        
        # 保存推荐结果到 recommend16_result 表
        try:
            for i, nums in enumerate(recommend16):
                cursor.execute(
                    """
                    INSERT INTO recommend16_result (lottery_type, period, position, numbers, created_at)
                    VALUES (%s, %s, %s, %s, NOW())
                    ON DUPLICATE KEY UPDATE numbers=VALUES(numbers), created_at=NOW()
                    """,
                    (lottery_type, base_period, i+1, ','.join(nums))
                )
            conn.commit()
            print("推荐结果已保存到数据库")
        except Exception as e:
            print(f"保存推荐结果时出错: {e}")
            conn.rollback()
            # 即使保存失败，也返回推荐结果
        
        cursor.close()
        conn.close()
        
        return {
            "recommend16": recommend16,
            "latest_period": base_period,
            "used_period": base_period,
            "message": "推荐16码生成成功"
        }
        
    except Exception as e:
        print(f"推荐16码API出错: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"服务器内部错误: {str(e)}", "recommend16": [], "latest_period": None}

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
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
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
        'history_max_miss_period': history_max_miss_period,
        'unit_group': unit_group  # 返回当前选择的分组，便于前端显示
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

# --- 关注点登记结果 place_results 表的增删改查 API ---

@app.get("/api/place_results")
def get_place_results(
    place_id: Optional[str] = Query(None),
    qishu: Optional[str] = Query(None),
    is_correct: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=1000)
):
    """获取关注点登记结果列表"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        sql = """
        SELECT pr.*, p.name as place_name 
        FROM place_results pr 
        LEFT JOIN places p ON pr.place_id = p.id 
        WHERE 1=1
        """
        params = []
        
        if place_id and place_id.strip():
            try:
                place_id_int = int(place_id)
                sql += " AND pr.place_id = %s"
                params.append(place_id_int)
            except ValueError:
                pass
        if qishu and qishu.strip():
            sql += " AND pr.qishu LIKE %s"
            params.append(f"%{qishu.strip()}%")
        if is_correct and is_correct.strip():
            if is_correct == 'null':
                # 查询未判断的记录
                sql += " AND pr.is_correct IS NULL"
            else:
                try:
                    is_correct_int = int(is_correct)
                    sql += " AND pr.is_correct = %s"
                    params.append(is_correct_int)
                except ValueError:
                    pass
        if start_date and start_date.strip():
            sql += " AND DATE(pr.created_at) >= %s"
            params.append(start_date.strip())
        if end_date and end_date.strip():
            sql += " AND DATE(pr.created_at) <= %s"
            params.append(end_date.strip())
            
        sql += " ORDER BY pr.created_at DESC"
        
        # 获取总数
        count_sql = f"SELECT COUNT(*) as total FROM ({sql}) t"
        cursor.execute(count_sql, params)
        total = cursor.fetchone()['total']
        
        # 分页
        offset = (page - 1) * page_size
        sql += " LIMIT %s OFFSET %s"
        params.extend([page_size, offset])
        
        cursor.execute(sql, params)
        results = cursor.fetchall()
        
        return {
            "success": True,
            "data": results,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    except Exception as e:
        return {"success": False, "message": f"查询失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/place_results")
def add_place_result(req: Request):
    """添加关注点登记结果"""
    import asyncio
    async def inner():
        try:
            data = await req.json()
            place_id = data.get('place_id')
            qishu = data.get('qishu')
            is_correct = data.get('is_correct')
            
            if not place_id or not qishu:
                return {"success": False, "message": "关注点ID和期数不能为空"}
            
            conn = collect.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "INSERT INTO place_results (place_id, qishu, is_correct) VALUES (%s, %s, %s)",
                    (place_id, qishu, is_correct)
                )
                conn.commit()
                return {"success": True, "message": "添加成功"}
            except Exception as e:
                conn.rollback()
                return {"success": False, "message": f"添加失败: {str(e)}"}
            finally:
                cursor.close()
                conn.close()
        except Exception as e:
            return {"success": False, "message": f"请求解析失败: {str(e)}"}
    
    return asyncio.run(inner())

@app.put("/api/place_results/{result_id}")
def update_place_result(result_id: int, req: Request):
    """更新关注点登记结果"""
    import asyncio
    async def inner():
        try:
            data = await req.json()
            place_id = data.get('place_id')
            qishu = data.get('qishu')
            is_correct = data.get('is_correct')
            
            if not place_id or not qishu:
                return {"success": False, "message": "关注点ID和期数不能为空"}
            
            conn = collect.get_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    "UPDATE place_results SET place_id = %s, qishu = %s, is_correct = %s WHERE id = %s",
                    (place_id, qishu, is_correct, result_id)
                )
                conn.commit()
                return {"success": True, "message": "更新成功"}
            except Exception as e:
                conn.rollback()
                return {"success": False, "message": f"更新失败: {str(e)}"}
            finally:
                cursor.close()
                conn.close()
        except Exception as e:
            return {"success": False, "message": f"请求解析失败: {str(e)}"}
    
    return asyncio.run(inner())

@app.delete("/api/place_results/{result_id}")
def delete_place_result(result_id: int):
    """删除关注点登记结果"""
    conn = collect.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM place_results WHERE id = %s", (result_id,))
        conn.commit()
        return {"success": True, "message": "删除成功"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"删除失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/place_analysis")
def get_place_analysis():
    """获取关注点分析数据"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 获取所有关注点及其统计信息
        sql = """
        SELECT 
            p.id as place_id,
            p.name as place_name,
            p.description as place_description,
            COUNT(pr.id) as total_records,
            SUM(CASE WHEN pr.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
            SUM(CASE WHEN pr.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count,
            SUM(CASE WHEN pr.is_correct IS NULL THEN 1 ELSE 0 END) as unjudged_count,
            MIN(pr.created_at) as first_record,
            MAX(pr.created_at) as last_record
        FROM places p
        LEFT JOIN place_results pr ON p.id = pr.place_id
        GROUP BY p.id, p.name, p.description
        ORDER BY p.id
        """
        cursor.execute(sql)
        places = cursor.fetchall()
        
        # 为每个关注点计算遗漏和连中统计
        for place in places:
            place_id = place['place_id']
            
            # 获取该关注点的所有记录，按时间排序
            cursor.execute("""
                SELECT id, qishu, is_correct, created_at
                FROM place_results 
                WHERE place_id = %s 
                ORDER BY created_at ASC
            """, (place_id,))
            records = cursor.fetchall()
            
            # 计算遗漏统计
            current_miss = 0
            max_miss = 0
            max_miss_start = None
            max_miss_end = None
            current_miss_start = None
            
            # 计算连中统计
            current_streak = 0
            max_streak = 0
            max_streak_start = None
            max_streak_end = None
            current_streak_start = None
            
            for i, record in enumerate(records):
                if record['is_correct'] == 1:  # 正确
                    # 结束当前遗漏
                    if current_miss > 0:
                        if current_miss > max_miss:
                            max_miss = current_miss
                            max_miss_start = current_miss_start
                            max_miss_end = record['created_at']
                        current_miss = 0
                        current_miss_start = None
                    
                    # 更新连中统计
                    if current_streak == 0:
                        current_streak_start = record['created_at']
                    current_streak += 1
                    
                elif record['is_correct'] == 0:  # 错误
                    # 结束当前连中
                    if current_streak > 0:
                        if current_streak > max_streak:
                            max_streak = current_streak
                            max_streak_start = current_streak_start
                            max_streak_end = record['created_at']
                        current_streak = 0
                        current_streak_start = None
                    
                    # 更新遗漏统计
                    if current_miss == 0:
                        current_miss_start = record['created_at']
                    current_miss += 1
                
                else:  # 未判断
                    # 结束当前遗漏和连中
                    if current_miss > 0:
                        if current_miss > max_miss:
                            max_miss = current_miss
                            max_miss_start = current_miss_start
                            max_miss_end = record['created_at']
                        current_miss = 0
                        current_miss_start = None
                    
                    if current_streak > 0:
                        if current_streak > max_streak:
                            max_streak = current_streak
                            max_streak_start = current_streak_start
                            max_streak_end = record['created_at']
                        current_streak = 0
                        current_streak_start = None
            
            # 处理最后一段
            if current_miss > max_miss:
                max_miss = current_miss
                max_miss_start = current_miss_start
                max_miss_end = None
            
            if current_streak > max_streak:
                max_streak = current_streak
                max_streak_start = current_streak_start
                max_streak_end = None
            
            # 添加到结果中
            place['current_miss'] = current_miss
            place['max_miss'] = max_miss
            place['max_miss_start'] = max_miss_start
            place['max_miss_end'] = max_miss_end
            place['current_streak'] = current_streak
            place['max_streak'] = max_streak
            place['max_streak_start'] = max_streak_start
            place['max_streak_end'] = max_streak_end
            place['records'] = records
        
        return {
            "success": True,
            "data": places
        }
    except Exception as e:
        return {"success": False, "message": f"分析失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

# --- END ---

@app.get("/api/bet_report")
def get_bet_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    place_id: Optional[int] = Query(None)
):
    """获取投注点报表统计数据"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 构建基础查询条件
        where_conditions = []
        params = []
        
        if start_date:
            where_conditions.append("DATE(b.created_at) >= %s")
            params.append(start_date)
        
        if end_date:
            where_conditions.append("DATE(b.created_at) <= %s")
            params.append(end_date)
        
        if place_id:
            where_conditions.append("b.place_id = %s")
            params.append(place_id)
        
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # 1. 总体统计
        overall_sql = f"""
        SELECT 
            COUNT(*) as total_bets,
            SUM(b.bet_amount) as total_bet_amount,
            SUM(b.win_amount) as total_win_amount,
            SUM(b.win_amount - b.bet_amount) as total_profit_loss,
            AVG(b.bet_amount) as avg_bet_amount,
            AVG(b.win_amount) as avg_win_amount,
            AVG(b.win_amount - b.bet_amount) as avg_profit_loss,
            SUM(CASE WHEN b.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
            SUM(CASE WHEN b.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count,
            SUM(CASE WHEN b.is_correct IS NULL THEN 1 ELSE 0 END) as unjudged_count
        FROM bets b
        {where_clause}
        """
        cursor.execute(overall_sql, params)
        overall_stats = cursor.fetchone()
        
        # 调试信息
        print(f"Debug - SQL: {overall_sql}")
        print(f"Debug - Params: {params}")
        print(f"Debug - Overall stats: {overall_stats}")
        
        # 2. 按关注点统计
        place_stats_sql = f"""
        SELECT 
            p.id as place_id,
            p.name as place_name,
            p.description as place_description,
            COUNT(b.id) as bet_count,
            SUM(b.bet_amount) as total_bet_amount,
            SUM(b.win_amount) as total_win_amount,
            SUM(b.win_amount - b.bet_amount) as total_profit_loss,
            AVG(b.bet_amount) as avg_bet_amount,
            AVG(b.win_amount) as avg_win_amount,
            AVG(b.win_amount - b.bet_amount) as avg_profit_loss,
            SUM(CASE WHEN b.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
            SUM(CASE WHEN b.is_correct = 0 THEN 1 ELSE 0 END) as wrong_count,
            SUM(CASE WHEN b.is_correct IS NULL THEN 1 ELSE 0 END) as unjudged_count,
            MIN(b.created_at) as first_bet,
            MAX(b.created_at) as last_bet
        FROM places p
        LEFT JOIN bets b ON p.id = b.place_id
        {where_clause}
        GROUP BY p.id, p.name, p.description
        ORDER BY total_bet_amount DESC
        """
        cursor.execute(place_stats_sql, params)
        place_stats = cursor.fetchall()
        
        # 3. 按时间统计（按月）
        time_stats_sql = f"""
        SELECT 
            DATE_FORMAT(b.created_at, '%Y-%m') as month,
            COUNT(b.id) as bet_count,
            SUM(b.bet_amount) as total_bet_amount,
            SUM(b.win_amount) as total_win_amount,
            SUM(b.win_amount - b.bet_amount) as total_profit_loss,
            AVG(b.bet_amount) as avg_bet_amount,
            AVG(b.win_amount) as avg_win_amount,
            AVG(b.win_amount - b.bet_amount) as avg_profit_loss
        FROM bets b
        {where_clause}
        GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
        ORDER BY month DESC
        """
        cursor.execute(time_stats_sql, params)
        time_stats = cursor.fetchall()
        
        # 4. 按时间统计（按日）
        daily_stats_sql = f"""
        SELECT 
            DATE(b.created_at) as date,
            COUNT(b.id) as bet_count,
            SUM(b.bet_amount) as total_bet_amount,
            SUM(b.win_amount) as total_win_amount,
            SUM(b.win_amount - b.bet_amount) as total_profit_loss
        FROM bets b
        {where_clause}
        GROUP BY DATE(b.created_at)
        ORDER BY date DESC
        LIMIT 30
        """
        cursor.execute(daily_stats_sql, params)
        daily_stats = cursor.fetchall()
        
        # 5. 输赢分布统计
        profit_loss_distribution_sql = f"""
        SELECT 
            CASE 
                WHEN (b.win_amount - b.bet_amount) < -1000 THEN '亏损1000+'
                WHEN (b.win_amount - b.bet_amount) < -500 THEN '亏损500-1000'
                WHEN (b.win_amount - b.bet_amount) < 0 THEN '亏损0-500'
                WHEN (b.win_amount - b.bet_amount) = 0 THEN '持平'
                WHEN (b.win_amount - b.bet_amount) <= 500 THEN '盈利0-500'
                WHEN (b.win_amount - b.bet_amount) <= 1000 THEN '盈利500-1000'
                ELSE '盈利1000+'
            END as profit_loss_range,
            COUNT(*) as count,
            SUM(b.bet_amount) as total_bet_amount,
            SUM(b.win_amount) as total_win_amount,
            SUM(b.win_amount - b.bet_amount) as total_profit_loss
        FROM bets b
        {where_clause}
        GROUP BY profit_loss_range
        ORDER BY 
            CASE profit_loss_range
                WHEN '亏损1000+' THEN 1
                WHEN '亏损500-1000' THEN 2
                WHEN '亏损0-500' THEN 3
                WHEN '持平' THEN 4
                WHEN '盈利0-500' THEN 5
                WHEN '盈利500-1000' THEN 6
                WHEN '盈利1000+' THEN 7
            END
        """
        cursor.execute(profit_loss_distribution_sql, params)
        profit_loss_distribution = cursor.fetchall()
        
        return {
            "success": True,
            "data": {
                "overall_stats": overall_stats,
                "place_stats": place_stats,
                "time_stats": time_stats,
                "daily_stats": daily_stats,
                "profit_loss_distribution": profit_loss_distribution
            }
        }
    except Exception as e:
        return {"success": False, "message": f"报表生成失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/debug/bets")
def debug_bets():
    """调试API：查看bets表数据"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 查看bets表总数
        cursor.execute("SELECT COUNT(*) as total FROM bets")
        total_count = cursor.fetchone()['total']
        
        # 查看前5条记录
        cursor.execute("SELECT * FROM bets ORDER BY id DESC LIMIT 5")
        recent_bets = cursor.fetchall()
        
        # 查看bets表结构
        cursor.execute("DESCRIBE bets")
        table_structure = cursor.fetchall()
        
        return {
            "success": True,
            "total_count": total_count,
            "recent_bets": recent_bets,
            "table_structure": table_structure
        }
    except Exception as e:
        return {"success": False, "message": f"调试失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

# --- 关注号码管理 favorite_numbers 表的增删改查 API ---

@app.get("/api/favorite_numbers")
def get_favorite_numbers(position: int = 7, lottery_type: str = 'am'):
    """获取所有关注号码组"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM favorite_numbers ORDER BY created_at DESC")
        rows = cursor.fetchall()
        
        # 获取最新开奖记录用于计算遗漏
        cursor.execute("SELECT numbers FROM lottery_result WHERE lottery_type=%s ORDER BY open_time DESC LIMIT 1", (lottery_type,))
        latest_record = cursor.fetchone()
        
        # 为每个关注号码组计算遗漏
        for row in rows:
            current_miss = 0
            max_miss = 0
            
            if latest_record:
                numbers = [int(n.strip()) for n in row['numbers'].split(',') if n.strip().isdigit()]
                
                # 获取所有历史开奖记录用于计算遗漏（按期数正序排列）
                cursor.execute("SELECT numbers, open_time, period FROM lottery_result WHERE lottery_type=%s ORDER BY period ASC", (lottery_type,))
                all_records = cursor.fetchall()
                
                if all_records:
                    # 计算当前遗漏和最大遗漏
                    current_miss = 0
                    max_miss = 0
                    temp_miss = 0
                    
                    # 按期数从旧到新遍历
                    for record in all_records:
                        latest_numbers = [int(n) for n in record['numbers'].split(',')]
                        # 检查指定位置的号码（position-1是因为索引从0开始）
                        target_number = latest_numbers[position-1] if len(latest_numbers) > position-1 else None
                        
                        # 检查关注号码中是否包含指定位置的号码
                        hit = target_number in numbers if target_number is not None else False
                        
                        if not hit:
                            temp_miss += 1
                            max_miss = max(max_miss, temp_miss)
                        else:
                            temp_miss = 0
                    
                    current_miss = temp_miss
            
            row['current_miss'] = current_miss
            row['max_miss'] = max_miss
        
        return {"success": True, "data": rows}
    except Exception as e:
        return {"success": False, "message": f"获取关注号码失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

@app.post("/api/favorite_numbers")
def add_favorite_numbers(req: Request):
    """添加关注号码组"""
    import asyncio
    async def inner():
        data = await req.json()
        numbers = data.get("numbers")
        name = data.get("name", "")
        
        if not numbers:
            return {"success": False, "message": "关注号码不能为空"}
        
        conn = collect.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO favorite_numbers (numbers, name) VALUES (%s, %s)",
                (numbers, name)
            )
            conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": f"添加失败: {str(e)}"}
        finally:
            cursor.close()
            conn.close()
    return asyncio.run(inner())

@app.put("/api/favorite_numbers/{number_id}")
def update_favorite_numbers(number_id: int, req: Request):
    """更新关注号码组"""
    import asyncio
    async def inner():
        data = await req.json()
        numbers = data.get("numbers")
        name = data.get("name", "")
        
        if not numbers:
            return {"success": False, "message": "关注号码不能为空"}
        
        conn = collect.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(
                "UPDATE favorite_numbers SET numbers=%s, name=%s WHERE id=%s",
                (numbers, name, number_id)
            )
            conn.commit()
            return {"success": True}
        except Exception as e:
            return {"success": False, "message": f"更新失败: {str(e)}"}
        finally:
            cursor.close()
            conn.close()
    return asyncio.run(inner())

@app.delete("/api/favorite_numbers/{number_id}")
def delete_favorite_numbers(number_id: int):
    """删除关注号码组"""
    conn = collect.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM favorite_numbers WHERE id=%s", (number_id,))
        conn.commit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"删除失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

@app.get("/api/favorite_numbers/{number_id}/analysis")
def get_favorite_numbers_analysis(number_id: int, lottery_type: str = 'am', position: int = 7):
    """获取关注号码组的中奖分析"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # 获取关注号码组信息
        cursor.execute("SELECT * FROM favorite_numbers WHERE id=%s", (number_id,))
        favorite_group = cursor.fetchone()
        if not favorite_group:
            return {"success": False, "message": "关注号码组不存在"}
        
        numbers = favorite_group['numbers'].split(',')
        numbers = [int(n.strip()) for n in numbers if n.strip().isdigit()]
        
        if not numbers:
            return {"success": False, "message": "关注号码格式错误"}
        
        # 获取指定彩种的所有开奖记录，按时间排序
        cursor.execute("""
            SELECT lottery_type, period, open_time, numbers 
            FROM lottery_result 
            WHERE lottery_type = %s
            ORDER BY open_time DESC
        """, (lottery_type,))
        all_records = cursor.fetchall()
        
        analysis_results = []
        miss_streaks = []  # 遗漏统计
        hit_streaks = []   # 连中统计
        current_miss = 0
        max_miss = 0
        current_streak = 0
        max_streak = 0
        total_hits = 0
        total_checks = 0
        
        # 按位置统计遗漏和连中
        position_stats = {i: {'miss': 0, 'hits': 0, 'max_miss': 0, 'max_streak': 0, 'current_miss': 0, 'current_streak': 0} for i in range(1, 8)}
        
        # 先获取最新一期的开奖结果
        latest_record = all_records[0] if all_records else None
        latest_open_numbers = []
        latest_hit = False
        
        if latest_record:
            latest_open_numbers = [int(n.strip()) for n in latest_record['numbers'].split(',') if n.strip().isdigit()]
            if len(latest_open_numbers) >= 7:
                target_pos = position - 1  # 转换为0基索引
                latest_hit = target_pos < len(latest_open_numbers) and latest_open_numbers[target_pos] in numbers
        
        # 遍历所有记录计算遗漏和连中
        for i, record in enumerate(all_records):
            # 解析开奖号码
            open_numbers = [int(n.strip()) for n in record['numbers'].split(',') if n.strip().isdigit()]
            if len(open_numbers) < 7:
                continue
            
            # 检查关注号码在指定位置的中奖情况
            hits = []
            hit_positions = []
            target_pos = position - 1  # 转换为0基索引
            
            if target_pos < len(open_numbers) and open_numbers[target_pos] in numbers:
                hits.append(open_numbers[target_pos])
                hit_positions.append(position)
                # 更新位置统计
                position_stats[position]['hits'] += 1
                if position_stats[position]['current_miss'] > 0:
                    if position_stats[position]['current_miss'] > position_stats[position]['max_miss']:
                        position_stats[position]['max_miss'] = position_stats[position]['current_miss']
                    position_stats[position]['current_miss'] = 0
                position_stats[position]['current_streak'] += 1
            else:
                # 更新位置统计
                position_stats[position]['miss'] += 1
                if position_stats[position]['current_streak'] > 0:
                    if position_stats[position]['current_streak'] > position_stats[position]['max_streak']:
                        position_stats[position]['max_streak'] = position_stats[position]['current_streak']
                    position_stats[position]['current_streak'] = 0
                position_stats[position]['current_miss'] += 1
            
            # 计算整体遗漏和连中
            if hits:
                # 有中奖
                if current_miss > 0:
                    miss_streaks.append(current_miss)
                    if current_miss > max_miss:
                        max_miss = current_miss
                    current_miss = 0
                
                current_streak += 1
                total_hits += 1
            else:
                # 没有中奖
                if current_streak > 0:
                    hit_streaks.append(current_streak)
                    if current_streak > max_streak:
                        max_streak = current_streak
                    current_streak = 0
                
                current_miss += 1
            
            total_checks += 1
            
            # 计算该期的遗漏和连中（从最新一期开始往前计算到该期）
            current_miss_for_record = 0
            current_streak_for_record = 0
            
            # 从最新一期开始往前计算到该期
            for j in range(i + 1):
                calc_record = all_records[j]
                calc_numbers = [int(n.strip()) for n in calc_record['numbers'].split(',') if n.strip().isdigit()]
                if len(calc_numbers) >= 7:
                    calc_target_pos = position - 1
                    if calc_target_pos < len(calc_numbers) and calc_numbers[calc_target_pos] in numbers:
                        # 中奖了，重置遗漏，连中+1
                        if current_streak_for_record == 0:
                            current_streak_for_record = 1
                        else:
                            current_streak_for_record += 1
                        current_miss_for_record = 0
                    else:
                        # 未中奖，遗漏+1，重置连中
                        current_miss_for_record += 1
                        current_streak_for_record = 0
            
            analysis_results.append({
                'period': record['period'],
                'lottery_type': record['lottery_type'],
                'open_time': record['open_time'],
                'open_numbers': open_numbers[:7],
                'hits': hits,
                'hit_positions': hit_positions,
                'is_hit': len(hits) > 0,
                'current_miss': current_miss_for_record,
                'current_streak': current_streak_for_record
            })
        
        # 计算历史遗漏和连中（从最新一期开始往前累加）
        current_miss = 0
        current_streak = 0
        
        # 从最新一期开始往前累加
        for i in range(len(all_records)):
            record = all_records[i]
            open_numbers = [int(n.strip()) for n in record['numbers'].split(',') if n.strip().isdigit()]
            if len(open_numbers) >= 7:
                target_pos = position - 1
                if target_pos < len(open_numbers) and open_numbers[target_pos] in numbers:
                    # 中奖了，重置遗漏，连中+1
                    if current_streak == 0:
                        current_streak = 1
                    else:
                        current_streak += 1
                    current_miss = 0
                else:
                    # 未中奖，遗漏+1，重置连中
                    current_miss += 1
                    current_streak = 0
        
        # 处理位置统计的最后一段
        for pos in range(1, 8):
            if pos == position:  # 只更新指定位置
                position_stats[pos]['current_miss'] = current_miss
                position_stats[pos]['current_streak'] = current_streak
        
        # 统计遗漏和连中分布
        miss_distribution = {}
        for miss in miss_streaks:
            miss_distribution[miss] = miss_distribution.get(miss, 0) + 1
        
        hit_distribution = {}
        for hit in hit_streaks:
            hit_distribution[hit] = hit_distribution.get(hit, 0) + 1
        
        return {
            "success": True,
            "data": {
                "favorite_group": favorite_group,
                "numbers": numbers,
                "analysis": analysis_results,
                "position_stats": position_stats,
                "stats": {
                    "total_checks": total_checks,
                    "total_hits": total_hits,
                    "hit_rate": (total_hits / total_checks * 100) if total_checks > 0 else 0,
                    "current_miss": current_miss,
                    "max_miss": max_miss,
                    "current_streak": current_streak,
                    "max_streak": max_streak,
                    "miss_streaks": miss_streaks,
                    "hit_streaks": hit_streaks,
                    "miss_distribution": miss_distribution,
                    "hit_distribution": hit_distribution
                }
            }
        }
    except Exception as e:
        return {"success": False, "message": f"分析失败: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

@app.get("/color_analysis")
def color_analysis_api(lottery_type: str = Query('am')):
    """
    波色分析API
    根据当前期前6个号码的第2位波色，预测下一期第7位号码的波色
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
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
    finally:
        cursor.close()
        conn.close()

# --- 推荐8码命中情况分析相关API ---

@app.get("/api/recommend_history")
def get_recommend_history(lottery_type: str = Query('am')):
    """
    获取推荐8码历史记录，按期数分组
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 查询所有推荐期数
        sql = """
        SELECT DISTINCT period, created_at 
        FROM recommend_result 
        WHERE lottery_type = %s 
        ORDER BY period DESC
        """
        cursor.execute(sql, (lottery_type,))
        periods = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": periods
        }
        
    except Exception as e:
        return {"success": False, "message": f"获取推荐历史失败: {str(e)}"}

@app.get("/api/recommend_by_period")
def get_recommend_by_period(lottery_type: str = Query('am'), period: str = Query(...)):
    """
    获取指定期数的推荐8码数据
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 查询指定期数的推荐数据
        sql = """
        SELECT position, numbers 
        FROM recommend_result 
        WHERE lottery_type = %s AND period = %s 
        ORDER BY position
        """
        cursor.execute(sql, (lottery_type, period))
        positions = cursor.fetchall()
        
        if not positions:
            return {"success": False, "message": f"未找到期数{period}的推荐数据"}
        
        # 构造推荐号码数组
        recommend_numbers = [""] * 7  # 7个位置
        for pos in positions:
            position = pos['position'] - 1  # 转换为0-6索引
            if 0 <= position < 7:
                recommend_numbers[position] = pos['numbers'].split(',')
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "period": period,
                "lottery_type": lottery_type,
                "recommend_numbers": recommend_numbers,
                "positions": positions
            }
        }
        
    except Exception as e:
        return {"success": False, "message": f"获取推荐数据失败: {str(e)}"}

@app.get("/api/recommend_stats")
def get_recommend_stats(lottery_type: str = Query('am')):
    """
    获取推荐8码统计信息
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 统计推荐期数数量
        sql_count = "SELECT COUNT(DISTINCT period) as total_periods FROM recommend_result WHERE lottery_type = %s"
        cursor.execute(sql_count, (lottery_type,))
        count_result = cursor.fetchone()
        total_periods = count_result['total_periods'] if count_result else 0
        
        # 获取最新推荐期数
        sql_latest = "SELECT MAX(period) as latest_period FROM recommend_result WHERE lottery_type = %s"
        cursor.execute(sql_latest, (lottery_type,))
        latest_result = cursor.fetchone()
        latest_period = latest_result['latest_period'] if latest_result else None
        
        # 获取最早推荐期数
        sql_earliest = "SELECT MIN(period) as earliest_period FROM recommend_result WHERE lottery_type = %s"
        cursor.execute(sql_earliest, (lottery_type,))
        earliest_result = cursor.fetchone()
        earliest_period = earliest_result['earliest_period'] if earliest_result else None
        
        # 获取最近5期的推荐期数
        sql_recent = """
        SELECT DISTINCT period, created_at 
        FROM recommend_result 
        WHERE lottery_type = %s 
        ORDER BY period DESC 
        LIMIT 5
        """
        cursor.execute(sql_recent, (lottery_type,))
        recent_periods = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "total_periods": total_periods,
                "latest_period": latest_period,
                "earliest_period": earliest_period,
                "recent_periods": recent_periods,
                "lottery_type": lottery_type
            }
        }
        
    except Exception as e:
        return {"success": False, "message": f"获取推荐统计失败: {str(e)}"}

@app.get("/api/recommend16_history")
def get_recommend16_history(lottery_type: str = Query('am')):
    """
    获取推荐16码历史记录，按期数分组
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 查询所有推荐期数
        sql = """
        SELECT DISTINCT period, created_at 
        FROM recommend16_result 
        WHERE lottery_type = %s 
        ORDER BY period DESC
        """
        cursor.execute(sql, (lottery_type,))
        periods = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": periods
        }
        
    except Exception as e:
        return {"success": False, "message": f"获取推荐16码历史失败: {str(e)}"}

@app.get("/api/recommend16_by_period")
def get_recommend16_by_period(lottery_type: str = Query('am'), period: str = Query(...)):
    """
    获取指定期数的推荐16码数据
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 查询指定期数的推荐数据
        sql = """
        SELECT position, numbers 
        FROM recommend16_result 
        WHERE lottery_type = %s AND period = %s 
        ORDER BY position
        """
        cursor.execute(sql, (lottery_type, period))
        positions = cursor.fetchall()
        
        if not positions:
            return {"success": False, "message": f"未找到期数{period}的推荐16码数据"}
        
        # 构造推荐号码数组
        recommend_numbers = [""] * 7  # 7个位置
        for pos in positions:
            position = pos['position'] - 1  # 转换为0-6索引
            if 0 <= position < 7:
                recommend_numbers[position] = pos['numbers'].split(',')
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "period": period,
                "lottery_type": lottery_type,
                "recommend_numbers": recommend_numbers,
                "positions": positions
            }
        }
        
    except Exception as e:
        return {"success": False, "message": f"获取推荐16码数据失败: {str(e)}"}

@app.get("/api/recommend16_stats")
def get_recommend16_stats(lottery_type: str = Query('am')):
    """
    获取推荐16码统计信息
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 统计推荐期数数量
        sql_count = "SELECT COUNT(DISTINCT period) as total_periods FROM recommend16_result WHERE lottery_type = %s"
        cursor.execute(sql_count, (lottery_type,))
        count_result = cursor.fetchone()
        total_periods = count_result['total_periods'] if count_result else 0
        
        # 获取最新推荐期数
        sql_latest = "SELECT MAX(period) as latest_period FROM recommend16_result WHERE lottery_type = %s"
        cursor.execute(sql_latest, (lottery_type,))
        latest_result = cursor.fetchone()
        latest_period = latest_result['latest_period'] if latest_result else None
        
        # 获取最早推荐期数
        sql_earliest = "SELECT MIN(period) as earliest_period FROM recommend16_result WHERE lottery_type = %s"
        cursor.execute(sql_earliest, (lottery_type,))
        earliest_result = cursor.fetchone()
        earliest_period = earliest_result['earliest_period'] if earliest_result else None
        
        # 获取最近5期的推荐期数
        sql_recent = """
        SELECT DISTINCT period, created_at 
        FROM recommend16_result 
        WHERE lottery_type = %s 
        ORDER BY period DESC 
        LIMIT 5
        """
        cursor.execute(sql_recent, (lottery_type,))
        recent_periods = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "total_periods": total_periods,
                "latest_period": latest_period,
                "earliest_period": earliest_period,
                "recent_periods": recent_periods,
                "lottery_type": lottery_type
            }
        }
        
    except Exception as e:
        return {"success": False, "message": f"获取推荐16码统计失败: {str(e)}"}

# --- END ---

@app.get("/api/twenty_range_analysis")
def get_twenty_range_analysis(lottery_type: str = Query('am'), position: int = Query(1, ge=1, le=7)):
    """
    获取20区间分析数据
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 获取最近的200期数据，按期数排序
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
            cursor.close()
            conn.close()
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
                    number = int(numbers[pos])
                    # 计算该号码在各个20区间中的计数
                    counts = calculate_twenty_range_counts(number, pos + 1, lottery_type, cursor)
                    periods_data[period]['positions'][pos] = {
                        'number': number,
                        'count': counts.get(pos + 1, 0)
                    }
                except (ValueError, IndexError):
                    continue
        
        # 转换为列表并按期数排序
        periods = list(periods_data.values())
        periods.sort(key=lambda x: x['period'], reverse=True)
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "lottery_type": lottery_type,
                "position": position,
                "periods": periods
            }
        }
        
    except Exception as e:
        print(f"20区间分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

def calculate_twenty_range_counts(number, position, lottery_type, cursor):
    """
    计算指定号码在各个20区间中的遗漏计数
    """
    counts = {}
    
    # 获取该位置的历史开奖数据
    sql = """
    SELECT period, numbers 
    FROM lottery_result 
    WHERE lottery_type = %s 
    ORDER BY period DESC 
    LIMIT 200
    """
    cursor.execute(sql, (lottery_type,))
    history = cursor.fetchall()
    
    # 为每个位置计算20区间遗漏计数
    for pos in range(1, 8):
        miss_count = 0
        for record in history:
            try:
                numbers = record['numbers'].split(',')
                if pos <= len(numbers):
                    history_number = int(numbers[pos - 1])
                    # 检查历史号码是否在目标号码的20区间内
                    if is_number_in_twenty_range(history_number, number, pos):
                        # 命中，停止计数
                        break
                    else:
                        # 未命中，遗漏+1
                        miss_count += 1
            except (ValueError, IndexError):
                continue
        counts[pos] = miss_count
    
    return counts

def is_number_in_twenty_range(target_number, history_number, position):
    """
    判断历史号码是否在目标号码的20区间内
    """
    # 计算目标号码的20区间起始和结束号码
    range_start = target_number
    range_end = (target_number + 19) % 49
    if range_end == 0:
        range_end = 49
    
    if range_start <= range_end:
        return range_start <= history_number <= range_end
    else:
        # 处理跨49的情况，如 45~14
        return history_number >= range_start or history_number <= range_end

@app.get("/api/seventh_number_range_analysis")
def get_seventh_number_range_analysis(lottery_type: str = Query('am')):
    """
    获取第7个号码+1~+20区间命中遗漏分析
    每一期开奖的第7个号码在开奖号码+1~+20区间，下一期开奖的第7个号码在这区间为命中，不在为遗漏
    """
    try:
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 获取最近的若干期数据，按期数升序排列（提高上限，便于观察长遗漏段）
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
            cursor.close()
            conn.close()
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

        # 为每期增加“与其他期第7码对比命中”统计
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

            # 基于“固定当前期区间 vs 全体期第7码”的最近命中与双向遗漏期数
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
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "data": {
                "lottery_type": lottery_type,
                "total_analysis": total_analysis,
                "hit_count": total_hit_count,
                "hit_rate": round(hit_rate, 2),
                "current_miss": current_miss,
                "max_miss": max_miss,
                "results": results
            }
        }
        
    except Exception as e:
        print(f"第7个号码区间分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    import config
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT) 