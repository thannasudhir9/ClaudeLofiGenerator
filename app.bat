@echo off
setlocal enabledelayedexpansion

:: ==============================================================================
:: Claude LoFi, Anime & Pixar Studio - Application Controller (app.bat)
:: Commands: start | stop | restart | status
:: ==============================================================================

set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

set "BACKEND_PORT=3000"
set "FRONTEND_PORT=3001"
set "LOG_DIR=%APP_DIR%logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "CMD=%~1"
if "%CMD%"=="" goto :interactive

if /i "%CMD%"=="start" goto :do_start
if /i "%CMD%"=="stop" goto :do_stop
if /i "%CMD%"=="restart" goto :do_restart
if /i "%CMD%"=="status" goto :do_status
if /i "%CMD%"=="help" goto :show_usage

echo [!] Unknown command: %CMD%
echo.
goto :show_usage

:: ------------------------------------------------------------------------------
:: INTERACTIVE MENU
:: ------------------------------------------------------------------------------
:interactive
cls
echo ==============================================================================
echo       CLAUDE LOFI, ANIME ^& PIXAR CREATOR STUDIO - CONTROLLER
echo ==============================================================================
echo.
echo   1. Start Studio       (Launch Backend :%BACKEND_PORT% ^& Frontend :%FRONTEND_PORT%)
echo   2. Stop Studio        (Terminate all studio services)
echo   3. Restart Studio     (Stop and fresh launch)
echo   4. Service Status     (Check ports and health)
echo   5. Open in Browser    (http://localhost:%FRONTEND_PORT%)
echo   6. Exit
echo.
set /p "CHOICE=Enter choice [1-6]: "
if "%CHOICE%"=="1" goto :do_start
if "%CHOICE%"=="2" goto :do_stop
if "%CHOICE%"=="3" goto :do_restart
if "%CHOICE%"=="4" goto :do_status
if "%CHOICE%"=="5" (
    start http://localhost:%FRONTEND_PORT%
    goto :interactive
)
if "%CHOICE%"=="6" goto :eof

echo Invalid option. Please enter 1-6.
timeout /t 2 >nul
goto :interactive

:: ------------------------------------------------------------------------------
:: START ACTION
:: ------------------------------------------------------------------------------
:do_start
echo.
echo ==============================================================================
echo   STARTING CLAUDE LOFI STUDIO SERVICES
echo ==============================================================================

:: Check if already running
call :check_port %BACKEND_PORT%
if "!PORT_RUNNING!"=="1" (
    echo [i] Backend is already active on port %BACKEND_PORT% [PID: !PORT_PID!]
) else (
    echo [*] Starting Backend Engine on port %BACKEND_PORT%...
    start "ClaudeLofi-Backend-3000" /min cmd /c "node server.mjs > logs\backend.log 2>&1"
    timeout /t 2 /nobreak >nul
)

call :check_port %FRONTEND_PORT%
if "!PORT_RUNNING!"=="1" (
    echo [i] Frontend Studio is already active on port %FRONTEND_PORT% [PID: !PORT_PID!]
) else (
    echo [*] Starting Next.js Web Studio on port %FRONTEND_PORT%...
    start "ClaudeLofi-Frontend-3001" /min cmd /c "npm --prefix web run dev -- -p %FRONTEND_PORT% > logs\frontend.log 2>&1"
    timeout /t 3 /nobreak >nul
)

echo.
echo [*] Waiting for services to initialize...
timeout /t 3 /nobreak >nul

goto :do_status

:: ------------------------------------------------------------------------------
:: STOP ACTION
:: ------------------------------------------------------------------------------
:do_stop
echo.
echo ==============================================================================
echo   STOPPING CLAUDE LOFI STUDIO SERVICES
echo ==============================================================================

set "STOPPED_COUNT=0"

:: Kill Backend on port 3000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%BACKEND_PORT% " ^| findstr "LISTENING"') do (
    set "PID=%%a"
    if defined PID (
        echo [*] Stopping Backend on port %BACKEND_PORT% (PID: !PID!)...
        taskkill /f /pid !PID! >nul 2>&1
        set /a STOPPED_COUNT+=1
    )
)

:: Kill Frontend on port 3001
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%FRONTEND_PORT% " ^| findstr "LISTENING"') do (
    set "PID=%%a"
    if defined PID (
        echo [*] Stopping Frontend on port %FRONTEND_PORT% (PID: !PID!)...
        taskkill /f /pid !PID! >nul 2>&1
        set /a STOPPED_COUNT+=1
    )
)

timeout /t 1 /nobreak >nul

:: Second pass verification
call :check_port %BACKEND_PORT%
set "B_RUNNING=!PORT_RUNNING!"
call :check_port %FRONTEND_PORT%
set "F_RUNNING=!PORT_RUNNING!"

if "!B_RUNNING!"=="0" if "!F_RUNNING!"=="0" (
    echo [OK] All studio services stopped successfully.
) else (
    echo [!] Some services could not be stopped. Run as Administrator if needed.
)

if "%CMD%"=="" (
    pause
    goto :interactive
)
goto :eof

:: ------------------------------------------------------------------------------
:: RESTART ACTION
:: ------------------------------------------------------------------------------
:do_restart
echo.
echo [*] Restarting Claude LoFi Studio...
call :do_stop
timeout /t 2 /nobreak >nul
goto :do_start

:: ------------------------------------------------------------------------------
:: STATUS ACTION
:: ------------------------------------------------------------------------------
:do_status
echo.
echo ==============================================================================
echo   SERVICE HEALTH ^& PORT STATUS
echo ==============================================================================

call :check_port %BACKEND_PORT%
if "!PORT_RUNNING!"=="1" (
    echo   [RUNNING] Backend Engine  : http://localhost:%BACKEND_PORT% [PID: !PORT_PID!]
) else (
    echo   [STOPPED] Backend Engine  : http://localhost:%BACKEND_PORT%
)

call :check_port %FRONTEND_PORT%
if "!PORT_RUNNING!"=="1" (
    echo   [RUNNING] Next.js Studio  : http://localhost:%FRONTEND_PORT% [PID: !PORT_PID!]
) else (
    echo   [STOPPED] Next.js Studio  : http://localhost:%FRONTEND_PORT%
)

echo.
echo   Unlimited Credits : 999,999,999 (100%% Free, Zero Paywalls)
echo   Output Storage    : %APP_DIR%outputs\
echo   Logs Directory    : %LOG_DIR%\
echo ==============================================================================
echo.

if "%CMD%"=="" (
    pause
    goto :interactive
)
goto :eof

:: ------------------------------------------------------------------------------
:: HELPER: CHECK PORT
:: ------------------------------------------------------------------------------
:check_port
set "TARGET_PORT=%~1"
set "PORT_RUNNING=0"
set "PORT_PID="
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr ":%TARGET_PORT% " ^| findstr "LISTENING"') do (
    set "PORT_RUNNING=1"
    set "PORT_PID=%%p"
)
exit /b

:: ------------------------------------------------------------------------------
:: SHOW USAGE
:: ------------------------------------------------------------------------------
:show_usage
echo Usage: app.bat [command]
echo.
echo Commands:
echo   start     Launch Backend (port 3000) and Next.js Studio (port 3001)
echo   stop      Stop all running studio instances
echo   restart   Stop and perform fresh launch
echo   status    Check status of ports 3000 and 3001
echo   help      Show this help message
echo.
echo Running without arguments opens an interactive control menu.
exit /b 0
