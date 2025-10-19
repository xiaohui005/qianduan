@echo off
chcp 65001 >nul 2>&1
echo Testing batch file encoding and execution
echo.

echo Step 1: Check Python
python --version
if errorlevel 1 (
    echo ERROR: Python not found
    pause
    exit /b 1
)
echo.

echo Step 2: Check backend directory
if exist "backend\main.py" (
    echo OK: backend\main.py exists
) else (
    echo ERROR: backend\main.py not found
    pause
    exit /b 1
)
echo.

echo Step 3: Check curl
curl --version | findstr curl
if errorlevel 1 (
    echo ERROR: curl not found
    pause
    exit /b 1
)
echo.

echo Step 4: Test simple echo
echo This is a test with Chinese: 测试中文显示
echo.

echo All checks passed!
echo You can now run: 采集澳门彩.bat
pause
