"""缓存系统 - Redis 不可用时降级为文件缓存"""
from backend import config
import redis
import json
import os

# 尝试连接 Redis
try:
    r = redis.Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT,
        db=0,
        decode_responses=True
    )
    r.ping()
    REDIS_AVAILABLE = True
    print("Redis 连接成功")
except Exception as e:
    print(f"Redis 不可用,将使用文件缓存: {e}")
    r = None
    REDIS_AVAILABLE = False

# 文件缓存目录
CACHE_DIR = os.path.join(os.path.dirname(__file__), '_cache')
if not REDIS_AVAILABLE:
    os.makedirs(CACHE_DIR, exist_ok=True)

def get_cache(key):
    """获取缓存"""
    if REDIS_AVAILABLE:
        return r.get(key)
    else:
        cache_file = os.path.join(CACHE_DIR, f"{key}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                return None
        return None

def set_cache(key, value, expire=None):
    """设置缓存"""
    if REDIS_AVAILABLE:
        if expire:
            r.setex(key, expire, value)
        else:
            r.set(key, value)
    else:
        cache_file = os.path.join(CACHE_DIR, f"{key}.json")
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(value, f, ensure_ascii=False)
        except Exception as e:
            print(f"写入文件缓存失败: {e}")

def delete_cache(key):
    """删除缓存"""
    if REDIS_AVAILABLE:
        r.delete(key)
    else:
        cache_file = os.path.join(CACHE_DIR, f"{key}.json")
        if os.path.exists(cache_file):
            os.remove(cache_file)
