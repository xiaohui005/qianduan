"""
投注管理 API 路由 - 重构版

使用统一的错误处理和响应格式化工具，保持API响应格式不变
"""

from fastapi import APIRouter, Query, Request
from fastapi.encoders import jsonable_encoder
from typing import Optional
from pydantic import BaseModel
try:
    from backend import collect
    from backend.utils import (
        get_db_cursor,
        success_response,
        operation_response,
        error_response,
        handle_db_error,
        validate_required_params,
        get_logger
    )
except ImportError:
    import collect
    from utils import (
        get_db_cursor,
        success_response,
        operation_response,
        error_response,
        handle_db_error,
        validate_required_params,
        get_logger
    )

router = APIRouter()
logger = get_logger(__name__)


# ====================
# Pydantic 模型定义
# ====================

class PlaceData(BaseModel):
    """关注点数据模型"""
    name: str
    description: Optional[str] = ""


class BetData(BaseModel):
    """投注数据模型"""
    place_id: int
    qishu: str
    bet_amount: float
    win_amount: float
    is_correct: Optional[int] = None


class PlaceResultData(BaseModel):
    """关注点登记结果数据模型"""
    place_id: int
    qishu: str
    is_correct: Optional[int] = None


# ====================
# 关注点 places 表的增删改查 API
# ====================

@router.get("/api/places")
def get_places():
    """获取所有关注点"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM places ORDER BY created_at DESC, id DESC")
            rows = cursor.fetchall()
        return jsonable_encoder(rows)
    except Exception as e:
        logger.error(f"获取关注点列表失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "获取关注点列表")


@router.get("/api/betting_places")
def get_betting_places():
    """获取所有关注点（别名端点，用于前端兼容）"""
    return get_places()


@router.post("/api/places")
def add_place(data: PlaceData):
    """添加关注点"""
    try:
        # 验证必需参数
        error = validate_required_params({"name": data.name}, ["name"])
        if error:
            return error

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO places (name, description) VALUES (%s, %s)",
                (data.name, data.description)
            )

        logger.info(f"添加关注点成功: {data.name}")
        return operation_response(True, "添加成功")

    except Exception as e:
        logger.error(f"添加关注点失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "添加关注点")


@router.post("/api/betting_places")
def add_betting_place(data: PlaceData):
    """添加关注点（别名端点）"""
    return add_place(data)


@router.put("/api/places/{place_id}")
def update_place(place_id: int, data: PlaceData):
    """更新关注点"""
    try:
        # 验证必需参数
        error = validate_required_params({"name": data.name}, ["name"])
        if error:
            return error

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE places SET name=%s, description=%s WHERE id=%s",
                (data.name, data.description, place_id)
            )

        logger.info(f"更新关注点成功: ID={place_id}")
        return operation_response(True, "更新成功")

    except Exception as e:
        logger.error(f"更新关注点失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "更新关注点")


@router.delete("/api/places/{place_id}")
def delete_place(place_id: int):
    """删除关注点"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM places WHERE id=%s", (place_id,))

        logger.info(f"删除关注点成功: ID={place_id}")
        return operation_response(True, "删除成功")

    except Exception as e:
        logger.error(f"删除关注点失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "删除关注点")


@router.delete("/api/betting_places/{place_id}")
def delete_betting_place(place_id: int):
    """删除关注点（别名端点）"""
    return delete_place(place_id)


# ====================
# 投注记录 bets 表的增删改查 API
# ====================

@router.get("/api/bets")
def get_bets(place_id: int = None):
    """获取投注记录"""
    try:
        with get_db_cursor() as cursor:
            if place_id:
                cursor.execute(
                    "SELECT b.*, p.name as place_name FROM bets b LEFT JOIN places p ON b.place_id=p.id WHERE b.place_id=%s ORDER BY b.created_at DESC, b.id DESC",
                    (place_id,)
                )
            else:
                cursor.execute(
                    "SELECT b.*, p.name as place_name FROM bets b LEFT JOIN places p ON b.place_id=p.id ORDER BY b.created_at DESC, b.id DESC"
                )
            rows = cursor.fetchall()

        return jsonable_encoder(rows)

    except Exception as e:
        logger.error(f"获取投注记录失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "获取投注记录")


@router.post("/api/bets")
def add_bet(data: BetData):
    """添加投注记录"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO bets (place_id, qishu, bet_amount, win_amount, is_correct) VALUES (%s, %s, %s, %s, %s)",
                (data.place_id, data.qishu, data.bet_amount, data.win_amount, data.is_correct)
            )

        logger.info(f"添加投注记录成功: 期数={data.qishu}, 金额={data.bet_amount}")
        return operation_response(True, "添加成功")

    except Exception as e:
        logger.error(f"添加投注记录失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "添加投注记录")


@router.put("/api/bets/{bet_id}")
def update_bet(bet_id: int, data: BetData):
    """更新投注记录"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE bets SET place_id=%s, qishu=%s, bet_amount=%s, win_amount=%s, is_correct=%s WHERE id=%s",
                (data.place_id, data.qishu, data.bet_amount, data.win_amount, data.is_correct, bet_id)
            )

        logger.info(f"更新投注记录成功: ID={bet_id}")
        return operation_response(True, "更新成功")

    except Exception as e:
        logger.error(f"更新投注记录失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "更新投注记录")


@router.delete("/api/bets/{bet_id}")
def delete_bet(bet_id: int):
    """删除投注记录"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM bets WHERE id=%s", (bet_id,))

        logger.info(f"删除投注记录成功: ID={bet_id}")
        return operation_response(True, "删除成功")

    except Exception as e:
        logger.error(f"删除投注记录失败: {str(e)}", exc_info=True)
        return handle_db_error(e, "删除投注记录")


# ====================
# 关注点登记结果 place_results 表的增删改查 API
# ====================

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
    """获取关注点登记结果列表（支持分页和筛选）"""
    try:
        with get_db_cursor() as cursor:
            sql = """
            SELECT pr.*, p.name as place_name
            FROM place_results pr
            LEFT JOIN places p ON pr.place_id = p.id
            WHERE 1=1
            """
            params = []

            # 构建筛选条件
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
        logger.error(f"查询关注点登记结果失败: {str(e)}", exc_info=True)
        return error_response(f"查询失败: {str(e)}")


@router.post("/api/place_results")
def add_place_result(data: PlaceResultData):
    """添加关注点登记结果"""
    try:
        # 验证必需参数
        error = validate_required_params(
            {"place_id": data.place_id, "qishu": data.qishu},
            ["place_id", "qishu"]
        )
        if error:
            return error

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO place_results (place_id, qishu, is_correct) VALUES (%s, %s, %s)",
                (data.place_id, data.qishu, data.is_correct)
            )

        logger.info(f"添加关注点登记结果成功: 期数={data.qishu}")
        return operation_response(True, "添加成功")

    except Exception as e:
        logger.error(f"添加关注点登记结果失败: {str(e)}", exc_info=True)
        return error_response(f"请求解析失败: {str(e)}")


@router.put("/api/place_results/{result_id}")
def update_place_result(result_id: int, data: PlaceResultData):
    """更新关注点登记结果"""
    try:
        # 验证必需参数
        error = validate_required_params(
            {"place_id": data.place_id, "qishu": data.qishu},
            ["place_id", "qishu"]
        )
        if error:
            return error

        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE place_results SET place_id = %s, qishu = %s, is_correct = %s WHERE id = %s",
                (data.place_id, data.qishu, data.is_correct, result_id)
            )

        logger.info(f"更新关注点登记结果成功: ID={result_id}")
        return operation_response(True, "更新成功")

    except Exception as e:
        logger.error(f"更新关注点登记结果失败: {str(e)}", exc_info=True)
        return error_response(f"请求解析失败: {str(e)}")


@router.delete("/api/place_results/{result_id}")
def delete_place_result(result_id: int):
    """删除关注点登记结果"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM place_results WHERE id = %s", (result_id,))

        logger.info(f"删除关注点登记结果成功: ID={result_id}")
        return operation_response(True, "删除成功")

    except Exception as e:
        logger.error(f"删除关注点登记结果失败: {str(e)}", exc_info=True)
        return error_response(f"删除失败: {str(e)}")


# ====================
# 关注点分析 API
# ====================

@router.get("/api/place_analysis")
def get_place_analysis():
    """获取关注点分析数据（包含遗漏和连中统计）"""
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

                # 计算遗漏和连中统计
                current_miss = 0
                max_miss = 0
                max_miss_start = None
                max_miss_end = None
                current_miss_start = None

                current_streak = 0
                max_streak = 0
                max_streak_start = None
                max_streak_end = None
                current_streak_start = None

                for record in records:
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

            return success_response(places)

    except Exception as e:
        logger.error(f"关注点分析失败: {str(e)}", exc_info=True)
        return error_response(f"分析失败: {str(e)}")


# ====================
# 投注报表 API
# ====================

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

            # 1. 总体统计（使用IFNULL处理NULL值）
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

            logger.debug(f"总体统计查询完成: {overall_stats}")

            # 2. 按关注点统计
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

            # 3. 按时间统计（按月）
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

            # 4. 按时间统计（按日）
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
        logger.error(f"报表生成失败: {str(e)}", exc_info=True)
        return error_response(f"报表生成失败: {str(e)}")


@router.get("/api/betting_report")
def get_betting_report(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    place_id: Optional[int] = Query(None)
):
    """获取投注点报表统计数据（别名端点）"""
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
        logger.error(f"调试失败: {str(e)}", exc_info=True)
        return error_response(f"调试失败: {str(e)}")
