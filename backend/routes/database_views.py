"""数据库视图查询 API 路由"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from backend.utils import get_db_cursor

router = APIRouter()

@router.get("/api/database/views")
def get_all_views():
    """
    获取数据库中所有视图列表

    Returns:
        List[Dict]: 视图列表，包含视图名称和注释
    """
    try:
        with get_db_cursor() as cursor:
            # 查询当前数据库的所有视图
            cursor.execute("""
                SELECT
                    TABLE_NAME as view_name,
                    TABLE_COMMENT as view_comment
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_TYPE = 'VIEW'
                ORDER BY TABLE_NAME
            """)
            views = cursor.fetchall()

            return {
                "success": True,
                "data": views,
                "count": len(views)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询视图列表失败: {str(e)}")


@router.get("/api/database/view_data/{view_name}")
def get_view_data(view_name: str, page: int = 1, page_size: int = 100):
    """
    获取指定视图的数据

    Args:
        view_name: 视图名称
        page: 页码（从1开始）
        page_size: 每页记录数

    Returns:
        Dict: 包含列信息、数据和分页信息
    """
    try:
        # 验证视图名称（防止SQL注入）
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = %s
                AND TABLE_TYPE = 'VIEW'
            """, (view_name,))

            result = cursor.fetchone()
            if not result or result['count'] == 0:
                raise HTTPException(status_code=404, detail=f"视图 '{view_name}' 不存在")

        # 获取视图列信息
        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT
                    COLUMN_NAME as column_name,
                    DATA_TYPE as data_type,
                    COLUMN_COMMENT as column_comment
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = %s
                ORDER BY ORDINAL_POSITION
            """, (view_name,))
            columns = cursor.fetchall()

        # 获取总记录数
        with get_db_cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*) as total FROM `{view_name}`")
            total_count = cursor.fetchone()['total']

        # 计算分页
        offset = (page - 1) * page_size
        total_pages = (total_count + page_size - 1) // page_size

        # 获取视图数据
        with get_db_cursor() as cursor:
            cursor.execute(f"""
                SELECT * FROM `{view_name}`
                LIMIT %s OFFSET %s
            """, (page_size, offset))
            rows = cursor.fetchall()

        return {
            "success": True,
            "view_name": view_name,
            "columns": columns,
            "data": rows,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total_count": total_count,
                "total_pages": total_pages
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询视图数据失败: {str(e)}")


@router.get("/api/database/view_definition/{view_name}")
def get_view_definition(view_name: str):
    """
    获取视图的定义SQL

    Args:
        view_name: 视图名称

    Returns:
        Dict: 包含视图定义SQL
    """
    try:
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT VIEW_DEFINITION
                FROM information_schema.VIEWS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = %s
            """, (view_name,))

            result = cursor.fetchone()
            if not result:
                raise HTTPException(status_code=404, detail=f"视图 '{view_name}' 不存在")

            return {
                "success": True,
                "view_name": view_name,
                "definition": result['VIEW_DEFINITION']
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询视图定义失败: {str(e)}")
