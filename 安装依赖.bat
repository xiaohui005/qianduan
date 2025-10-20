@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ============================================================
echo   彩票分析系统 - 安装依赖包
echo ============================================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python
    pause
    exit /b 1
)

echo 当前Python版本:
python --version
echo.

echo [1/2] 安装托盘服务依赖包
echo.
pip install -r requirements_tray.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
if errorlevel 1 (
    echo.
    echo 托盘依赖安装失败，尝试使用默认源...
    pip install -r requirements_tray.txt
)

echo.
echo.
echo [2/2] 检查已安装的关键包
echo.
pip show pystray psutil pillow requests

echo.
echo ============================================================
if errorlevel 1 (
    echo   部分依赖安装失败，请检查错误信息
) else (
    echo   依赖安装完成！
    echo.
    echo   现在可以运行: 启动托盘服务.bat
)
echo ============================================================
echo.

pause
