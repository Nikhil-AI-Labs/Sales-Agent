@echo off
title Anjani AI Sales OS
color 0A

echo ============================================
echo    ANJANI AI SALES OS - STARTUP
echo    Permanent Domain: mangle-gazing-contempt.ngrok-free.dev
echo ============================================
echo.

REM Kill any stale processes
taskkill /F /IM ngrok.exe >nul 2>&1

REM Start ngrok FIRST in its own persistent window (permanent static domain)
echo [1/2] Starting ngrok tunnel...
start "NGROK TUNNEL - DO NOT CLOSE" cmd /k ".\ngrok.exe http --url=mangle-gazing-contempt.ngrok-free.dev 3000"

REM Wait for ngrok to establish the tunnel
timeout /t 4 /nobreak >nul

echo.
echo ============================================
echo  UPDATE THESE IN CHAKRAHQ WEBHOOK SETTINGS:
echo.
echo  Customer Webhook URL:
echo  https://mangle-gazing-contempt.ngrok-free.dev/api/webhook/customer
echo.
echo  Owner Webhook URL:
echo  https://mangle-gazing-contempt.ngrok-free.dev/api/webhook/owner
echo.
echo  Dashboard (local):  http://localhost:3000
echo  Dashboard (public): https://mangle-gazing-contempt.ngrok-free.dev
echo ============================================
echo.
echo [2/2] Starting Next.js dev server...
echo.

REM Start Next.js in this window (keep this window open!)
npm run dev
