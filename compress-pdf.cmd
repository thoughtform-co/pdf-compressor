@echo off
REM ============================================================
REM Compress PDF - Drag and drop a PDF onto this file
REM ============================================================

setlocal EnableDelayedExpansion

REM Get the directory where this script lives
set "SCRIPT_DIR=%~dp0"

echo.
echo ========================================
echo   PDF Compressor
echo ========================================
echo.

REM Check if a file was provided
if "%~1"=="" (
    echo ERROR: No PDF file provided.
    echo.
    echo Usage: Drag and drop a PDF file onto this script,
    echo        or run from command line:
    echo.
    echo        compress-pdf.cmd "path\to\file.pdf"
    echo.
    goto :end
)

REM Show what we're processing
echo Input file: %~1
echo.

REM Check if input file exists
if not exist "%~1" (
    echo ERROR: File not found: %~1
    echo.
    goto :end
)

REM Check if PowerShell script exists
if not exist "%SCRIPT_DIR%compress-pdf.ps1" (
    echo ERROR: compress-pdf.ps1 not found in %SCRIPT_DIR%
    echo.
    goto :end
)

echo Running compression...
echo.

REM Run the PowerShell script
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%SCRIPT_DIR%compress-pdf.ps1" -InputPdf "%~1"

if errorlevel 1 (
    echo.
    echo Compression encountered an error.
)

:end
echo.
echo ========================================
echo Press any key to close this window...
echo ========================================
pause >nul
endlocal
