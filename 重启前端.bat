@echo off
chcp 65001 > nul
echo 正在重启前端服务...

REM 杀掉8080端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080.*LISTENING"') do (
    echo 停止进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)

timeout /t 2 /nobreak > nul

REM 启动前端服务
cd /d "%~dp0frontend"
echo 启动前端服务在 8080 端口...
start /b python -m http.server 8080

timeout /t 2 /nobreak > nul

echo.
echo ✓ 前端服务已重启！
echo 请在浏览器中按 Ctrl+Shift+R 强制刷新页面
echo.
pause
