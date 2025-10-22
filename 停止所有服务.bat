@echo off
chcp 65001 >nul
title 彩票分析系统 - 停止所有服务
color 0C

echo ============================================================
echo   彩票分析系统 - 停止所有服务
echo ============================================================
echo.

echo [1/3] 查找占用8000端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do (
    echo 正在停止进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [2/3] 查找占用8080端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080.*LISTENING"') do (
    echo 正在停止进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo [3/3] 停止所有Python HTTP服务器...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq 前端服务*" 2>nul
taskkill /F /IM python.exe /FI "WINDOWTITLE eq 后端服务*" 2>nul

echo.
echo ============================================================
echo   所有服务已停止！
echo ============================================================
echo.
echo 现在可以重新运行 一键启动.bat 启动服务
echo.
pause
