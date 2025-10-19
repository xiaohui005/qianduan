# PowerShell 版本的采集脚本
# 使用方法: powershell -ExecutionPolicy Bypass -File "采集澳门彩.ps1"

$ErrorActionPreference = "Continue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  彩票数据采集 - 澳门彩" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 切换到脚本所在目录
Set-Location $PSScriptRoot

Write-Host "[1/5] 检查后端服务" -ForegroundColor Yellow

# 检查8000端口是否已启动
$backendRunning = $false
$needStop = $false

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "✓ 后端服务已运行（外部启动）" -ForegroundColor Green
    $backendRunning = $true
    $needStop = $false
} catch {
    Write-Host "后端服务未运行，正在启动..." -ForegroundColor Yellow

    # 启动后端服务
    $process = Start-Process -FilePath "python" -ArgumentList "-m","uvicorn","backend.main:app","--host","0.0.0.0","--port","8000" -WindowStyle Minimized -PassThru
    $needStop = $true

    # 等待服务启动，最多等待30秒
    Write-Host "等待后端服务启动中..." -ForegroundColor Yellow
    $count = 0
    $maxCount = 15

    while ($count -lt $maxCount) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            Write-Host "✓ 后端服务启动成功！" -ForegroundColor Green
            $backendRunning = $true
            break
        } catch {
            $count++
            Write-Host "  等待中... ($count/$maxCount)" -ForegroundColor Gray
        }
    }

    if (-not $backendRunning) {
        Write-Host "✗ 后端服务启动超时，请检查配置" -ForegroundColor Red
        Read-Host "按回车键退出"
        exit 1
    }
}

Write-Host ""
Write-Host "[2/5] 正在采集澳门彩开奖数据" -ForegroundColor Yellow

# 设置重试次数
$retry = 0
$maxRetry = 3
$collectSuccess = $false
$resultText = ""

while ($retry -lt $maxRetry) {
    $retry++
    if ($retry -gt 1) {
        Write-Host "  第 $retry 次尝试..." -ForegroundColor Gray
    }

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/collect?type=am" -TimeoutSec 30 -UseBasicParsing
        $resultText = $response.Content

        Write-Host "采集响应：" -ForegroundColor Cyan
        Write-Host $resultText

        # 检查采集结果
        if ($resultText -match "采集|`"am`"") {
            Write-Host ""
            Write-Host "[3/5] 检查采集结果" -ForegroundColor Yellow
            Write-Host "✓ 采集成功！已获取到数据" -ForegroundColor Green
            $collectSuccess = $true
            break
        } elseif ($resultText -match "无新数据|无数据") {
            Write-Host ""
            Write-Host "[3/5] 检查采集结果" -ForegroundColor Yellow
            Write-Host "✓ 采集成功！但无新数据（数据已是最新）" -ForegroundColor Green
            $collectSuccess = $true
            break
        } else {
            Write-Host "✗ 采集失败：未识别的返回格式" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ 网络请求失败: $($_.Exception.Message)" -ForegroundColor Red
    }

    if ($retry -lt $maxRetry) {
        Write-Host "  等待3秒后重试..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    }
}

if (-not $collectSuccess) {
    Write-Host ""
    Write-Host "[3/5] 检查采集结果" -ForegroundColor Yellow
    Write-Host "✗ 采集失败，已重试 $maxRetry 次" -ForegroundColor Red
}

Write-Host ""
Write-Host "[4/5] 数据处理中" -ForegroundColor Yellow

# 如果是本脚本启动的后端服务，根据采集结果决定是否关闭
if ($needStop) {
    if ($collectSuccess) {
        Write-Host ""
        Write-Host "[5/5] 5秒后自动关闭后端服务" -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        Write-Host "正在关闭后端服务..." -ForegroundColor Yellow

        # 查找并关闭监听8000端口的进程
        $connections = netstat -ano | Select-String ":8000.*LISTENING"
        foreach ($conn in $connections) {
            if ($conn -match "\s+(\d+)$") {
                $pid = $Matches[1]
                try {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "✓ 已关闭进程 PID=$pid" -ForegroundColor Green
                } catch {
                    Write-Host "✗ 无法关闭进程 PID=$pid" -ForegroundColor Red
                }
            }
        }

        Write-Host "✓ 后端服务已关闭" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[5/5] 采集失败，保持后端服务运行以便查看问题" -ForegroundColor Yellow
        Write-Host "提示：请检查以下几点：" -ForegroundColor Cyan
        Write-Host "  1. 数据库连接是否正常" -ForegroundColor Gray
        Write-Host "  2. 采集网址是否可访问" -ForegroundColor Gray
        Write-Host "  3. 网络连接是否正常" -ForegroundColor Gray
    }
} else {
    Write-Host ""
    Write-Host "[5/5] 后端服务由外部启动，保持运行状态" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
if ($collectSuccess) {
    Write-Host "  采集任务完成！" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    exit 0
} else {
    Write-Host "  采集任务失败！" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}
