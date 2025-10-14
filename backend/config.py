"""配置管理模块 - 支持外部 JSON 配置文件"""
import os
import sys
import json

def get_exe_dir():
    """获取可执行文件所在目录"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 配置文件路径
CONFIG_FILE = os.path.join(get_exe_dir(), 'config.json')

# 默认配置
DEFAULT_CONFIG = {
    "MYSQL_HOST": "localhost",
    "MYSQL_PORT": 3306,
    "MYSQL_USER": "root",
    "MYSQL_PASSWORD": "root",
    "MYSQL_DB": "zhenghe",
    "REDIS_HOST": "localhost",
    "REDIS_PORT": 6379,
    "API_HOST": "0.0.0.0",
    "API_PORT": 8000,
    "COLLECT_URLS": {
        "am": "https://qnjl.zkclhb.com:2025/am.html",
        "hk": "https://qnjl.zkclhb.com:2025/hk.html"
    },
    "COLLECT_HISTORY_URLS": {
        "am": "https://qnjl.zkclhb.com:2025/2023.html",
        "hk": "https://qnjl.zkclhb.com:2025/20221.html"
    },
    "WENLONGZHU_URLS": {
        "am": "https://hkamkl.wenlongzhu.com:2053/Macau-j-l/#dh",
        "hk": "https://hkamkl.wenlongzhu.com:2053/hk-j-l/#dh"
    }
}

def load_config():
    """从配置文件加载配置"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"加载配置文件失败: {e}, 使用默认配置")
            return DEFAULT_CONFIG.copy()
    return DEFAULT_CONFIG.copy()

def save_config(config_dict):
    """保存配置到文件"""
    try:
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config_dict, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"保存配置文件失败: {e}")
        return False

def create_default_config():
    """创建默认配置文件"""
    if not os.path.exists(CONFIG_FILE):
        save_config(DEFAULT_CONFIG)
        print(f"已创建默认配置文件: {CONFIG_FILE}")

# 加载配置
_config = load_config()

# 导出配置变量
MYSQL_HOST = _config.get("MYSQL_HOST", "localhost")
MYSQL_PORT = _config.get("MYSQL_PORT", 3306)
MYSQL_USER = _config.get("MYSQL_USER", "root")
MYSQL_PASSWORD = _config.get("MYSQL_PASSWORD", "root")
MYSQL_DB = _config.get("MYSQL_DB", "zhenghe")
REDIS_HOST = _config.get("REDIS_HOST", "localhost")
REDIS_PORT = _config.get("REDIS_PORT", 6379)
API_HOST = _config.get("API_HOST", "0.0.0.0")
API_PORT = _config.get("API_PORT", 8000)
COLLECT_URLS = _config.get("COLLECT_URLS", DEFAULT_CONFIG["COLLECT_URLS"])
COLLECT_HISTORY_URLS = _config.get("COLLECT_HISTORY_URLS", DEFAULT_CONFIG["COLLECT_HISTORY_URLS"])
WENLONGZHU_URLS = _config.get("WENLONGZHU_URLS", DEFAULT_CONFIG["WENLONGZHU_URLS"])
FALLBACK_COLLECT_URLS = WENLONGZHU_URLS

# 自动采集配置（简化版：每天一次）
AUTO_COLLECT = _config.get("AUTO_COLLECT", {
    "enabled": False,
    "retry_times": 3,
    "am_time": "21:35",  # 澳门采集时间
    "hk_time": "21:30",  # 香港采集时间
    "source": "default"  # 数据源
})
