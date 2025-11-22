from fastapi import APIRouter, Query, Request
from fastapi.encoders import jsonable_encoder
from typing import Optional
from pydantic import BaseModel
try:
    from backend import collect
    from backend.utils import get_db_cursor
except ImportError:
    import collect
    from utils import get_db_cursor

router = APIRouter()

# Pydantic 模型定义
class PlaceData(BaseModel):
    name: str
    description: Optional[str] = ""

class BetData(BaseModel):
    place_id: int
    qishu: str
    bet_amount: float
    win_amount: float
    is_correct: Optional[int] = None

class PlaceResultData(BaseModel):
    place_id: int
    qishu: str
    is_correct: Optional[int] = None

# --- 关注点 places 表的增删改查 API ---

@router.get("/api/places")
def get_places():
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM places ORDER BY created_at DESC, id DESC")
        rows = cursor.fetchall()
    return jsonable_encoder(rows)

# 别名端点，用于前端兼容
@router.get("/api/betting_places")
def get_betting_places():
    return get_places()

@router.post("/api/places")
def add_place(data: PlaceData):
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "INSERT INTO places (name, description) VALUES (%s, %s)",
            (data.name, data.description)
        )
    return {"success": True}

# 别名端点，用于前端兼容
@router.post("/api/betting_places")
def add_betting_place(data: PlaceData):
    return add_place(data)

@router.put("/api/places/{place_id}")
def update_place(place_id: int, data: PlaceData):
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "UPDATE places SET name=%s, description=%s WHERE id=%s",
            (data.name, data.description, place_id)
        )
    return {"success": True}

@router.delete("/api/places/{place_id}")
def delete_place(place_id: int):
    with get_db_cursor(commit=True) as cursor:
        cursor.execute("DELETE FROM places WHERE id=%s", (place_id,))
    return {"success": True}

# 别名端点，用于前端兼容
@router.delete("/api/betting_places/{place_id}")
def delete_betting_place(place_id: int):
    return delete_place(place_id)

# --- 投注记录 bets 表的增删改查 API ---

@router.get("/api/bets")
def get_bets(place_id: int = None):
    with get_db_cursor() as cursor:
        if place_id:
            cursor.execute("SELECT b.*, p.name as place_name FROM bets b LEFT JOIN places p ON b.place_id=p.id WHERE b.place_id=%s ORDER BY b.created_at DESC, b.id DESC", (place_id,))
        else:
            cursor.execute("SELECT b.*, p.name as place_name FROM bets b LEFT JOIN places p ON b.place_id=p.id ORDER BY b.created_at DESC, b.id DESC")
        rows = cursor.fetchall()
    return jsonable_encoder(rows)

@router.post("/api/bets")
def add_bet(data: BetData):
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "INSERT INTO bets (place_id, qishu, bet_amount, win_amount, is_correct) VALUES (%s, %s, %s, %s, %s)",
            (data.place_id, data.qishu, data.bet_amount, data.win_amount, data.is_correct)
        )
    return {"success": True}

@router.put("/api/bets/{bet_id}")
def update_bet(bet_id: int, data: BetData):
    with get_db_cursor(commit=True) as cursor:
        cursor.execute(
            "UPDATE bets SET place_id=%s, qishu=%s, bet_amount=%s, win_amount=%s, is_correct=%s WHERE id=%s",
            (data.place_id, data.qishu, data.bet_amount, data.win_amount, data.is_correct, bet_id)
        )
    return {"success": True}

@router.delete("/api/bets/{bet_id}")
def delete_bet(bet_id: int):
    with get_db_cursor(commit=True) as cursor:
        cursor.execute("DELETE FROM bets WHERE id=%s", (bet_id,))
    return {"success": True}

# --- 关注点登记结果 place_results 表的增删改查 API ---

@router.get("/api/place_results")
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
    try:
        with get_db_cursor() as cursor:
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

@router.post("/api/place_results")
def add_place_result(data: PlaceResultData):
    """添加关注点登记结果"""
    try:
        if not data.place_id or not data.qishu:
            return {"success": False, "message": "关注点ID和期数不能为空"}

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO place_results (place_id, qishu, is_correct) VALUES (%s, %s, %s)",
                (data.place_id, data.qishu, data.is_correct)
            )
        return {"success": True, "message": "添加成功"}
    except Exception as e:
        return {"success": False, "message": f"请求解析失败: {str(e)}"}

@router.put("/api/place_results/{result_id}")
def update_place_result(result_id: int, data: PlaceResultData):
    """更新关注点登记结果"""
    try:
        if not data.place_id or not data.qishu:
            return {"success": False, "message": "关注点ID和期数不能为空"}

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE place_results SET place_id = %s, qishu = %s, is_correct = %s WHERE id = %s",
                (data.place_id, data.qishu, data.is_correct, result_id)
            )
        return {"success": True, "message": "更新成功"}
    except Exception as e:
        return {"success": False, "message": f"请求解析失败: {str(e)}"}

@router.delete("/api/place_results/{result_id}")
def delete_place_result(result_id: int):
    """删除关注点登记结果"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM place_results WHERE id = %s", (result_id,))
        return {"success": True, "message": "删除成功"}
    except Exception as e:
        return {"success": False, "message": f"删除失败: {str(e)}"}

@router.get("/api/place_analysis")
def get_place_analysis():
    """获取关注点分析数据"""
    try:
        with get_db_cursor() as cursor:
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

@router.get("/api/bet_report")
def get_bet_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    place_id: Optional[int] = Query(None)
):
    """获取投注点报表统计数据"""
    try:
        with get_db_cursor() as cursor:
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

            # 1. 总体统计（修复：使用IFNULL处理NULL值）
            overall_sql = f"""
            SELECT
                COUNT(*) as total_bets,
                IFNULL(SUM(b.bet_amount), 0) as total_bet_amount,
                IFNULL(SUM(b.win_amount), 0) as total_win_amount,
                IFNULL(SUM(b.win_amount - b.bet_amount), 0) as total_profit_loss,
                IFNULL(AVG(b.bet_amount), 0) as avg_bet_amount,
                IFNULL(AVG(b.win_amount), 0) as avg_win_amount,
                IFNULL(AVG(b.win_amount - b.bet_amount), 0) as avg_profit_loss,
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

            # 2. 按关注点统计（修复：使用IFNULL处理NULL值）
            place_stats_sql = f"""
            SELECT
                p.id as place_id,
                p.name as place_name,
                p.description as place_description,
                COUNT(b.id) as bet_count,
                IFNULL(SUM(b.bet_amount), 0) as total_bet_amount,
                IFNULL(SUM(b.win_amount), 0) as total_win_amount,
                IFNULL(SUM(b.win_amount - b.bet_amount), 0) as total_profit_loss,
                IFNULL(AVG(b.bet_amount), 0) as avg_bet_amount,
                IFNULL(AVG(b.win_amount), 0) as avg_win_amount,
                IFNULL(AVG(b.win_amount - b.bet_amount), 0) as avg_profit_loss,
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

            # 3. 按时间统计（按月）（修复：使用IFNULL处理NULL值）
            time_stats_sql = f"""
            SELECT
                DATE_FORMAT(b.created_at, '%Y-%m') as month,
                COUNT(b.id) as bet_count,
                IFNULL(SUM(b.bet_amount), 0) as total_bet_amount,
                IFNULL(SUM(b.win_amount), 0) as total_win_amount,
                IFNULL(SUM(b.win_amount - b.bet_amount), 0) as total_profit_loss,
                IFNULL(AVG(b.bet_amount), 0) as avg_bet_amount,
                IFNULL(AVG(b.win_amount), 0) as avg_win_amount,
                IFNULL(AVG(b.win_amount - b.bet_amount), 0) as avg_profit_loss
            FROM bets b
            {where_clause}
            GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
            ORDER BY month DESC
            """
            cursor.execute(time_stats_sql, params)
            time_stats = cursor.fetchall()

            # 4. 按时间统计（按日）（修复：使用IFNULL处理NULL值）
            daily_stats_sql = f"""
            SELECT
                DATE(b.created_at) as date,
                COUNT(b.id) as bet_count,
                IFNULL(SUM(b.bet_amount), 0) as total_bet_amount,
                IFNULL(SUM(b.win_amount), 0) as total_win_amount,
                IFNULL(SUM(b.win_amount - b.bet_amount), 0) as total_profit_loss
            FROM bets b
            {where_clause}
            GROUP BY DATE(b.created_at)
            ORDER BY date DESC
            LIMIT 30
            """
            cursor.execute(daily_stats_sql, params)
            daily_stats = cursor.fetchall()

            # 5. 输赢分布统计（修复：使用IFNULL处理NULL值）
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
                IFNULL(SUM(b.bet_amount), 0) as total_bet_amount,
                IFNULL(SUM(b.win_amount), 0) as total_win_amount,
                IFNULL(SUM(b.win_amount - b.bet_amount), 0) as total_profit_loss
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

# 别名端点，用于前端兼容
@router.get("/api/betting_report")
def get_betting_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    place_id: Optional[int] = Query(None)
):
    """获取投注点报表统计数据（别名）"""
    return get_bet_report(start_date, end_date, place_id)

@router.get("/api/debug/bets")
def debug_bets():
    """调试API：查看bets表数据"""
    try:
        with get_db_cursor() as cursor:
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
