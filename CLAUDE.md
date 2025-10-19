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
- `collect.py`: 数据采集（主源 + 备用源双重保障）+ 定时采集调度器 API
- `recommend.py`: 推荐号码生成（8码/16码）
- `analysis.py`: 多维度分析（区间、位置、波色等）
- `favorites.py`: 关注点管理和统计
- `betting.py`: 投注点管理和报表
- `web_collect.py`: 网址采集管理（采集源配置、执行采集、结果验证）

所有路由在 `backend/main.py` 中注册。

### 核心服务模块
位于 `backend/services/` 目录：
- `web_collector.py`: 网址数据采集器（支持 CSS/XPath/正则三种提取方式）
- `result_verifier.py`: 采集结果自动验证服务（对比开奖结果）

### 定时任务系统
`backend/scheduler.py`: APScheduler 实现的自动采集调度器
- 支持每日定时采集（澳门/香港可独立配置时间）
- 自动重试机制（可配置重试次数）
- 采集日志记录（最多保留100条）
- 应用启动时自动加载并启动调度器（在 `main.py:startup_event`）

## 开发命令

### 启动项目
```bash
# 主启动方式（推荐）
python launcher.py

# 或使用批处理文件（Windows）
一键启动.bat

# 手动启动后端
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 手动启动前端
python -m http.server 8080 -d frontend
```

启动后：
- 后端 API: http://localhost:8000
- 前端界面: http://localhost:8080
- API 文档: http://localhost:8000/docs

### 数据库初始化
```bash
# 创建默认配置文件
python -c "from backend.config import create_default_config; create_default_config()"

# 修改 config.json 中的数据库配置后，运行初始化脚本
python backend/init_database.py
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

实现位置:
- `backend/routes/collect.py:38-56` (手动采集触发)
- `backend/scheduler.py:108-121` (定时采集触发)

```python
if period.endswith(('0', '5')):
    # 自动调用 recommend_api() 和 recommend16_api()
```

### 自动验证机制
**触发条件**: 当采集到新的开奖数据时，系统自动触发网址采集结果验证。

实现位置: `backend/routes/collect.py:27-35`

流程:
1. 采集到开奖数据后，调用 `result_verifier.verify_period()`
2. 对比 `collected_data` 表中相同期号的预测数据
3. 更新 `is_correct` 和 `match_detail` 字段
4. 支持号码和生肖两种类型的验证

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
  "COLLECT_URLS": {
    "am": "https://...",
    "hk": "https://..."
  },
  "WENLONGZHU_URLS": {
    "am": "https://...",
    "hk": "https://..."
  },
  "AUTO_COLLECT": {
    "enabled": true,
    "retry_times": 3,
    "am_time": "21:35",
    "hk_time": "21:30",
    "source": "default"
  }
}
```

配置读取支持 PyInstaller 打包后的 EXE 运行（使用 `sys.frozen` 检测）。

实现位置: `backend/config.py`

**AUTO_COLLECT 配置说明**:
- `enabled`: 是否启用自动采集
- `retry_times`: 采集失败重试次数（默认3次）
- `am_time`: 澳门彩每日采集时间（24小时格式）
- `hk_time`: 香港彩每日采集时间（24小时格式）
- `source`: 数据源类型（`default` 或 `wenlongzhu`）

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

### places (关注点表)
用户自定义的关注点位置和号码。

### betting_places (投注点表)
投注登记和统计数据。

### collect_sources (网址采集源表)
- `name`: 采集源名称
- `url`: 采集网址
- `lottery_type`: 彩种（"am"/"hk"）
- `data_type`: 数据类型（"numbers"=号码, "animals"=生肖）
- `extract_config`: 提取配置（JSON格式，包含 method、selector/pattern/xpath）
- `is_active`: 是否启用
- `description`: 采集源描述

支持三种数据提取方式:
1. **CSS选择器**: `{"method": "css", "selector": ".lottery-number"}`
2. **正则表达式**: `{"method": "regex", "pattern": "\\d{2}"}`
3. **XPath**: `{"method": "xpath", "xpath": "//div[@class='num']"}`

### collected_data (网址采集结果表)
- `source_id`: 关联采集源ID
- `period`: 预测期号
- `predicted_values`: 预测值（号码或生肖）
- `is_correct`: 是否命中（验证后更新）
- `match_detail`: 命中详情（JSON格式，包含命中率等）
- `collected_at`: 采集时间

## 代码约束

### Python 文件行数控制
**重要**: Python 文件尽量控制在 **800 行左右**。

当前状态：
- `backend/routes/analysis.py`: ~1900 行（需要重构）
- `backend/routes/favorites.py`: ~750 行（合理）
- `backend/main.py`: ~55 行（良好）

### 前端架构
前端已优化为模块化架构：

**核心模块**（已完成）：
- `config.js`: 后端地址配置
- `utils.js`: 工具函数（颜色、日期、CSV导出等）~250行
- `api.js`: API请求封装（所有后端接口）~400行
- `pages.js`: 页面管理和菜单系统 ~180行
- `main.js`: 主入口和全局初始化 ~100行

**功能模块**（在 `modules/` 目录下）：
- `web_collect.js`: 网址采集管理模块（已完成，~800行）
- `scheduler.js`: 定时采集调度器管理模块（已完成）
- 其他模块待实现：数据采集、开奖记录、推荐分析、多维度分析、关注点管理、投注管理等
- 每个模块控制在 300-800 行

**旧文件**（保留作为参考）：
- `upload.js`: 原7500行单体文件，将逐步迁移到模块化结构
- `recommend16.js`, `fivePeriodThreexiao.js`: 已有的独立模块

## 重要 API 端点

### 数据采集相关
- `GET /collect?type={am|hk}`: 手动采集（主源 + 备用源）
- `GET /collect_wenlongzhu?type={am|hk}`: 文龙珠源采集
- `GET /records`: 获取开奖记录（支持分页和筛选）

### 定时采集调度器
- `GET /api/scheduler/status`: 获取调度器状态和任务列表
- `POST /api/scheduler/start`: 启动调度器
- `POST /api/scheduler/stop`: 停止调度器
- `GET /api/scheduler/logs?limit=50`: 获取采集日志
- `POST /api/scheduler/logs/clear`: 清空采集日志
- `POST /api/scheduler/trigger`: 手动触发一次采集
- `GET /api/scheduler/config`: 获取调度器配置
- `POST /api/scheduler/config`: 保存调度器配置并重启
- `POST /api/scheduler/reload`: 重新加载配置

### 网址采集管理
- `GET /api/web_collect/sources`: 获取采集源列表
- `POST /api/web_collect/sources`: 创建采集源
- `PUT /api/web_collect/sources/{id}`: 更新采集源
- `DELETE /api/web_collect/sources/{id}`: 删除采集源
- `POST /api/web_collect/collect/{source_id}`: 执行单个源采集
- `POST /api/web_collect/collect_all`: 批量采集所有启用源
- `GET /api/web_collect/results`: 获取采集结果
- `GET /api/web_collect/stats`: 获取采集统计数据

### 推荐生成
- `GET /recommend?type={am|hk}`: 生成推荐8码
- `GET /recommend16?type={am|hk}`: 生成推荐16码

## 数据流程图

### 采集 → 推荐 → 验证流程
```
1. 数据采集 (手动/定时)
   ↓
2. 保存到 lottery_result 表
   ↓
3. 自动触发网址采集验证 (result_verifier)
   ↓
4. 更新 collected_data.is_correct 和 match_detail
   ↓
5. 如果期号以0或5结尾
   ↓
6. 自动生成推荐8码和16码
   ↓
7. 保存到 recommend_result 和 recommend16_result 表
```

### 网址采集流程
```
1. 配置采集源 (collect_sources)
   ↓
2. 执行采集 (web_collector.py)
   - 获取网页内容 (httpx)
   - 根据 method 提取数据 (CSS/正则/XPath)
   - 标准化数据格式
   ↓
3. 保存预测结果 (collected_data)
   ↓
4. 等待开奖数据采集
   ↓
5. 自动验证 (result_verifier.py)
   - 对比预测值和实际开奖号码
   - 计算命中率
   - 更新验证结果
```

## 常见任务

### 添加新的分析功能
1. 在 `backend/routes/analysis.py` 添加路由和分析逻辑（控制在800行内）
2. 在 `frontend/api.js` 添加 API 请求函数
3. 在 `frontend/modules/` 创建新模块或在现有模块添加功能
4. 在 `frontend/index.html` 添加 UI 元素和引入模块
5. **注意**: 新功能尽量创建独立模块文件

### 修改推荐算法
核心文件: `backend/routes/recommend.py`
- `recommend_api()`: 8码推荐
- `recommend16_api()`: 16码推荐

修改后测试：采集以0或5结尾的期号数据，触发自动生成。

### 调试数据采集
1. 检查 `config.json` 中的 `COLLECT_URLS`
2. 查看控制台输出的采集日志
3. 备用源在主源失败时自动启用

### 数据库连接问题
- 连接配置在 `config.json` 中
- 连接池初始化在 `backend/db.py`
- 启动时会自动测试连接：`launcher.py`

### 配置定时采集
1. 编辑 `config.json` 中的 `AUTO_COLLECT` 配置
2. 使用前端界面配置：访问"定时采集设置"页面
3. 通过 API 配置：POST `/api/scheduler/config`
4. 配置后自动重启调度器，无需手动重启应用

### 添加网址采集源
1. 在前端"网址采集管理"页面添加采集源
2. 配置提取规则（CSS/正则/XPath）
3. 测试采集确认配置正确
4. 启用采集源后，可手动或自动采集
5. 采集到开奖数据后会自动验证采集结果

### 查看定时采集日志
- API 接口: `GET /api/scheduler/logs?limit=50`
- 前端界面: "定时采集设置" → "采集日志"
- 日志包含采集状态、数据条数、错误信息等
