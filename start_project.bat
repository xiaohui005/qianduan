@echo off
setlocal ENABLEDELAYEDEXPANSION

REM Resolve project root to the directory of this script
set ROOT=%~dp0
pushd "%ROOT%"

REM Optional: activate venv if exists (uncomment and adjust if you use one)
REM call "%ROOT%venv\Scripts\activate.bat" 2>nul

echo Starting backend (FastAPI with Uvicorn) and frontend (static server)...

REM Start backend in a new window
start "Backend" cmd /k "cd /d "%ROOT%backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM Start frontend static server in a new window (serves ./frontend at http://127.0.0.1:8080)
start "Frontend" cmd /k "cd /d "%ROOT%" && python -m http.server 8080 -d frontend"

REM Give servers a moment to start
timeout /t 2 >nul

REM Open browser tabs for API docs and frontend
REM start "" http://127.0.0.1:8000/docs
start "" http://127.0.0.1:8080

echo Launched. You can close this window.

popd
endlocal
exit /b 0


