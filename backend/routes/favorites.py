from fastapi import APIRouter, Request, Query
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
class FavoriteNumbersData(BaseModel):
    numbers: str
    name: str = ""

class PlaceData(BaseModel):
    name: str
    description: str = ""

class PlaceResultData(BaseModel):
    place_id: int
    qishu: str
    is_correct: Optional[int] = None

@router.get("/api/favorite_numbers")
def get_favorite_numbers(position: int = 7, lottery_type: str = 'am', year: Optional[str] = None):
    """获取所有关注号码组"""
    try:
        with get_db_cursor() as cursor:
            cursor.execute("SELECT * FROM favorite_numbers ORDER BY created_at DESC")
            rows = cursor.fetchall()

            # 构建年份过滤条件
            where_clause = "WHERE lottery_type=%s"
            params = [lottery_type]

            if year:
                where_clause += " AND period LIKE %s"
                params.append(f"{year}%")

            # 获取最新开奖记录用于计算遗漏
            cursor.execute(f"SELECT numbers FROM lottery_result {where_clause} ORDER BY open_time DESC LIMIT 1", params)
            latest_record = cursor.fetchone()

            # 为每个关注号码组计算遗漏
            for row in rows:
                current_miss = 0
                max_miss = 0

                if latest_record:
                    numbers = [int(n.strip()) for n in row['numbers'].split(',') if n.strip().isdigit()]

                    # 获取历史开奖记录用于计算遗漏（按期数正序排列）
                    cursor.execute(f"SELECT numbers, open_time, period FROM lottery_result {where_clause} ORDER BY period ASC", params)
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

@router.post("/api/favorite_numbers")
def add_favorite_numbers(data: FavoriteNumbersData):
    """添加关注号码组"""
    if not data.numbers:
        return {"success": False, "message": "关注号码不能为空"}

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO favorite_numbers (numbers, name) VALUES (%s, %s)",
                (data.numbers, data.name)
            )
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"添加失败: {str(e)}"}

@router.put("/api/favorite_numbers/{number_id}")
def update_favorite_numbers(number_id: int, data: FavoriteNumbersData):
    """更新关注号码组"""
    if not data.numbers:
        return {"success": False, "message": "关注号码不能为空"}

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE favorite_numbers SET numbers=%s, name=%s WHERE id=%s",
                (data.numbers, data.name, number_id)
            )
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"更新失败: {str(e)}"}

@router.delete("/api/favorite_numbers/{number_id}")
def delete_favorite_numbers(number_id: int):
    """删除关注号码组"""
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM favorite_numbers WHERE id=%s", (number_id,))
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"删除失败: {str(e)}"}

@router.get("/api/favorite_numbers/{number_id}/analysis")
def get_favorite_numbers_analysis(number_id: int, lottery_type: str = 'am', position: int = 7):
    """获取关注号码组的中奖分析"""
    try:
        with get_db_cursor() as cursor:
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

            # 先按时间正序(从旧到新)处理,计算每一期的当前遗漏和历史最大遗漏
            reversed_records = list(reversed(all_records))  # 反转为从旧到新
            temp_current_miss = 0  # 临时累加当前遗漏
            temp_max_miss = 0      # 临时记录历史最大遗漏

            # 先从旧到新遍历一遍,计算每期的当前遗漏和历史最大遗漏
            period_miss_map = {}  # 存储每期的遗漏信息

            for record in reversed_records:
                open_numbers = [int(n.strip()) for n in record['numbers'].split(',') if n.strip().isdigit()]
                if len(open_numbers) < 7:
                    continue

                target_pos = position - 1
                is_hit = target_pos < len(open_numbers) and open_numbers[target_pos] in numbers

                if is_hit:
                    # 命中,更新历史最大遗漏,然后清零当前遗漏
                    if temp_current_miss > temp_max_miss:
                        temp_max_miss = temp_current_miss
                    temp_current_miss = 0
                else:
                    # 遗漏,累加
                    temp_current_miss += 1

                # 记录该期的当前遗漏和历史最大遗漏
                period_miss_map[record['period']] = {
                    'current_miss': temp_current_miss,
                    'max_miss': temp_max_miss
                }

            # 最后还要检查一次,看最后的遗漏是否是最大的
            if temp_current_miss > temp_max_miss:
                temp_max_miss = temp_current_miss

            # 遍历所有记录生成分析结果(仍按从新到旧的顺序显示)
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

                # 从预计算的map中获取该期的遗漏信息
                miss_info = period_miss_map.get(record['period'], {'current_miss': 0, 'max_miss': 0})

                analysis_results.append({
                    'period': record['period'],
                    'lottery_type': record['lottery_type'],
                    'open_time': record['open_time'],
                    'open_numbers': open_numbers[:7],
                    'hits': hits,
                    'hit_positions': hit_positions,
                    'is_hit': len(hits) > 0,
                    'current_miss': miss_info['current_miss'],
                    'max_miss': miss_info['max_miss']
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

# 最大遗漏提醒：按阈值筛选 places 的当前遗漏与最大遗漏差距
@router.get("/api/places_max_miss_alerts")
def get_places_max_miss_alerts(threshold: int = Query(0, ge=0), lottery_type: str = Query('am')):
    """返回那些 (max_miss - current_miss) <= threshold 的关注点。
    注意：这里使用 place_results 的 is_correct=1 表示命中来统计遗漏。
    """
    try:
        with get_db_cursor() as cursor:
            # 获取所有关注点
            cursor.execute("SELECT id, name, description FROM places ORDER BY id")
            places = cursor.fetchall()

            alerts = []

            for place in places:
                place_id = place["id"]

                # 获取该关注点的所有登记结果（按时间顺序）
                cursor.execute(
                    """
                    SELECT id, qishu, is_correct, created_at
                    FROM place_results
                    WHERE place_id = %s
                    ORDER BY created_at ASC
                    """,
                    (place_id,),
                )
                records = cursor.fetchall()

                current_miss = 0
                max_miss = 0

                for rec in records:
                    if rec["is_correct"] == 1:
                        # 命中则重置当前遗漏
                        if current_miss > max_miss:
                            max_miss = current_miss
                        current_miss = 0
                    else:
                        # 非命中（0 或 NULL）视为未中，累计遗漏
                        current_miss += 1

                # 结束后再比较一次，避免最后一段遗漏未计入 max
                if current_miss > max_miss:
                    max_miss = current_miss

                gap = max_miss - current_miss
                if gap <= threshold:
                    alerts.append({
                        "place_id": place_id,
                        "place_name": place["name"],
                        "description": place.get("description", ""),
                        "current_miss": current_miss,
                        "max_miss": max_miss,
                        "gap": gap,
                    })

            # 按 gap 升序、再按 max_miss 降序，便于优先查看接近最大遗漏的
            alerts.sort(key=lambda x: (x["gap"], -x["max_miss"]))

            return {"success": True, "data": alerts, "threshold": threshold}
    except Exception as e:
        return {"success": False, "message": f"查询失败: {str(e)}"}

# --- 关注点 places 表的增删改查 API ---

@router.get("/api/places")
def get_places():
    with get_db_cursor() as cursor:
        cursor.execute("SELECT * FROM places ORDER BY created_at DESC, id DESC")
        rows = cursor.fetchall()
        return jsonable_encoder(rows)

@router.post("/api/places")
def add_place(data: PlaceData):
    if not data.name:
        return {"success": False, "message": "关注点名称不能为空"}

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO places (name, description) VALUES (%s, %s)",
                (data.name, data.description)
            )
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"添加失败: {str(e)}"}

@router.put("/api/places/{place_id}")
def update_place(place_id: int, data: PlaceData):
    if not data.name:
        return {"success": False, "message": "关注点名称不能为空"}

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE places SET name=%s, description=%s WHERE id=%s",
                (data.name, data.description, place_id)
            )
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"更新失败: {str(e)}"}

@router.delete("/api/places/{place_id}")
def delete_place(place_id: int):
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM places WHERE id=%s", (place_id,))
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"删除失败: {str(e)}"}

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
            rows = cursor.fetchall()

            # 计算每个place_id的遗漏统计
            miss_stats = {}
            for row in rows:
                pid = row['place_id']
                if pid not in miss_stats:
                    # 获取该place_id的所有记录(按创建时间正序)
                    cursor.execute("""
                        SELECT is_correct, created_at
                        FROM place_results
                        WHERE place_id = %s
                        ORDER BY created_at ASC
                    """, (pid,))
                    all_records = cursor.fetchall()

                    # 计算当前遗漏和历史最大遗漏
                    current_miss = 0
                    max_miss = 0
                    temp_miss = 0

                    for record in all_records:
                        if record['is_correct'] == 1:
                            # 命中,重置当前遗漏
                            if temp_miss > max_miss:
                                max_miss = temp_miss
                            temp_miss = 0
                        elif record['is_correct'] == 0:
                            # 遗漏,累加
                            temp_miss += 1

                    # 最后的连续遗漏就是当前遗漏
                    current_miss = temp_miss
                    if temp_miss > max_miss:
                        max_miss = temp_miss

                    miss_stats[pid] = {
                        'current_miss': current_miss,
                        'max_miss': max_miss
                    }

                # 添加遗漏信息到当前行
                row['current_miss'] = miss_stats[pid]['current_miss']
                row['max_miss'] = miss_stats[pid]['max_miss']

            return {
                "success": True,
                "data": rows,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": (total + page_size - 1) // page_size
                }
            }
    except Exception as e:
        return {"success": False, "message": f"查询失败: {str(e)}"}

@router.post("/api/place_results")
def add_place_result(data: PlaceResultData):
    if not data.place_id or not data.qishu:
        return {"success": False, "message": "关注点和期数不能为空"}

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "INSERT INTO place_results (place_id, qishu, is_correct) VALUES (%s, %s, %s)",
                (data.place_id, data.qishu, data.is_correct)
            )
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"添加失败: {str(e)}"}

@router.put("/api/place_results/{result_id}")
def update_place_result(result_id: int, data: PlaceResultData):
    if not data.place_id or not data.qishu:
        return {"success": False, "message": "关注点和期数不能为空"}

    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute(
                "UPDATE place_results SET place_id=%s, qishu=%s, is_correct=%s WHERE id=%s",
                (data.place_id, data.qishu, data.is_correct, result_id)
            )
            return {"success": True}
    except Exception as e:
        return {"success": False, "message": f"更新失败: {str(e)}"}

@router.delete("/api/place_results/{result_id}")
def delete_place_result(result_id: int):
    try:
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("DELETE FROM place_results WHERE id=%s", (result_id,))
            return {"success": True}
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
                    is_correct = record['is_correct']

                    if is_correct == 1:  # 正确
                        # 重置遗漏
                        if current_miss > max_miss:
                            max_miss = current_miss
                            max_miss_start = current_miss_start
                            max_miss_end = record['created_at']
                        current_miss = 0
                        current_miss_start = None

                        # 连中+1
                        if current_streak == 0:
                            current_streak_start = record['created_at']
                        current_streak += 1

                    elif is_correct == 0:  # 错误
                        # 重置连中
                        if current_streak > max_streak:
                            max_streak = current_streak
                            max_streak_start = current_streak_start
                            max_streak_end = record['created_at']
                        current_streak = 0
                        current_streak_start = None

                        # 遗漏+1
                        if current_miss == 0:
                            current_miss_start = record['created_at']
                        current_miss += 1

                    else:  # 未判断
                        # 遗漏+1
                        if current_miss == 0:
                            current_miss_start = record['created_at']
                        current_miss += 1

                # 处理最后一段
                if current_miss > max_miss:
                    max_miss = current_miss
                    max_miss_start = current_miss_start
                    max_miss_end = "至今"

                if current_streak > max_streak:
                    max_streak = current_streak
                    max_streak_start = current_streak_start
                    max_streak_end = "至今"

                place['current_miss'] = current_miss
                place['max_miss'] = max_miss
                place['max_miss_start'] = max_miss_start
                place['max_miss_end'] = max_miss_end
                place['current_streak'] = current_streak
                place['max_streak'] = max_streak
                place['max_streak_start'] = max_streak_start
                place['max_streak_end'] = max_streak_end

            return {"success": True, "data": places}
    except Exception as e:
        return {"success": False, "message": f"分析失败: {str(e)}"}
