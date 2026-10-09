@echo off
echo ===================================================
echo   Running RecoverX Automated Test Suite
echo ===================================================

cd /d %~dp0\..
set PYTHONPATH=.

echo [1/2] Running Backend Pytest Suite...
backend\venv\Scripts\pytest backend\tests -v
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backend tests failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Running Frontend TypeScript Compilation and Build Check...
cd frontend
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Frontend build check failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   All RecoverX tests and checks PASSED!
echo ===================================================
pause
