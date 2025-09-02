@echo off
title 启动Python前后端服务
chcp 65001 >nul
color 0a
cls

REM 设置前端和后端的绝对路径（请修改为你实际的路径）
set FRONTEND_PATH=C:\Users\Administrator\Desktop\six666\frontend
set BACKEND_PATH=C:\Users\Administrator\Desktop\six666\backend

REM 解析Python可执行文件（优先 python，其次 python3）
set PYTHON_EXE=python
%PYTHON_EXE% -V >nul 2>&1 || set PYTHON_EXE=python3
%PYTHON_EXE% -V >nul 2>&1 || (
  echo 未找到 Python，请先安装 Python 并加入 PATH。
  pause
  exit /b 1
)

echo 正在启动Python前后端服务...
echo.

REM 1. 先启动后端服务（FastAPI/Uvicorn）
echo [%time%] 正在启动后端服务(端口8000)...
start "后端服务" /B cmd /c "cd /d %BACKEND_PATH% && %PYTHON_EXE% -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM 等待后端完全启动
echo [%time%] 等待后端服务初始化(5秒)...
timeout /t 5 >nul

REM 2. 启动前端HTTP服务器
echo [%time%] 正在启动前端服务(端口8080)...
start "前端服务" /MIN cmd /c "chcp 65001 >nul && cd /d %FRONTEND_PATH% && %PYTHON_EXE% -m http.server 8080"

REM 3. 打开浏览器访问前端
echo [%time%] 正在打开浏览器...
start "" "http://localhost:8080"

echo.
echo 服务启动完成！
echo 后端API: http://localhost:8000
echo 前端访问: http://localhost:8080
echo 按任意键退出此窗口...
pause >nul
 