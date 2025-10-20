@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion
title ²É¼¯°ÄÃÅ²Ê¿ª½±Êý¾Ý
cd /d "%~dp0"

echo ============================================================
echo   ²ÊÆ±Êý¾Ý²É¼¯ - °ÄÃÅ²Ê
echo ============================================================
echo.

echo [1/5] ¼ì²éºó¶Ë·þÎñ...

REM ¼ì²é8000¶Ë¿ÚÊÇ·ñÒÑÆô¶¯
curl -s -m 2 http://localhost:8000/ >nul 2>&1
if !errorlevel! equ 0 (
    echo 
iconv: é‡‡é›†æ¾³é—¨å½©.bat:17:9: cannot convert
