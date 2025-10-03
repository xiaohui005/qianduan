@echo off
chcp 65001 >nul
title 彩票分析系统 - 一键启动
color 0A

echo ============================================================
echo   彩票分析系统 - 一键启动
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/2] 启动后端服务 (端口8000)...
start "后端服务-8000" cmd /k "python launcher.py"

timeout /t 2 /nobreak >nul

echo [2/2] 启动前端服务 (端口8080)...
start "前端服务-8080" cmd /k "python -m http.server 8080 --directory frontend"

timeout /t 2 /nobreak >nul

echo.
echo ============================================================
echo   启动完成！
echo ============================================================
echo.
echo 后端API: http://127.0.0.1:8000
echo 前端页面: http://127.0.0.1:8080
echo.
echo 正在打开前端页面...
start "" "http://127.0.0.1:8080"

echo.
echo 按任意键关闭此窗口 (不会关闭服务)...
pause >nul
