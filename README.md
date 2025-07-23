# 彩票分析系统

## 项目结构
- `frontend/` 纯HTML前端页面
- `backend/` FastAPI后端服务，含MySQL、Redis、pandas分析

## 快速开始

### 1. 安装后端依赖
```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动MySQL和Redis
- MySQL需建库 lottery
- Redis默认本地6379端口

### 3. 启动后端服务
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 打开前端页面
直接用浏览器打开 `frontend/index.html`
### 3. 启动前端服务
```bash
cd frontend 
python -m http.server 8080
```
## 功能说明
- 支持上传CSV彩票数据，后端用pandas分析
- 可扩展MySQL存储、Redis缓存

## 环境变量
可在backend/.env中配置数据库和Redis连接

---
如需扩展分析逻辑，请编辑 `backend/analysis.py` 