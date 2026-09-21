@echo off
rem Double-click to start the app. The browser opens automatically.
cd /d "%~dp0"
if not exist node_modules call npm install
call npm run dev -- --open --port 5173 --strictPort
pause
