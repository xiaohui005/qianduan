"""数据库连接管理 - 支持连接池（优化版）"""
from backend import config
import mysql.connector
from mysql.connector import pooling, Error
from contextlib import contextmanager
import logging

# 创建日志记录器
logger = logging.getLogger(__name__)

# 连接池（增强版）
_connection_pool = None
_pool_stats = {'total_created': 0, 'active_connections': 0, 'errors': 0}

def init_pool():
    """初始化连接池（优化版）"""
    global _connection_pool
    if _connection_pool is None:
        try:
            _connection_pool = pooling.MySQLConnectionPool(
                pool_name="lottery_pool",
                pool_size=10,  # 从5增加到10
                pool_reset_session=True,
                host=config.MYSQL_HOST,
                port=config.MYSQL_PORT,
                user=config.MYSQL_USER,
                password=config.MYSQL_PASSWORD,
                database=config.MYSQL_DB,
                # 新增优化配置
                connect_timeout=10,
                autocommit=True,
                charset='utf8mb4',
                collation='utf8mb4_unicode_ci',
                use_unicode=True
            )
            _pool_stats['total_created'] += 1
            logger.info("✅ 数据库连接池初始化成功 (pool_size=10)")
            print("✅ 数据库连接池初始化成功 (pool_size=10)")
        except Error as e:
            _pool_stats['errors'] += 1
            logger.error(f"❌ 连接池初始化失败: {e}")
            print(f"❌ 连接池初始化失败: {e}")
            _connection_pool = None

def get_connection():
    """从连接池获取连接（优化版）"""
    global _connection_pool
    if _connection_pool is None:
        init_pool()

    if _connection_pool:
        try:
            conn = _connection_pool.get_connection()
            _pool_stats['active_connections'] += 1
            return conn
        except Error as e:
            _pool_stats['errors'] += 1
            logger.error(f"从连接池获取连接失败: {e}")
            print(f"从连接池获取连接失败: {e}")

    # 降级为直接连接
    logger.warning("⚠️ 连接池不可用，使用直接连接")
    return mysql.connector.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DB,
        charset='utf8mb4',
        collation='utf8mb4_unicode_ci',
        use_unicode=True
    )

@contextmanager
def get_connection_safe():
    """
    安全的连接上下文管理器（增强版）

    使用示例:
        with get_connection_safe() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM lottery_result")
            # 自动关闭连接和提交/回滚

    Yields:
        数据库连接对象
    """
    conn = None
    try:
        conn = get_connection()
        yield conn
    except Exception as e:
        logger.error(f"数据库操作错误: {e}", exc_info=True)
        if conn:
            try:
                conn.rollback()
            except:
                pass
        raise
    finally:
        if conn:
            try:
                conn.close()
                _pool_stats['active_connections'] = max(0, _pool_stats['active_connections'] - 1)
            except:
                pass

def test_connection():
    """测试数据库连接（优化版）"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        if result and result[0] == 1:
            logger.info("✅ 数据库连接测试成功")
            return True
        else:
            logger.error("❌ 数据库连接测试失败：返回值错误")
            return (False, "返回值错误")
    except Error as e:
        logger.error(f"❌ 数据库连接测试失败: {e}")
        return (False, str(e))

def get_pool_stats():
    """
    获取连接池统计信息

    Returns:
        连接池统计字典

    Example:
        stats = get_pool_stats()
        print(f"活跃连接数: {stats['active_connections']}")
    """
    if _connection_pool:
        try:
            pool_size = _connection_pool._cnx_queue.maxsize
            available = _connection_pool._cnx_queue.qsize()
            in_use = pool_size - available

            return {
                "pool_name": _connection_pool.pool_name,
                "pool_size": pool_size,
                "connections_in_use": in_use,
                "connections_available": available,
                "total_created": _pool_stats['total_created'],
                "errors": _pool_stats['errors'],
                "status": "healthy" if in_use < pool_size else "full"
            }
        except Exception as e:
            logger.error(f"获取连接池统计失败: {e}")
            return {"error": str(e)}

    return {
        "status": "not_initialized",
        "message": "连接池未初始化"
    }

def close_pool():
    """
    关闭连接池（清理资源）

    Example:
        # 在应用关闭时调用
        close_pool()
    """
    global _connection_pool
    if _connection_pool:
        try:
            # MySQL Connector 不提供直接关闭连接池的方法
            # 我们只能将引用设置为 None，让垃圾回收处理
            _connection_pool = None
            logger.info("连接池已关闭")
            print("连接池已关闭")
        except Exception as e:
            logger.error(f"关闭连接池失败: {e}")
            print(f"关闭连接池失败: {e}")
