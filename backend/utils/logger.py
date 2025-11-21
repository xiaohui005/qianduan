"""结构化日志系统 - 提供统一的日志管理"""
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# 创建日志目录
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

# 日志格式
LOG_FORMAT = '[%(asctime)s] [%(levelname)s] [%(name)s:%(lineno)d] %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# 全局日志配置
_loggers = {}

def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    获取日志记录器（单例模式）

    使用示例:
        from backend.utils.logger import get_logger

        logger = get_logger(__name__)
        logger.info("开始处理数据")
        logger.error("发生错误", exc_info=True)

    Args:
        name: 日志记录器名称（通常使用 __name__）
        level: 日志级别（默认INFO）

    Returns:
        日志记录器实例
    """
    if name in _loggers:
        return _loggers[name]

    # 创建日志记录器
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    # 避免重复添加处理器
    if logger.handlers:
        return logger

    # 日志格式化器
    formatter = logging.Formatter(LOG_FORMAT, DATE_FORMAT)

    # 1. 控制台处理器（INFO及以上）
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # 2. 文件处理器（DEBUG及以上，每天一个文件）
    today = datetime.now().strftime('%Y%m%d')
    file_handler = logging.FileHandler(
        LOG_DIR / f"backend_{today}.log",
        encoding='utf-8'
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 3. 错误日志处理器（ERROR及以上）
    error_handler = logging.FileHandler(
        LOG_DIR / f"error_{today}.log",
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    # 缓存日志记录器
    _loggers[name] = logger

    return logger

def log_api_call(logger: logging.Logger, endpoint: str, params: dict, duration: Optional[float] = None):
    """
    记录API调用日志（结构化）

    Args:
        logger: 日志记录器
        endpoint: API端点
        params: 请求参数
        duration: 执行时间（可选）

    Example:
        logger = get_logger(__name__)
        log_api_call(logger, "/collect", {"type": "am"}, 1.234)
    """
    log_msg = f"API调用 [{endpoint}] 参数: {params}"
    if duration:
        log_msg += f" 耗时: {duration:.3f}秒"
    logger.info(log_msg)

def log_database_query(logger: logging.Logger, sql: str, params: tuple, duration: float):
    """
    记录数据库查询日志

    Args:
        logger: 日志记录器
        sql: SQL语句
        params: 参数
        duration: 执行时间

    Example:
        logger = get_logger(__name__)
        log_database_query(logger, "SELECT * FROM lottery_result WHERE type=%s", ('am',), 0.123)
    """
    # 简化SQL（去除多余空格）
    sql_brief = ' '.join(sql.split())

    if duration > 1.0:
        logger.warning(f"慢查询 [{duration:.3f}秒] SQL: {sql_brief} 参数: {params}")
    else:
        logger.debug(f"查询 [{duration:.3f}秒] SQL: {sql_brief} 参数: {params}")

def log_data_collection(logger: logging.Logger, lottery_type: str, success: bool,
                        period: Optional[str] = None, error: Optional[str] = None):
    """
    记录数据采集日志

    Args:
        logger: 日志记录器
        lottery_type: 彩种类型
        success: 是否成功
        period: 期号（可选）
        error: 错误信息（可选）

    Example:
        logger = get_logger(__name__)
        log_data_collection(logger, 'am', True, '2025100')
        log_data_collection(logger, 'hk', False, error='网络超时')
    """
    if success:
        logger.info(f"数据采集成功 [{lottery_type}] 期号: {period}")
    else:
        logger.error(f"数据采集失败 [{lottery_type}] 错误: {error}")

def log_cache_operation(logger: logging.Logger, operation: str, key: str, hit: Optional[bool] = None):
    """
    记录缓存操作日志

    Args:
        logger: 日志记录器
        operation: 操作类型 (hit/miss/set/clear)
        key: 缓存键
        hit: 是否命中（可选）

    Example:
        logger = get_logger(__name__)
        log_cache_operation(logger, 'hit', 'lottery_am_recent_100', True)
    """
    if operation == 'hit':
        logger.debug(f"缓存命中 [{key}]")
    elif operation == 'miss':
        logger.debug(f"缓存未命中 [{key}]")
    elif operation == 'set':
        logger.debug(f"缓存设置 [{key}]")
    elif operation == 'clear':
        logger.info(f"缓存清除 [{key}]")

def setup_logging(level: int = logging.INFO):
    """
    设置全局日志配置

    Args:
        level: 日志级别

    Example:
        # 在 main.py 中初始化
        setup_logging(logging.DEBUG)
    """
    # 设置根日志记录器
    logging.basicConfig(
        level=level,
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT
    )

    # 禁用第三方库的DEBUG日志
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)

def get_log_files() -> list:
    """
    获取所有日志文件列表

    Returns:
        日志文件路径列表

    Example:
        files = get_log_files()
        for file in files:
            print(file)
    """
    return [str(f) for f in LOG_DIR.glob("*.log")]

def clean_old_logs(days: int = 7):
    """
    清理N天前的日志文件

    Args:
        days: 保留天数

    Example:
        # 清理7天前的日志
        clean_old_logs(7)
    """
    import time

    cutoff = time.time() - (days * 24 * 60 * 60)
    deleted_count = 0

    for log_file in LOG_DIR.glob("*.log"):
        if log_file.stat().st_mtime < cutoff:
            try:
                log_file.unlink()
                deleted_count += 1
            except Exception as e:
                print(f"删除日志文件失败 {log_file}: {e}")

    print(f"清理完成，删除 {deleted_count} 个旧日志文件")
