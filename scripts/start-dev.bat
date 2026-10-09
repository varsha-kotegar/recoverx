@echo off
echo ===================================================
echo   Starting RecoverX Infrastructure Platform (Dev)
echo ===================================================

echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "RecoverX Backend" cmd /k "cd /d %~dp0\.. && set PYTHONPATH=. && backend\venv\Scripts\uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Launching Next.js Frontend on http://localhost:3000 ...
start "RecoverX Frontend" cmd /k "cd /d %~dp0\..\frontend && npm run dev"

echo.
echo Both services launched!
echo Access the RecoverX Console at: http://localhost:3000
echo Access FastAPI OpenAPI Docs at: http://localhost:8000/docs
echo ===================================================
pause
