"""缓存工具模块 - 提供智能缓存功能"""
from functools import wraps
from datetime import datetime, timedelta
import json
import hashlib
from typing import Optional, Callable, Any

# 缓存存储
_cache_store = {}
_cache_timeout = {}

def cache_result(timeout_minutes: int = 5):
    """
    缓存函数返回结果的装饰器

    使用示例:
        @cache_result(timeout_minutes=10)
        def get_lottery_records(lottery_type):
            # 执行数据库查询
            return records

    Args:
        timeout_minutes: 缓存过期时间（分钟）

    Returns:
        装饰后的函数
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = _generate_cache_key(func.__name__, args, kwargs)

            # 检查缓存
            cached_value = _get_from_cache(cache_key)
            if cached_value is not None:
                print(f"[缓存命中] {func.__name__} - key: {cache_key[:16]}...")
                return cached_value

            # 执行函数
            print(f"[缓存未命中] {func.__name__} - 执行查询")
            result = func(*args, **kwargs)

            # 存入缓存
            _set_to_cache(cache_key, result, timeout_minutes)

            return result
        return wrapper
    return decorator

def clear_cache(pattern: Optional[str] = None):
    """
    清除缓存

    Args:
        pattern: 缓存键的模式字符串，如果为None则清除全部缓存
                例如: clear_cache('am') 会清除所有包含'am'的缓存

    Example:
        # 清除全部缓存
        clear_cache()

        # 清除澳门彩种相关的缓存
        clear_cache('am')
    """
    if pattern is None:
        count = len(_cache_store)
        _cache_store.clear()
        _cache_timeout.clear()
        print(f"[缓存清除] 已清除全部缓存 ({count}条)")
    else:
        keys_to_delete = [k for k in _cache_store.keys() if pattern in k]
        for k in keys_to_delete:
            del _cache_store[k]
            if k in _cache_timeout:
                del _cache_timeout[k]
        print(f"[缓存清除] 已清除包含'{pattern}'的缓存 ({len(keys_to_delete)}条)")

def get_cache_stats() -> dict:
    """
    获取缓存统计信息

    Returns:
        包含缓存统计的字典
    """
    total_items = len(_cache_store)
    expired_items = 0
    valid_items = 0

    now = datetime.now()
    for key, expiry in _cache_timeout.items():
        if expiry and now >= expiry:
            expired_items += 1
        else:
            valid_items += 1

    return {
        'total_items': total_items,
        'valid_items': valid_items,
        'expired_items': expired_items,
        'cache_keys': list(_cache_store.keys())[:10]  # 只返回前10个key
    }

def _generate_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """
    生成缓存键

    Args:
        func_name: 函数名
        args: 位置参数
        kwargs: 关键字参数

    Returns:
        缓存键字符串
    """
    # 将参数转换为JSON字符串
    try:
        args_str = json.dumps([args, kwargs], sort_keys=True, default=str)
    except (TypeError, ValueError):
        # 如果无法序列化，使用repr
        args_str = repr((args, kwargs))

    # 生成哈希值
    args_hash = hashlib.md5(args_str.encode()).hexdigest()[:16]

    return f"{func_name}_{args_hash}"

def _get_from_cache(cache_key: str) -> Optional[Any]:
    """
    从缓存中获取数据

    Args:
        cache_key: 缓存键

    Returns:
        缓存的值，如果不存在或已过期则返回None
    """
    if cache_key not in _cache_store:
        return None

    # 检查是否过期
    expiry = _cache_timeout.get(cache_key)
    if expiry and datetime.now() >= expiry:
        # 已过期，删除缓存
        del _cache_store[cache_key]
        del _cache_timeout[cache_key]
        return None

    return _cache_store[cache_key]

def _set_to_cache(cache_key: str, value: Any, timeout_minutes: int):
    """
    将数据存入缓存

    Args:
        cache_key: 缓存键
        value: 要缓存的值
        timeout_minutes: 过期时间（分钟）
    """
    _cache_store[cache_key] = value
    _cache_timeout[cache_key] = datetime.now() + timedelta(minutes=timeout_minutes)

def cache_clear_on_update(lottery_type: str):
    """
    数据更新时清除相关缓存

    当采集到新数据时调用此函数，清除该彩种的所有缓存

    Args:
        lottery_type: 彩种类型 (am/hk)

    Example:
        # 在采集数据后调用
        cache_clear_on_update('am')
    """
    clear_cache(lottery_type)
