@echo off
echo ========================================
echo   Scenario Trading Mentor - Start
echo ========================================
echo.

REM Clear Next.js cache to prevent chunk errors
echo Clearing cache...
if exist ".next" rmdir /s /q ".next" 2>nul
echo Cache cleared.
echo.
echo Starting server at http://localhost:3000
echo Press Ctrl+C to stop
echo.
echo TIP: If page is blank, press Ctrl+Shift+R in browser
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo ERROR: node_modules not found!
    echo Please run setup.bat first
    echo.
    pause
    exit /b 1
)

start http://localhost:3000
npm run dev

REM If npm fails, pause to show error
if errorlevel 1 (
    echo.
    echo ========================================
    echo   ERROR: Server failed to start
    echo ========================================
    pause
)
