from . import config
import redis

r = redis.Redis(
    host=config.REDIS_HOST,
    port=getattr(config, 'REDIS_PORT', 6379),
    db=0,
    decode_responses=True
) 