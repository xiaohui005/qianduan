# 彩票分析系统 - 打包 EXE 改造计划

## 项目概述
将现有的彩票采集分析系统改造为可打包成独立 EXE 的形式，保留 MySQL 数据库方案。

## 技术方案
- **打包工具**: PyInstaller
- **数据库**: MySQL（需用户自行安装）
- **配置方式**: 外部 JSON 配置文件
- **缓存**: Redis 可选（不可用时降级为文件缓存）

---

## 完整修改计划

### 阶段一：配置系统重构（优先级：高）

#### 1. 重写 `backend/config.py`
**目标**: 支持外部配置文件，兼容打包后环境

**新增功能**:
```python
- get_exe_dir()                    # 获取 exe 所在目录
- load_config()                    # 从 config.json 加载配置
- save_config(config_dict)         # 保存配置到 config.json
- DEFAULT_CONFIG                   # 默认配置字典
```

**配置文件位置**: exe 同目录的 `config.json`

**关键代码**:
```python
import os
import sys
import json

def get_exe_dir():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

CONFIG_FILE = os.path.join(get_exe_dir(), 'config.json')
```

---

#### 2. 创建 `config.json.example`
**内容**:
```json
{
  "MYSQL_HOST": "localhost",
  "MYSQL_PORT": 3306,
  "MYSQL_USER": "root",
  "MYSQL_PASSWORD": "root",
  "MYSQL_DB": "zhenghe",
  "REDIS_HOST": "localhost",
  "REDIS_PORT": 6379,
  "API_HOST": "127.0.0.1",
  "API_PORT": 8000,
  "COLLECT_URLS": {
    "am": "https://qnjl.zkclhb.com:2025/am.html",
    "hk": "https://qnjl.zkclhb.com:2025/hk.html"
  },
  "COLLECT_HISTORY_URLS": {
    "am": "https://qnjl.zkclhb.com:2025/2023.html",
    "hk": "https://qnjl.zkclhb.com:2025/20221.html"
  }
}
```

---

### 阶段二：数据库层优化（优先级：高）

#### 3. 重写 `backend/db.py`
**目标**: 添加连接池、连接测试、打包后路径支持

**新增功能**:
```python
- init_pool()                      # 初始化连接池
- get_connection()                 # 从连接池获取连接（替换原实现）
- test_connection()                # 测试数据库连接
- get_resource_path(relative_path) # 获取资源文件路径
```

**连接池配置**:
```python
from mysql.connector import pooling

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
```

---

#### 4. 创建 `backend/init_db.py`
**目标**: 数据库初始化工具

**功能清单**:
```python
- create_database()    # 创建数据库
- create_tables()      # 创建所有表（lottery_result, recommend_8, recommend_16）
- init_all()           # 一键完整初始化
```

**表结构**:
```sql
CREATE TABLE IF NOT EXISTS lottery_result (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lottery_type VARCHAR(10) NOT NULL,
    period VARCHAR(20) NOT NULL,
    open_time DATE NOT NULL,
    lunar_date VARCHAR(20),
    numbers VARCHAR(100) NOT NULL,
    animals VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_period (lottery_type, period),
    INDEX idx_type_time (lottery_type, open_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recommend_8 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lottery_type VARCHAR(10) NOT NULL,
    base_period VARCHAR(20) NOT NULL,
    recommend VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_period (lottery_type, base_period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS recommend_16 (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lottery_type VARCHAR(10) NOT NULL,
    base_period VARCHAR(20) NOT NULL,
    recommend VARCHAR(200) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_type_period (lottery_type, base_period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 阶段三：启动器开发（优先级：高）

#### 5. 创建 `launcher.py`
**目标**: 主启动入口，带数据库检查和配置指引

**功能清单**:
```python
- get_resource_path(relative_path) # 资源路径处理
- check_database()                 # 检查数据库连接
- show_db_config_guide()           # 显示配置指引
- open_browser(port)               # 延迟打开浏览器
- main()                           # 主入口
```

**启动流程**:
1. 打印欢迎信息
2. 检查数据库连接
   - 成功：继续启动
   - 失败：显示配置指引，生成 config.json 模板，退出
3. 加载配置
4. 后台线程打开浏览器（延迟 3 秒）
5. 启动 uvicorn 服务
6. 捕获 Ctrl+C 优雅退出

**关键代码**:
```python
import uvicorn
import webbrowser
import threading
import time
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def main():
    print("="*50)
    print("彩票分析系统启动中...")
    print("="*50)

    if not check_database():
        input("按回车键退出...")
        sys.exit(1)

    from backend import config
    host = config.API_HOST
    port = config.API_PORT

    print(f"\n服务地址: http://{host}:{port}")
    print("按 Ctrl+C 停止服务\n")

    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    uvicorn.run("backend.main:app", host=host, port=port, log_level="info")
```

---

### 阶段四：API 增强（优先级：中）

#### 6. 在 `backend/main.py` 中添加配置管理端点

**新增 API**:
```python
@app.get("/api/config")
def get_config_api():
    """获取当前配置（隐藏敏感信息）"""
    safe_config = {
        "MYSQL_HOST": config.MYSQL_HOST,
        "MYSQL_PORT": config.MYSQL_PORT,
        "MYSQL_DB": config.MYSQL_DB,
        "API_PORT": config.API_PORT,
    }
    return safe_config

@app.post("/api/config")
def update_config_api(new_config: dict):
    """更新配置"""
    try:
        current = config.load_config()
        current.update(new_config)
        if config.save_config(current):
            return {"success": True, "message": "配置已保存，请重启应用生效"}
        return {"success": False, "message": "配置保存失败"}
    except Exception as e:
        return {"success": False, "message": str(e)}

@app.get("/api/db_status")
def db_status_api():
    """检查数据库状态"""
    from backend import db
    result = db.test_connection()
    if result is True:
        return {"connected": True, "message": "数据库连接正常"}
    return {"connected": False, "message": result[1]}
```

**用途**:
- 前端可显示数据库连接状态
- 支持在线修改配置（需重启生效）

---

### 阶段五：Redis 可选化（优先级：中）

#### 7. 修改 `backend/cache.py`

**目标**: Redis 不可用时降级为文件缓存

**修改方案**:
```python
from . import config
import redis
import json
import os

# 尝试连接 Redis
try:
    r = redis.Redis(
        host=config.REDIS_HOST,
        port=getattr(config, 'REDIS_PORT', 6379),
        db=0,
        decode_responses=True
    )
    # 测试连接
    r.ping()
    REDIS_AVAILABLE = True
except Exception as e:
    print(f"Redis 不可用，将使用文件缓存: {e}")
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
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
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
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(value, f, ensure_ascii=False)
```

---

### 阶段六：打包配置（优先级：高）

#### 8. 创建 `build.spec`

**PyInstaller 配置文件**:
```python
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['launcher.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('frontend', 'frontend'),      # 前端静态文件
        ('backend', 'backend'),        # 后端 Python 模块
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops.auto',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan.on',
        'mysql.connector',
        'mysql.connector.pooling',
        'httpx',
        'bs4',
        'pandas',
        'redis',
        'lunarcalendar',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy.tests',
        'pandas.tests',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='彩票分析系统',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,              # 保留控制台窗口，方便查看日志
    disable_windowed_traceback=False,
    icon='icon.ico'            # 应用图标（需准备）
)
```

---

#### 9. 创建 `requirements.txt`

**依赖清单**:
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
httpx==0.25.1
beautifulsoup4==4.12.2
pandas==2.1.3
mysql-connector-python==8.2.0
redis==5.0.1
lunarcalendar==3.0.0
python-multipart==0.0.6
pyinstaller==6.2.0
```

---

#### 10. 准备应用图标（可选）

**文件**: `icon.ico`

**制作方式**:
- 使用在线工具将 PNG 转换为 ICO 格式
- 推荐尺寸：256x256 或 512x512
- 放在项目根目录

---

### 阶段七：文档和工具（优先级：中）

#### 11. 创建 `使用说明.txt`

**内容**:
```txt
====================================
   彩票分析系统 - 使用说明
====================================

【环境要求】
1. Windows 操作系统（Windows 7 及以上）
2. MySQL 数据库服务（5.7+ 或 8.0+）
3. 确保 MySQL 服务已启动

【首次使用】
步骤 1: 安装 MySQL 数据库
   - 下载地址: https://dev.mysql.com/downloads/mysql/
   - 安装时记住设置的 root 密码

步骤 2: 运行程序
   - 双击 "彩票分析系统.exe"

步骤 3: 配置数据库连接
   - 如果提示数据库连接失败
   - 编辑同目录下的 config.json 文件
   - 修改以下参数：
     * MYSQL_HOST: 数据库地址（本机填 localhost）
     * MYSQL_PORT: 数据库端口（默认 3306）
     * MYSQL_USER: 数据库用户名（默认 root）
     * MYSQL_PASSWORD: 数据库密码（安装时设置的密码）
     * MYSQL_DB: 数据库名称（默认 zhenghe，会自动创建）

步骤 4: 初始化数据库
   - 方式 1: 程序会自动尝试创建数据库和表
   - 方式 2: 手动运行 SQL 命令（见下方）

【配置文件说明】
config.json 参数详解:
{
  "MYSQL_HOST": "localhost",       // 数据库地址
  "MYSQL_PORT": 3306,              // 数据库端口
  "MYSQL_USER": "root",            // 数据库用户名
  "MYSQL_PASSWORD": "root",        // 数据库密码
  "MYSQL_DB": "zhenghe",           // 数据库名称
  "REDIS_HOST": "localhost",       // Redis地址（可选）
  "REDIS_PORT": 6379,              // Redis端口（可选）
  "API_HOST": "127.0.0.1",         // 服务地址（不建议修改）
  "API_PORT": 8000                 // 服务端口（如被占用可修改）
}

【手动创建数据库】
如果自动创建失败，请执行以下命令:

1. 打开命令提示符（cmd）
2. 输入: mysql -u root -p
3. 输入密码
4. 执行: CREATE DATABASE zhenghe CHARACTER SET utf8mb4;
5. 执行: USE zhenghe;
6. 然后重新运行程序，会自动创建表

【常见问题】

Q1: 提示"数据库连接失败"？
A: 检查以下几点
   - MySQL 服务是否启动（服务管理中查看）
   - config.json 中的用户名密码是否正确
   - 防火墙是否拦截了 3306 端口

Q2: 提示"端口 8000 被占用"？
A: 修改 config.json 中的 API_PORT 为其他端口（如 8001, 8080）

Q3: 程序闪退？
A: 可能是缺少依赖或配置错误
   - 检查 config.json 格式是否正确（必须是有效的 JSON）
   - 尝试删除 config.json 让程序重新生成

Q4: 不需要 Redis 可以吗？
A: 可以，Redis 是可选的缓存服务
   - 如果没有安装 Redis，程序会自动降级为文件缓存

Q5: 如何卸载？
A: 直接删除程序文件夹即可
   - 如需删除数据，在 MySQL 中执行: DROP DATABASE zhenghe;

【技术支持】
- 项目地址: [填写您的仓库地址]
- 问题反馈: [填写您的联系方式]

【版本信息】
版本: 1.0.0
更新日期: 2025-10-03
```

---

#### 12. 创建 `build.bat`

**自动化打包脚本**:
```batch
@echo off
chcp 65001 >nul
echo ====================================
echo   彩票分析系统 - 自动打包脚本
echo ====================================
echo.

echo [1/5] 检查依赖...
pip list | findstr pyinstaller >nul
if %errorlevel% neq 0 (
    echo PyInstaller 未安装，正在安装...
    pip install pyinstaller
)

echo.
echo [2/5] 清理旧文件...
if exist "dist" (
    rmdir /s /q dist
    echo 已删除 dist 目录
)
if exist "build" (
    rmdir /s /q build
    echo 已删除 build 目录
)

echo.
echo [3/5] 开始打包...
pyinstaller build.spec

if %errorlevel% neq 0 (
    echo.
    echo [错误] 打包失败！
    pause
    exit /b 1
)

echo.
echo [4/5] 复制配置文件...
copy config.json.example "dist\config.json.example"
copy 使用说明.txt "dist\使用说明.txt"

echo.
echo [5/5] 打包完成！
echo.
echo 输出目录: dist\
echo 可执行文件: dist\彩票分析系统.exe
echo.
echo ====================================
pause
```

---

### 阶段八：测试和优化（优先级：中）

#### 13. 修改所有相对导入为绝对导入

**需要检查的文件**:
- `backend/main.py`
- `backend/collect.py`
- `backend/analysis.py`
- `backend/cache.py`

**修改示例**:
```python
# 修改前
from . import config
from . import db

# 修改后
import config
import db

# 或使用完整路径
from backend import config
from backend import db
```

**特别注意**:
- `collect.py` 中已有兼容代码:
  ```python
  try:
      from backend.db import get_connection
  except ImportError:
      from db import get_connection
  ```
  这种写法在打包后也能正常工作

---

#### 14. 测试清单

**开发环境测试**:
- [ ] 配置文件读写功能
- [ ] 数据库连接池工作正常
- [ ] 采集功能正常
- [ ] 分析功能正常
- [ ] 推荐功能正常
- [ ] 前端页面访问正常
- [ ] Redis 不可用时降级正常

**打包后测试**:
- [ ] 首次运行生成 config.json
- [ ] 数据库连接检查正常
- [ ] 配置错误时提示友好
- [ ] 自动打开浏览器
- [ ] 采集功能正常
- [ ] 分析功能正常
- [ ] Ctrl+C 正常退出
- [ ] 配置修改后重启生效

**异常场景测试**:
- [ ] MySQL 未启动时的提示
- [ ] 配置文件格式错误时的处理
- [ ] 端口被占用时的提示
- [ ] 数据库密码错误时的提示

---

## 文件改动清单

### 需要修改的现有文件
| 文件路径 | 改动程度 | 主要改动内容 |
|---------|---------|------------|
| `backend/config.py` | 重写 | 添加外部配置文件支持 |
| `backend/db.py` | 重写 | 添加连接池和连接测试 |
| `backend/cache.py` | 中等 | 添加 Redis 降级方案 |
| `backend/main.py` | 轻微 | 添加配置管理 API（约 30 行） |

### 需要新建的文件
| 文件路径 | 行数估计 | 用途 |
|---------|---------|------|
| `launcher.py` | 80-100 | 主启动入口 |
| `backend/init_db.py` | 100-120 | 数据库初始化工具 |
| `build.spec` | 60-80 | PyInstaller 配置 |
| `requirements.txt` | 10-15 | 依赖清单 |
| `config.json.example` | 20-30 | 配置文件模板 |
| `使用说明.txt` | 150-200 | 用户手册 |
| `build.bat` | 40-50 | 自动打包脚本 |
| `icon.ico` | - | 应用图标（可选） |

### 不受影响的文件
- ✅ `backend/collect.py` - 无需修改
- ✅ `backend/analysis.py` - 无需修改
- ✅ `frontend/` - 所有前端文件无需修改

---

## 打包流程

### 环境准备
```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 准备图标（可选）
# 将 icon.ico 放在项目根目录
```

### 打包命令
```bash
# 方式 1: 使用批处理脚本（推荐）
build.bat

# 方式 2: 手动执行
pyinstaller build.spec
```

### 打包后目录结构
```
dist/
├── 彩票分析系统.exe      # 主程序（约 50-80MB）
└── _internal/            # PyInstaller 生成的内部文件夹
    ├── frontend/         # 前端文件
    ├── backend/          # 后端模块
    └── ...              # 其他依赖库

发布时需要复制:
├── 彩票分析系统.exe
├── _internal/           # 整个文件夹
├── config.json.example  # 配置模板（手动复制）
└── 使用说明.txt         # 用户手册（手动复制）
```

### 发布准备
1. 将 `dist/` 目录压缩为 ZIP
2. 重命名为 `彩票分析系统_v1.0.0.zip`
3. 上传到发布平台

---

## 优势总结

### 对用户的优势
- ✅ 无需安装 Python 环境
- ✅ 双击即可运行
- ✅ 配置文件可视化（JSON）
- ✅ 友好的错误提示
- ✅ 自动打开浏览器

### 对开发者的优势
- ✅ 配置外部化，易于维护
- ✅ 连接池优化性能
- ✅ 模块化设计，职责清晰
- ✅ 完善的异常处理
- ✅ 支持快速迭代发布

### 技术优势
- ✅ 保留 MySQL 的性能和多用户支持
- ✅ Redis 可选，降低部署门槛
- ✅ 连接池减少数据库压力
- ✅ 支持在线配置管理
- ✅ 兼容开发和打包环境

---

## 预估时间

| 阶段 | 时间估计 | 难度 |
|-----|---------|-----|
| 阶段一：配置系统重构 | 1-2 小时 | 低 |
| 阶段二：数据库层优化 | 2-3 小时 | 中 |
| 阶段三：启动器开发 | 2-3 小时 | 中 |
| 阶段四：API 增强 | 1 小时 | 低 |
| 阶段五：Redis 可选化 | 1 小时 | 低 |
| 阶段六：打包配置 | 1-2 小时 | 中 |
| 阶段七：文档和工具 | 1-2 小时 | 低 |
| 阶段八：测试和优化 | 2-3 小时 | 中 |
| **总计** | **11-18 小时** | - |

---

## 注意事项

### 开发环境
- 建议在虚拟环境中测试打包
- 打包前确保所有依赖版本固定

### 打包体积优化
- 排除不必要的依赖（如 matplotlib）
- 使用 UPX 压缩（已在 spec 中启用）
- 考虑使用 `--exclude-module` 进一步精简

### 数据库相关
- 首次运行需提示用户安装 MySQL
- 考虑提供 MySQL 下载链接
- 建议在文档中说明端口开放问题

### 后续优化方向
- 添加系统托盘图标
- 实现配置界面（GUI）
- 添加自动更新功能
- 实现数据库自动备份

---

## 联系方式
如有问题，请联系开发者或提交 Issue。

---

**文档版本**: 1.0
**创建日期**: 2025-10-03
**最后更新**: 2025-10-03
