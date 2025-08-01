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

## 索引与文件忽略规则

为保证代码索引、检索和版本管理的高效性，建议遵循以下文件忽略规则：

### 推荐忽略的无用文件/目录
- node_modules/
- dist/
- build/
- .git/
- .DS_Store
- *.log
- *.tmp
- __pycache__/
- .venv/
- .env*

### 规则说明
- 以上目录和文件通常为依赖、构建产物、缓存或本地环境文件，不应被索引和纳入版本控制。
- 建议在 `.gitignore`、代码检索工具配置、CI/CD 配置等处同步添加上述规则。
- 环境变量和敏感信息请勿提交到版本库。
- 代码风格、目录结构等建议见本文件前述内容。

如需自定义更多忽略规则，请根据实际项目需求补充。 

---

## 一键启动与打包说明

### 一键启动

1. 运行 `launcher.py` 即可一键启动前后端服务，并在系统托盘区显示小图标。
2. 托盘图标右键菜单：
   - "打开网站"：自动打开前端主页（如 http://localhost:8080）
   - "退出"：关闭所有相关进程并退出程序

### 端口自定义

- 可在根目录下的 `config.json` 文件中自定义前后端端口，例如：

```json
{
  "backend_port": 8000,
  "frontend_port": 8080
}
```

- 若无 config.json，则默认后端8000，前端8080。

### 依赖安装

请先安装以下依赖：

```bash
pip install pystray pillow psutil uvicorn fastapi
```

### 打包为exe

1. 准备好 `app.ico` 图标（可选，放根目录，未提供则自动生成蓝色图标）。
2. 安装 PyInstaller：

```bash
pip install pyinstaller
```

3. 打包命令（在项目根目录下）：

```bash
pyinstaller --noconsole --onefile --icon=app.ico launcher.py
```

- 生成的 exe 在 `dist/launcher.exe`。
- 双击 exe 即可一键启动，托盘区出现小图标。

### 注意事项

- 关闭程序请通过托盘图标右键菜单“退出”，以确保所有服务被正确关闭。
- 若需更换端口，修改 config.json 后重启程序即可。
- 若缺少 Python 运行环境，可将 exe 及 frontend/backend 目录一同分发。

--- 