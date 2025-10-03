"""数据库连接管理 - 支持连接池"""
from backend import config
import mysql.connector
from mysql.connector import pooling, Error

# 连接池
_connection_pool = None

def init_pool():
    """初始化连接池"""
    global _connection_pool
    if _connection_pool is None:
        try:
            _connection_pool = pooling.MySQLConnectionPool(
                pool_name="lottery_pool",
                pool_size=5,
                pool_reset_session=True,
                host=config.MYSQL_HOST,
                port=config.MYSQL_PORT,
                user=config.MYSQL_USER,
                password=config.MYSQL_PASSWORD,
                database=config.MYSQL_DB
            )
            print("数据库连接池初始化成功")
        except Error as e:
            print(f"连接池初始化失败: {e}")
            _connection_pool = None

def get_connection():
    """从连接池获取连接"""
    global _connection_pool
    if _connection_pool is None:
        init_pool()

    if _connection_pool:
        try:
            return _connection_pool.get_connection()
        except Error as e:
            print(f"从连接池获取连接失败: {e}")

    # 降级为直接连接
    return mysql.connector.connect(
        host=config.MYSQL_HOST,
        port=config.MYSQL_PORT,
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DB
    )

def test_connection():
    """测试数据库连接"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchone()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        return (False, str(e))
