"""网址采集系统API路由"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any
from pydantic import BaseModel
import json

try:
    from backend.db import get_connection
    from backend.services import web_collector, result_verifier
except ImportError:
    from db import get_connection
    from services import web_collector, result_verifier

router = APIRouter()


# ==================== 数据模型 ====================

class CollectSourceCreate(BaseModel):
    """创建采集源请求模型"""
    name: str
    url: str
    lottery_type: str
    data_type: str
    extract_config: Dict[str, Any]
    is_active: bool = True
    description: Optional[str] = None


class CollectSourceUpdate(BaseModel):
    """更新采集源请求模型"""
    name: Optional[str] = None
    url: Optional[str] = None
    lottery_type: Optional[str] = None
    data_type: Optional[str] = None
    extract_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


# ==================== 采集源管理接口 ====================

@router.get("/api/web_collect/sources")
def get_sources(
    lottery_type: Optional[str] = Query(None, description="彩种类型筛选"),
    data_type: Optional[str] = Query(None, description="数据类型筛选"),
    is_active: Optional[bool] = Query(None, description="启用状态筛选"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    获取采集源列表
    支持分页和多条件筛选
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 构建查询条件
        sql = "SELECT * FROM collect_sources WHERE 1=1"
        params = []

        if lottery_type:
            sql += " AND lottery_type=%s"
            params.append(lottery_type)

        if data_type:
            sql += " AND data_type=%s"
            params.append(data_type)

        if is_active is not None:
            sql += " AND is_active=%s"
            params.append(1 if is_active else 0)

        # 获取总数
        count_sql = f"SELECT COUNT(*) as total FROM ({sql}) t"
        cursor.execute(count_sql, params)
        total = cursor.fetchone()['total']

        # 分页查询
        sql += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([page_size, (page - 1) * page_size])

        cursor.execute(sql, params)
        sources = cursor.fetchall()

        # 解析JSON字段
        for source in sources:
            if source.get('extract_config'):
                try:
                    source['extract_config'] = json.loads(source['extract_config'])
                except:
                    pass

        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "sources": sources
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取采集源列表失败: {str(e)}")


@router.get("/api/web_collect/sources/{source_id}")
def get_source_by_id(source_id: int):
    """获取单个采集源详情"""
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT * FROM collect_sources WHERE id=%s", (source_id,))
        source = cursor.fetchone()

        cursor.close()
        conn.close()

        if not source:
            raise HTTPException(status_code=404, detail="采集源不存在")

        # 解析JSON字段
        if source.get('extract_config'):
            try:
                source['extract_config'] = json.loads(source['extract_config'])
            except:
                pass

        return {
            "success": True,
            "data": source
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取采集源失败: {str(e)}")


@router.post("/api/web_collect/sources")
def create_source(source: CollectSourceCreate):
    """创建新采集源"""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 验证数据类型
        if source.data_type not in ['numbers', 'animals']:
            raise HTTPException(status_code=400, detail="数据类型必须是 numbers 或 animals")

        if source.lottery_type not in ['am', 'hk']:
            raise HTTPException(status_code=400, detail="彩种类型必须是 am 或 hk")

        # 插入数据
        cursor.execute(
            """INSERT INTO collect_sources
            (name, url, lottery_type, data_type, extract_config, is_active, description)
            VALUES (%s, %s, %s, %s, %s, %s, %s)""",
            (source.name, source.url, source.lottery_type, source.data_type,
             json.dumps(source.extract_config, ensure_ascii=False),
             1 if source.is_active else 0, source.description)
        )

        conn.commit()
        new_id = cursor.lastrowid
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "采集源创建成功",
            "data": {"id": new_id}
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建采集源失败: {str(e)}")


@router.put("/api/web_collect/sources/{source_id}")
def update_source(source_id: int, source: CollectSourceUpdate):
    """更新采集源"""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 检查采集源是否存在
        cursor.execute("SELECT id FROM collect_sources WHERE id=%s", (source_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="采集源不存在")

        # 构建更新语句
        update_fields = []
        params = []

        if source.name is not None:
            update_fields.append("name=%s")
            params.append(source.name)

        if source.url is not None:
            update_fields.append("url=%s")
            params.append(source.url)

        if source.lottery_type is not None:
            if source.lottery_type not in ['am', 'hk']:
                raise HTTPException(status_code=400, detail="彩种类型必须是 am 或 hk")
            update_fields.append("lottery_type=%s")
            params.append(source.lottery_type)

        if source.data_type is not None:
            if source.data_type not in ['numbers', 'animals']:
                raise HTTPException(status_code=400, detail="数据类型必须是 numbers 或 animals")
            update_fields.append("data_type=%s")
            params.append(source.data_type)

        if source.extract_config is not None:
            update_fields.append("extract_config=%s")
            params.append(json.dumps(source.extract_config, ensure_ascii=False))

        if source.is_active is not None:
            update_fields.append("is_active=%s")
            params.append(1 if source.is_active else 0)

        if source.description is not None:
            update_fields.append("description=%s")
            params.append(source.description)

        if not update_fields:
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="没有要更新的字段")

        # 执行更新
        params.append(source_id)
        sql = f"UPDATE collect_sources SET {', '.join(update_fields)} WHERE id=%s"
        cursor.execute(sql, params)

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "采集源更新成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新采集源失败: {str(e)}")


@router.delete("/api/web_collect/sources/{source_id}")
def delete_source(source_id: int):
    """删除采集源(级联删除相关采集记录)"""
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 检查采集源是否存在
        cursor.execute("SELECT id FROM collect_sources WHERE id=%s", (source_id,))
        if not cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=404, detail="采集源不存在")

        # 删除采集源(外键约束会自动删除相关采集记录)
        cursor.execute("DELETE FROM collect_sources WHERE id=%s", (source_id,))

        conn.commit()
        cursor.close()
        conn.close()

        return {
            "success": True,
            "message": "采集源删除成功"
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除采集源失败: {str(e)}")


# ==================== 采集执行接口 ====================

@router.post("/api/web_collect/execute/{source_id}")
def execute_collect(source_id: int):
    """执行单个采集源的采集任务"""
    try:
        success = web_collector.collect_by_source_id(source_id)

        if success:
            return {
                "success": True,
                "message": "采集成功"
            }
        else:
            return {
                "success": False,
                "message": "采集失败,请检查日志"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"执行采集失败: {str(e)}")


@router.post("/api/web_collect/execute_all")
def execute_collect_all(lottery_type: Optional[str] = Query(None)):
    """执行所有启用的采集源"""
    try:
        result = web_collector.collect_all_active_sources(lottery_type)

        return {
            "success": True,
            "message": f"采集完成: 成功{result['success']}个, 失败{result['failed']}个",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量采集失败: {str(e)}")


# ==================== 采集结果查询接口 ====================

@router.get("/api/web_collect/results")
def get_collect_results(
    source_id: Optional[int] = Query(None, description="采集源ID筛选"),
    lottery_type: Optional[str] = Query(None, description="彩种类型筛选"),
    period: Optional[str] = Query(None, description="期号筛选"),
    data_type: Optional[str] = Query(None, description="数据类型筛选"),
    is_correct: Optional[bool] = Query(None, description="验证结果筛选"),
    verified: Optional[bool] = Query(None, description="是否已验证筛选"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100)
):
    """
    获取采集结果列表
    支持多条件筛选和分页
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 构建查询条件
        sql = """SELECT cd.*, cs.name as source_name, cs.url as source_url
                 FROM collected_data cd
                 LEFT JOIN collect_sources cs ON cd.source_id = cs.id
                 WHERE 1=1"""
        params = []

        if source_id:
            sql += " AND cd.source_id=%s"
            params.append(source_id)

        if lottery_type:
            sql += " AND cd.lottery_type=%s"
            params.append(lottery_type)

        if period:
            sql += " AND cd.period=%s"
            params.append(period)

        if data_type:
            sql += " AND cd.data_type=%s"
            params.append(data_type)

        if is_correct is not None:
            sql += " AND cd.is_correct=%s"
            params.append(1 if is_correct else 0)

        if verified is not None:
            if verified:
                sql += " AND cd.is_correct IS NOT NULL"
            else:
                sql += " AND cd.is_correct IS NULL"

        # 获取总数
        count_sql = f"SELECT COUNT(*) as total FROM ({sql}) t"
        cursor.execute(count_sql, params)
        total = cursor.fetchone()['total']

        # 分页查询
        sql += " ORDER BY cd.collected_at DESC LIMIT %s OFFSET %s"
        params.extend([page_size, (page - 1) * page_size])

        cursor.execute(sql, params)
        results = cursor.fetchall()

        # 解析JSON字段
        for result in results:
            if result.get('match_detail'):
                try:
                    result['match_detail'] = json.loads(result['match_detail'])
                except:
                    pass

        cursor.close()
        conn.close()

        return {
            "success": True,
            "data": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "results": results
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取采集结果失败: {str(e)}")


# ==================== 验证接口 ====================

@router.post("/api/web_collect/verify/{period}")
def verify_period(
    period: str,
    lottery_type: str = Query(..., description="彩种类型")
):
    """手动触发指定期号的验证"""
    try:
        success = result_verifier.verify_period(period, lottery_type)

        if success:
            return {
                "success": True,
                "message": f"验证完成: {lottery_type} {period}"
            }
        else:
            return {
                "success": False,
                "message": "验证失败,可能没有待验证的记录或开奖结果不存在"
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证失败: {str(e)}")


@router.post("/api/web_collect/verify_all")
def verify_all_unverified():
    """自动验证所有未验证的采集记录"""
    try:
        result = result_verifier.auto_verify_all_unverified()

        return {
            "success": True,
            "message": f"验证完成: {result['periods_verified']}期, {result['records_verified']}条记录",
            "data": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"批量验证失败: {str(e)}")


# ==================== 统计接口 ====================

@router.get("/api/web_collect/stats")
def get_stats(lottery_type: Optional[str] = Query(None)):
    """获取采集和验证统计数据"""
    try:
        stats = result_verifier.get_verification_stats(lottery_type)

        return {
            "success": True,
            "data": stats
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计数据失败: {str(e)}")
