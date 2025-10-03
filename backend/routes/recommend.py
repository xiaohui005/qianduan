from fastapi import APIRouter, Query
from collections import Counter
from backend import collect

router = APIRouter()

@router.get("/recommend")
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

@router.get("/recommend16")
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

@router.get("/api/recommend_history")
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

@router.get("/api/recommend_by_period")
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

@router.get("/api/recommend_stats")
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

@router.get("/api/recommend16_history")
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

@router.get("/api/recommend16_by_period")
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

@router.get("/api/recommend16_stats")
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
