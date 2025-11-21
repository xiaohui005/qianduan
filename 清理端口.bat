@echo off
chcp 65001 >nul
title 清理8000和8080端口
color 0C

echo ============================================================
echo   清理8000和8080端口占用进程
echo ============================================================
echo.

echo 正在查找占用8000端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do (
    echo 找到进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo 正在查找占用8080端口的进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080.*LISTENING"') do (
    echo 找到进程 PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ============================================================
echo   清理完成！
echo ============================================================
echo.
echo 现在可以运行"一键启动.bat"来启动服务
echo.
pause
