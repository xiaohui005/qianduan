@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================================
echo   彩票分析系统 - 托盘服务启动
echo ============================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python
    pause
    exit /b 1
)

echo 正在启动托盘服务（后台运行）
echo.
echo 启动后：
echo   1. 系统托盘（右下角）会出现彩票图标
echo   2. 右键图标可以打开网页、查看状态、退出程序
echo   3. 或直接访问: http://localhost:8080
echo.
echo 正在启动，请稍候...

REM 使用 pythonw.exe 后台无窗口启动
start "" pythonw.exe tray_app.py

echo.
echo 托盘服务启动命令已执行
echo 请查看系统托盘（右下角）是否出现图标
echo.
echo 如果没有看到图标，请运行: 安装依赖.bat
echo.

timeout /t 3 /nobreak >nul
exit
