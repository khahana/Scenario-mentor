@echo off
echo ========================================
echo   Clearing All Caches
echo ========================================
echo.

echo Removing .next folder...
if exist ".next" rmdir /s /q ".next"

echo Removing node_modules/.cache...
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

echo.
echo ========================================
echo   Cache cleared!
echo ========================================
echo.
echo Now run: run.bat
echo.
echo Also clear browser cache with Ctrl+Shift+R
echo.
pause
