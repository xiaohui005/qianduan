@echo off
chcp 65001 >nul
echo ============================================================
echo   遗漏监控配置系统启动脚本
echo ============================================================
echo.

REM 检查是否已初始化
echo [1/4] 检查数据库配置表...
cd /d "%~dp0backend"
python -c "from utils import get_db_cursor; cursor = get_db_cursor().__enter__(); cursor.execute('SHOW TABLES LIKE \"monitor_config\"'); result = cursor.fetchone(); exit(0 if result else 1)" 2>nul

if %errorlevel% neq 0 (
    echo.
    echo ⚠️  检测到监控配置表未初始化
    echo.
    set /p init="是否现在初始化？[Y/N]: "
    if /i "%init%"=="Y" (
        echo.
        echo 正在初始化监控配置表...
        python init_monitor_config.py
        echo.
        pause
    ) else (
        echo.
        echo ❌ 未初始化，程序退出
        pause
        exit /b 1
    )
) else (
    echo ✅ 配置表已存在
)

echo.
echo [2/4] 清理端口...
cd /d "%~dp0"
call "清理端口.bat" >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ 端口已清理

echo.
echo [3/4] 启动后端服务 (端口 8000)...
cd /d "%~dp0backend"
start /b python -m uvicorn main:app --host 0.0.0.0 --port 8000
timeout /t 3 /nobreak >nul
echo ✅ 后端服务已启动

echo.
echo [4/4] 启动前端服务 (端口 8080)...
cd /d "%~dp0frontend"
start /b python -m http.server 8080
timeout /t 2 /nobreak >nul
echo ✅ 前端服务已启动

echo.
echo ============================================================
echo   ✅ 系统启动完成！
echo ============================================================
echo.
echo   前端地址: http://localhost:8080
echo   后端地址: http://localhost:8000
echo   API文档:  http://localhost:8000/docs
echo.
echo   功能菜单:
echo   - 🔍 遗漏监控：查看预警
echo   - ⚙️  遗漏监控配置：管理监控点参数
echo.
echo ============================================================
echo.
echo 按任意键在浏览器中打开系统...
pause >nul

start http://localhost:8080

echo.
echo 提示：关闭此窗口将停止所有服务
echo.
pause
