@echo off
title Electronic Invoicing System (EIS) Launcher
color 0b

echo ================================================================
echo           ELECTRONIC INVOICING SYSTEM (EIS)
echo       AI Samrat Project - Secure & Tamper-Proof
echo ================================================================
echo.
echo [1/3] Checking database migrations...
python manage.py migrate --noinput
echo.
echo [2/3] Launching Django REST Backend on http://127.0.0.1:8000 ...
start "EIS Backend - Django API (Port 8000)" cmd /k "color 0a && echo EIS Backend Running on http://127.0.0.1:8000/api/ && python manage.py runserver 127.0.0.1:8000"

echo [3/3] Launching React + Vite Frontend on http://localhost:5173 ...
start "EIS Frontend - React + Vite (Port 5173)" cmd /k "color 0e && cd frontend && echo EIS Frontend Running on http://localhost:5173/ && npm run dev"

echo.
echo Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Launching browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo ================================================================
echo                     ALL LINKS & ACCESS INFO
echo ================================================================
echo.
echo   - Web Application:     http://localhost:5173/
echo   - Backend REST API:    http://127.0.0.1:8000/api/
echo   - Django Admin Portal: http://127.0.0.1:8000/admin/
echo   - Tamper Verification: http://127.0.0.1:8000/api/invoices/verify/
echo.
echo ----------------------------------------------------------------
echo                     TEST USER CREDENTIALS
echo ----------------------------------------------------------------
echo   1. Admin Account:  Username: admin   Password: Admin@12345
echo   2. Staff Account:  Username: staff   Password: Staff@12345
echo.
echo ================================================================
echo  Servers are running in background windows.
echo ================================================================
pause

