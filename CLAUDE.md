# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

彩票分析系统 - 基于 FastAPI + MySQL 的澳门/香港彩票数据采集和分析系统，支持自动推荐号码生成、多维度数据分析和投注管理。

## 架构设计

### 技术栈
- **后端**: FastAPI + uvicorn，使用 MySQL 连接池（pool_size=5）
- **Python**: 3.13.5+ (推荐 3.7+)
- **前端**: 纯 HTML/CSS/JavaScript，单页应用架构
- **数据库**: MySQL 5.7+（支持连接池）
- **配置**: 外部 config.json 文件（支持 PyInstaller 打包后读取）
- **定时任务**: APScheduler 实现自动采集

### 模块化路由设计
后端采用 FastAPI Router 模块化设计，主要模块：
- `collect.py`: 数据采集（主源 + 备用源双重保障）
- `recommend.py`: 推荐号码生成（8码/16码）
- `analysis.py`: 多维度分析（区间、位置、波色等）~1969行
- `analysis_seventh_smart.py`: 第7个号码智能推荐20码（基于多维度评分）
- `analysis_two_groups.py`: 2组观察分析（冷门9码+剩余40码分组）
- `analysis_number_gap.py`: 号码间隔期数分析（计算位置间隔）
- `favorites.py`: 关注号码管理和统计 ~753行
- `betting.py`: 投注点管理和报表

所有路由在 `backend/main.py` 中注册。

### 工具箱模块（重要）
项目在 `backend/utils/` 目录下提供了通用工具模块，用于消除代码重复：

**核心工具模块**：
- `number_utils.py`: 号码循环处理（1-49范围）
  - `wrap_in_range(value, min, max)`: 通用循环函数（推荐使用）
  - `plus49_wrap(value)`: 正向循环（>49→1）
  - `minus49_wrap(value)`: 反向循环（<1→49）
  - `apply_offsets(base, offsets)`: 批量偏移计算

- `db_utils.py`: 数据库操作封装
  - `get_db_cursor(commit=False)`: 上下文管理器（自动管理连接）
  - `query_records(sql, params)`: 简化查询
  - `find_next_period(lottery_type, period)`: 查找下一期
  - `get_latest_period(lottery_type, ending_digit)`: 获取最新期号

- `export_utils.py`: CSV导出
  - `create_csv_response(data, headers, filename)`: 生成CSV响应

- `pagination_utils.py`: 分页工具
  - `paginate(items, page, page_size)`: 列表分页
  - `calculate_pagination(total, page, page_size)`: 分页计算

**使用方式**：
```python
# 推荐方式：从 backend.utils 统一导入
from backend.utils import get_db_cursor, wrap_in_range, create_csv_response

# 或者导入子模块
from backend.utils import number_utils, db_utils
```

**重要提示**：
- 新功能优先使用工具箱函数，避免重复造轮子
- 工具箱已在 `analysis.py` 和其他模块中广泛使用
- 详细文档见 `backend/utils/README.md`

### 托盘服务（Windows）
项目提供了后台托盘服务，方便在 Windows 系统上运行：
- `tray_app.py`: 系统托盘主程序（绿色"彩"字图标）
- `service_manager.py`: 前后端服务管理模块
- 支持开机自启动
- 支持系统托盘菜单：打开网页、查看状态、重启服务、退出
- 单实例检测，防止重复启动
- 详细文档见 `托盘服务使用说明.md`

## 开发命令

### 启动项目
```bash
# 方式1：使用托盘服务（推荐用于 Windows）
# 双击运行 启动托盘服务.bat 或 启动托盘服务.vbs
# 或命令行启动：
pythonw tray_app.py

# 方式2：标准启动
python launcher.py

# 方式3：批处理启动（Windows）
一键启动.bat

# 方式4：手动启动各服务
# 后端
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 前端（新终端）
python -m http.server 8080 -d frontend
```

启动后：
- 后端 API: http://localhost:8000
- 前端界面: http://localhost:8080
- API 文档: http://localhost:8000/docs
- 托盘图标：系统托盘右下角绿色"彩"字图标（托盘服务方式）

### 数据库初始化
```bash
# 创建默认配置文件
python -c "from backend.config import create_default_config; create_default_config()"

# 修改 config.json 中的数据库配置后，运行初始化脚本
python backend/init_database.py
```

### 托盘服务依赖安装（仅Windows）
```bash
# 运行安装脚本
安装依赖.bat

# 或手动安装
pip install -r requirements_tray.txt
# 包含：pystray、Pillow、psutil、requests
```

### 打包 EXE
```bash
# 使用 PyInstaller
pyinstaller build.spec

# 生成的 EXE 位于 dist/ 目录
```

## 核心业务逻辑

### 自动推荐生成机制
**触发条件**: 当采集到期号以 `0` 或 `5` 结尾的开奖数据时，系统自动生成推荐号码。

实现位置: `backend/routes/collect.py:30-57`

系统会自动执行三个推荐算法：
1. **推荐8码**: 基于前50期数据的频率和间隔分析
2. **推荐16码**: 基于前100期数据的频率和间隔分析
3. **第7个号码智能推荐20码**: 基于多维度评分（频率、遗漏、趋势、连号、稳定性）

```python
if period.endswith(('0', '5')):
    # 自动调用三个推荐算法
    recommend_api(type)  # 推荐8码
    recommend16_api(type)  # 推荐16码
    _generate_seventh_smart_history_internal(type)  # 第7个号码智能推荐20码
```

### 推荐算法核心
基于前 **50 期**历史数据的频率和间隔分析：

1. 计算每个位置（1-7）各号码的出现频率
2. 计算平均间隔：`avg_gap = (50 - last_idx) / count`
3. 筛选条件：`4 <= avg_gap <= 6` 的候选号码
4. 按最后出现位置排序，取前 8/16 个

实现位置: `backend/routes/recommend.py:23-47`

### 双数据源采集
主源采集失败时自动切换备用源（WENLONGZHU_URLS）。

实现位置: `backend/routes/collect.py:14-23`

### 区间分析
对每个开奖号码生成 6 个区间分析：
- `+1~+20`, `+5~+24`, `+10~+29`, `+15~+34`, `+20~+39`, `+25~+44`
- 检查下一期开奖号码是否命中区间

实现位置: `backend/analysis.py:54-64`

## 配置管理

### config.json 结构
```json
{
  "MYSQL_HOST": "localhost",
  "MYSQL_PORT": 3306,
  "MYSQL_USER": "root",
  "MYSQL_PASSWORD": "root",
  "MYSQL_DB": "zhenghe",
  "API_HOST": "0.0.0.0",
  "API_PORT": 8000,
  "backend_port": 8000,
  "frontend_port": 8080,
  "COLLECT_URLS": {
    "am": "https://...",
    "hk": "https://..."
  },
  "COLLECT_HISTORY_URLS": {
    "am": "https://...",
    "hk": "https://..."
  },
  "WENLONGZHU_URLS": {
    "am": "https://...",
    "hk": "https://..."
  }
}
```

配置读取支持 PyInstaller 打包后的 EXE 运行（使用 `sys.frozen` 检测）。

实现位置: `backend/config.py`

**配置项说明**:
- `MYSQL_*`: 数据库连接配置
- `API_HOST/API_PORT`: 后端服务地址和端口
- `backend_port/frontend_port`: 后端和前端端口（托盘服务使用）
- `COLLECT_URLS`: 主数据采集源（澳门/香港）
- `COLLECT_HISTORY_URLS`: 历史数据采集源
- `WENLONGZHU_URLS`: 备用数据采集源

## 数据库表结构

### lottery_result (开奖数据表)
- `period`: 期号（如 "2025198"）
- `lottery_type`: 彩种（"am"=澳门, "hk"=香港）
- `numbers`: 开奖号码（逗号分隔）
- `animals`: 对应生肖
- `open_time`: 开奖时间

### recommend_result (推荐8码表)
- `period`: 基于的期号
- `position`: 位置（1-7）
- `numbers`: 推荐的8个号码（逗号分隔）
- `lottery_type`: 彩种

### recommend16_result (推荐16码表)
结构同 recommend_result，但包含 16 个号码。

### seventh_smart20_history (第7个号码智能推荐20码表)
- `period`: 推荐基于的期号
- `lottery_type`: 彩种
- `top20_numbers`: Top20推荐号码（逗号分隔）
- `scores`: 各号码的评分数据（JSON格式）
- `created_at`: 生成时间

每期推荐基于该期往前100期的历史数据独立计算。

### places (关注号码表)
用户自定义的关注点位置和号码，支持遗漏统计。

### betting_places (投注点表)
投注登记和统计数据。

## 代码约束

### Python 文件行数控制
**重要**: Python 文件尽量控制在 **800 行左右**。

当前状态：
- `backend/routes/analysis.py`: ~1900 行（需要重构）
- `backend/routes/favorites.py`: ~750 行（合理）
- `backend/main.py`: ~55 行（良好）

### 前端架构
前端采用模块化架构：

**核心模块**：
- `config.js`: 后端地址配置
- `utils.js`: 工具函数（颜色、日期、CSV导出等）~250行
- `api.js`: API请求封装（所有后端接口）~400行
- `pages.js`: 页面管理和菜单系统 ~180行
- `main.js`: 主入口和全局初始化 ~100行

**功能模块**：
- `upload.js`: 主要功能模块（~7744行，包含大部分分析功能）
- `recommend16.js`: 推荐16码专用模块
- `fivePeriodThreexiao.js`: 五期三肖分析模块
- `seventhSmart20.js`: 第7个号码智能推荐20码模块
- `twoGroups.js`: 2组观察分析模块
- `numberGapAnalysis.js`: 号码间隔期数分析模块

**注意**:
- `upload.js` 过大（7744行），需要拆分成更小的模块
- 前端新功能应创建独立模块，每个模块控制在 300-800 行

## 重要 API 端点

### 数据采集相关
- `GET /collect?type={am|hk}`: 手动采集（主源 + 备用源）
- `GET /collect_wenlongzhu?type={am|hk}`: 文龙珠源采集
- `GET /records`: 获取开奖记录（支持分页和筛选）

### 推荐生成
- `GET /recommend?type={am|hk}`: 生成推荐8码（基于前50期）
- `GET /recommend16?type={am|hk}`: 生成推荐16码（基于前100期）
- `GET /api/seventh_smart_recommend20?lottery_type={am|hk}`: 第7个号码智能推荐20码

### 分析功能
- 多维度分析端点位于 `backend/routes/analysis.py`
  - 区间分析、位置分析、肖分析、波色分析等
- 第7个号码智能推荐分析位于 `backend/routes/analysis_seventh_smart.py`
  - `GET /api/seventh_smart_recommend20`: 生成智能推荐20码
  - `GET /api/seventh_smart_history`: 查询历史推荐记录
- 2组观察分析位于 `backend/routes/analysis_two_groups.py`
  - `GET /api/two_groups_analysis`: 冷门9码分析和2组分配
  - `GET /api/two_groups_export`: 导出2组分析CSV
- 号码间隔期数分析位于 `backend/routes/analysis_number_gap.py`
  - `GET /api/number_gap_analysis`: 计算号码位置间隔
  - `GET /api/number_gap_export`: 导出间隔分析CSV
- 关注号码管理端点位于 `backend/routes/favorites.py`
- 投注管理端点位于 `backend/routes/betting.py`

## 数据流程图

### 采集 → 推荐流程
```
1. 数据采集 (手动/定时)
   主源失败 → 自动切换到备用源（WENLONGZHU_URLS）
   ↓
2. 保存到 lottery_result 表
   ↓
3. 检查期号是否以0或5结尾
   ↓
4. 自动生成三种推荐
   - 推荐8码（前50期分析）
   - 推荐16码（前100期分析）
   - 第7个号码智能推荐20码（100期多维度评分）
   ↓
5. 保存到对应的推荐表
   - recommend_result
   - recommend16_result
   - seventh_smart20_history
```

## 常见任务

### 添加新的分析功能
1. **后端开发**：
   - 如果 `analysis.py` 接近2000行，考虑创建新的路由模块（如 `analysis_xxx.py`）
   - 优先使用工具箱函数：`from backend.utils import get_db_cursor, wrap_in_range`
   - 在 `backend/main.py` 中注册新路由

2. **前端开发**：
   - 在 `frontend/api.js` 添加 API 请求函数
   - 创建新的独立模块文件（不要添加到 `upload.js`）
   - 在 `frontend/index.html` 添加菜单项和引入新模块

3. **注意事项**：
   - Python文件控制在800行内
   - JavaScript模块控制在300-800行内
   - 使用工具箱避免重复代码

### 修改推荐算法
核心文件: `backend/routes/recommend.py`
- `recommend_api()`: 8码推荐
- `recommend16_api()`: 16码推荐

修改后测试：采集以0或5结尾的期号数据，触发自动生成。

### 调试数据采集问题
当某个彩种采集失败时：

1. **检查配置**：
   - 打开 `config.json`，确认 `COLLECT_URLS` 和 `WENLONGZHU_URLS` 配置正确
   - 澳门：`COLLECT_URLS.am` 和 `WENLONGZHU_URLS.am`
   - 香港：`COLLECT_URLS.hk` 和 `WENLONGZHU_URLS.hk`

2. **查看日志**：
   - 查看控制台输出的采集日志
   - 主源失败会自动尝试备用源（WENLONGZHU_URLS）

3. **手动测试**：
   - 访问 `http://localhost:8000/collect?type=am` 测试澳门采集
   - 访问 `http://localhost:8000/collect_wenlongzhu?type=am` 测试备用源

4. **常见问题**：
   - 网页编码问题：`collect.py` 使用 `apparent_encoding` 自动检测
   - HTML结构变化：检查 `collect.py:61-100` 的 BeautifulSoup 解析逻辑
   - 网络超时：调整 `httpx.get(timeout=15)`

实现位置：`backend/collect.py:45-100`

### 数据库连接问题
- 连接配置在 `config.json` 中
- 连接池初始化在 `backend/db.py`
- 启动时会自动测试连接：`launcher.py`

### 配置托盘服务
1. 安装托盘依赖：运行 `安装依赖.bat`
2. 启动托盘服务：运行 `启动托盘服务.bat` 或 `启动托盘服务.vbs`
3. 配置开机自启：参考 `开机自启动配置.md`
4. 查看日志：`logs/tray_app.log`

## 重要约定和最佳实践

### 代码复用原则
**强制要求**：所有新功能必须优先检查 `backend/utils/` 工具箱是否有可用函数

示例：
```python
# ❌ 错误：重复定义循环函数
def my_plus49(n):
    return n if n <= 49 else n - 49

# ✓ 正确：使用工具箱
from backend.utils import wrap_in_range
result = wrap_in_range(n, 1, 49)
```

### 数据库操作规范
**强制要求**：使用 `get_db_cursor()` 上下文管理器，避免连接泄漏

```python
# ❌ 错误：手动管理连接
from backend.db import get_connection
conn = get_connection()
cursor = conn.cursor(dictionary=True)
# ... 可能忘记关闭

# ✓ 正确：使用上下文管理器
from backend.utils import get_db_cursor
with get_db_cursor() as cursor:
    cursor.execute("SELECT * FROM lottery_result WHERE lottery_type=%s", ('am',))
    rows = cursor.fetchall()
# 自动关闭
```

### 文件大小管理
- **Python文件**: 目标 800 行，最大不超过 1500 行
- **JavaScript模块**: 目标 300-800 行
- **超过限制时**: 必须拆分成独立模块

当前超标文件（需重构）：
- `backend/routes/analysis.py`: 1969 行 → 建议拆分成多个专题分析模块
- `frontend/upload.js`: 7744 行 → 建议按功能拆分成10+个独立模块

### Git提交规范
项目使用中文提交信息，最近的提交示例：
```
- "优化关注号码管理功能：添加遗漏统计和修复分页问题"
- "refactor: 全项目重构 - 使用工具箱统一数据库和CSV操作"
- "feat: 第7个号码智能推荐20码 - 每期独立计算并持久化"
```

建议格式：`<type>: <描述>`
- `feat`: 新功能
- `fix`: 修复bug
- `refactor`: 重构
- `docs`: 文档更新

## 快速参考

### 最常用的工具函数
```python
# 数据库查询
from backend.utils import get_db_cursor, query_records
with get_db_cursor() as cursor:
    cursor.execute(sql, params)

# 号码循环
from backend.utils import wrap_in_range
result = wrap_in_range(value, 1, 49)

# CSV导出
from backend.utils import create_csv_response
return create_csv_response(data, headers, "filename.csv")
```

### 最常用的开发命令
```bash
# 启动开发环境
python launcher.py

# 初始化/更新数据库
python backend/init_database.py

# 安装托盘服务依赖（Windows）
安装依赖.bat

# 打包EXE
pyinstaller build.spec
```

## 最新功能说明

### 2组观察分析 (analysis_two_groups.py)
**功能**: 基于指定期号往前100期的历史数据，找出冷门9码，将剩余40码分成2组进行观察分析。

**核心算法**:
1. 统计前100期第7个号码的出现频率
2. 找出出现次数最少的9个号码作为"冷门9码"
3. 将剩余40个号码按出现频率排序，平均分成两组（每组20个）
4. 支持CSV导出分析结果

**使用场景**: 帮助用户识别长期未出现的号码，制定投注策略。

**实现位置**: `backend/routes/analysis_two_groups.py`

### 号码间隔期数分析 (analysis_number_gap.py)
**功能**: 计算每期开奖号码在对应位置距离上次出现的间隔期数。

**核心算法**:
1. 为7个位置分别记录每个号码最后出现的期号索引
2. 计算当前期与上次出现的间隔期数（当前索引 - 上次索引 - 1）
3. 首次出现的号码标记为 -1
4. 支持CSV导出，便于趋势分析

**使用场景**:
- 分析号码在特定位置的出现规律
- 识别长期未出现的位置号码组合
- 辅助制定投注策略

**实现位置**: `backend/routes/analysis_number_gap.py`

**注意事项**:
- 间隔分析需要大量历史数据支撑，建议至少100期以上
- 分析结果按期号正序排列，方便观察趋势变化
