# 可用python-dotenv加载.env文件
MYSQL_HOST = "localhost"
MYSQL_PORT=3306
MYSQL_USER = "root"
MYSQL_PASSWORD = "root"
MYSQL_DB = "zhenghe"
REDIS_HOST = "localhost"
REDIS_PORT = 6379

# FastAPI服务配置
API_HOST = "0.0.0.0"
API_PORT = 8000 

# 采集网址配置
COLLECT_URLS = {
    'am': 'https://qnjl.zkclhb.com:2025/am.html',
    'hk': 'https://qnjl.zkclhb.com:2025/hk.html'
} 

# 历史采集网址配置（可自行修改）
COLLECT_HISTORY_URLS = {
    'am': 'https://qnjl.zkclhb.com:2025/2023.html',
    'hk': 'https://qnjl.zkclhb.com:2025/20221.html'
} 

# 文龙珠源（备用采集源）
WENLONGZHU_URLS = {
    'am': 'https://hkamkl.wenlongzhu.com:2053/Macau-j-l/#dh',
    'hk': 'https://hkamkl.wenlongzhu.com:2053/hk-j-l/#dh'
}

# 默认采集失败时的回退源（目前与文龙珠相同，可按需调整）
FALLBACK_COLLECT_URLS = WENLONGZHU_URLS