@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title 采集澳门彩开奖数据
cd /d "%~dp0"

echo ============================================================
echo   彩票数据采集 - 澳门彩
echo ============================================================
echo.

echo [1/5] 检查后端服务

REM 检查8000端口是否已启动
curl -s -m 2 http://localhost:8000/ >nul 2>&1
if !errorlevel! equ 0 (
    echo 后端服务已运行
    set NEED_STOP=0
) else (
    echo 后端服务未运行，正在启动
    REM 使用 uvicorn 直接启动，不打开浏览器
    start "后端服务" /min cmd /c "chcp 65001 >nul 2>&1 && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"
    set NEED_STOP=1

    REM 等待服务启动，最多等待30秒
    echo 等待后端服务启动中
    set /a count=0
    :WAIT_LOOP
    timeout /t 2 /nobreak >nul
    curl -s -m 2 http://localhost:8000/ >nul 2>&1
    if !errorlevel! equ 0 (
        echo 后端服务启动成功
        goto SERVICE_READY
    )
    set /a count+=1
    if !count! lss 15 (
        echo   等待中 !count!/15
        goto WAIT_LOOP
    )
    echo 后端服务启动超时，请检查配置
    pause
    exit /b 1
)

:SERVICE_READY

echo.
echo [2/5] 正在采集澳门彩开奖数据

REM 设置重试次数
set /a retry=0
set /a max_retry=3

:COLLECT_RETRY
set /a retry+=1
if !retry! gtr 1 (
    echo   第 !retry! 次尝试
)

REM 将采集结果保存到临时文件
curl -s -m 30 -X GET "http://localhost:8000/collect?type=am" > "%TEMP%\collect_result.txt" 2>&1

REM 检查curl是否执行成功
if !errorlevel! neq 0 (
    echo 网络请求失败 错误码: !errorlevel!
    if !retry! lss !max_retry! (
        echo   等待3秒后重试
        timeout /t 3 /nobreak >nul
        goto COLLECT_RETRY
    )
    echo 采集失败，已重试 !max_retry! 次
    set COLLECT_SUCCESS=0
    goto CHECK_RESULT
)

echo 采集响应：
type "%TEMP%\collect_result.txt"

echo.
echo.
echo [3/5] 检查采集结果

:CHECK_RESULT
REM 检查采集结果中是否包含成功标识
findstr /i /c:"采集" /c:"\"am\"" "%TEMP%\collect_result.txt" >nul 2>&1
if !errorlevel! equ 0 (
    echo 采集成功！已获取到数据
    set COLLECT_SUCCESS=1
    goto CLEANUP
)

REM 再检查是否包含"无新数据"
findstr /i /c:"无新数据" /c:"无数据" "%TEMP%\collect_result.txt" >nul 2>&1
if !errorlevel! equ 0 (
    echo 采集成功！但无新数据（数据已是最新）
    set COLLECT_SUCCESS=1
    goto CLEANUP
)

REM 检查是否为空文件或错误
for %%A in ("%TEMP%\collect_result.txt") do set size=%%~zA
if !size! lss 5 (
    echo 采集失败：返回数据为空
) else (
    echo 采集失败：未识别的返回格式
)
set COLLECT_SUCCESS=0

REM 如果采集失败且还可以重试
if !COLLECT_SUCCESS! equ 0 (
    if !retry! lss !max_retry! (
        echo   等待3秒后重试
        timeout /t 3 /nobreak >nul
        goto COLLECT_RETRY
    )
)

:CLEANUP
echo.
echo [4/5] 数据处理中

REM 删除临时文件
del "%TEMP%\collect_result.txt" >nul 2>&1

REM 如果是本脚本启动的后端服务，根据采集结果决定是否关闭
if "!NEED_STOP!"=="1" (
    if "!COLLECT_SUCCESS!"=="1" (
        echo.
        echo [5/5] 5秒后自动关闭后端服务
        timeout /t 5 /nobreak >nul
        echo 正在关闭后端服务

        REM 查找并关闭 python.exe 进程（uvicorn）
        for /f "tokens=2" %%i in ('tasklist /FI "IMAGENAME eq python.exe" ^| findstr /i "python.exe"') do (
            netstat -ano | findstr ":8000" | findstr "%%i" >nul 2>&1
            if !errorlevel! equ 0 (
                taskkill /F /PID %%i /T >nul 2>&1
                echo 已关闭进程 PID=%%i
            )
        )

        echo 后端服务已关闭
    ) else (
        echo.
        echo [5/5] 采集失败，保持后端服务运行以便查看问题
        echo 提示：请检查以下几点：
        echo   1. 数据库连接是否正常
        echo   2. 采集网址是否可访问
        echo   3. 网络连接是否正常
    )
) else (
    echo.
    echo [5/5] 后端服务由外部启动，保持运行状态
)

echo.
echo ============================================================
if "!COLLECT_SUCCESS!"=="1" (
    echo   采集任务完成！
    echo ============================================================
    timeout /t 2 /nobreak >nul
    exit /b 0
) else (
    echo   采集任务失败！
    echo ============================================================
    echo.
    echo 按任意键退出
    pause >nul
    exit /b 1
)
