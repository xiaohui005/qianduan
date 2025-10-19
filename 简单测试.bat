@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo 测试开始
echo 检查 Python
python --version

echo.
echo 测试结束
pause
