@echo off
rem Double-click this file to start the app. A browser tab opens automatically.
cd /d "%~dp0"
if not exist node_modules (
  echo Setting up for the first time, please wait...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERROR] Setup failed. See the messages above.
    pause
    exit /b 1
  )
)
rem No fixed port: if 5173 is busy, Vite picks another port automatically.
call npm run dev -- --open
if errorlevel 1 (
  echo.
  echo [ERROR] Failed to start. See the messages above.
)
pause
