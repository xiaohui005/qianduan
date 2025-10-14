# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

彩票分析系统 - 基于 FastAPI + MySQL 的澳门/香港彩票数据采集和分析系统，支持自动推荐号码生成、多维度数据分析和投注管理。

## 架构设计

### 技术栈
- **后端**: FastAPI + uvicorn，使用 MySQL 连接池（pool_size=5）
- **前端**: 纯 HTML/CSS/JavaScript，单页应用架构
- **数据库**: MySQL 5.7+（支持连接池）
- **配置**: 外部 config.json 文件（支持 PyInstaller 打包后读取）

### 模块化路由设计
后端采用 FastAPI Router 模块化设计，主要模块：
- `collect.py`: 数据采集（主源 + 备用源双重保障）
- `recommend.py`: 推荐号码生成（8码/16码）
- `analysis.py`: 多维度分析（区间、位置、波色等）
- `favorites.py`: 关注点管理和统计
- `betting.py`: 投注点管理和报表

所有路由在 `backend/main.py` 中注册。

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

实现位置: `backend/routes/collect.py:29-46`

```python
if period.endswith(('0', '5')):
    # 自动调用 recommend_api() 和 recommend16_api()
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
  "COLLECT_URLS": {
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

实现位置: `backend/config.py:6-10`

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

**功能模块**（待实现，在 `modules/` 目录下）：
- 数据采集、开奖记录、推荐分析、多维度分析、关注点管理、投注管理等
- 每个模块控制在 300-800 行

**旧文件**（保留作为参考）：
- `upload.js`: 原7500行单体文件，将逐步迁移到模块化结构
- `recommend16.js`, `fivePeriodThreexiao.js`: 已有的独立模块

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
- 连接池初始化在 `backend/db.py:9-27`
- 启动时会自动测试连接：`launcher.py:56-59`
