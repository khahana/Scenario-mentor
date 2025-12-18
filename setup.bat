@echo off
echo ========================================
echo   Scenario Trading Mentor - Setup
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Generating Prisma client...
call npx prisma generate
if %errorlevel% neq 0 (
    echo ERROR: prisma generate failed
    pause
    exit /b 1
)

echo.
echo [3/4] Setting up database...
call npx prisma db push
if %errorlevel% neq 0 (
    echo ERROR: prisma db push failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo [4/4] Starting development server...
echo.
echo Opening http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
start http://localhost:3000
call npm run dev
