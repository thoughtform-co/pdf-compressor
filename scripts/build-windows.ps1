<#
.SYNOPSIS
    Build the PDF Compressor executable for Windows.

.DESCRIPTION
    Uses PyInstaller to create a standalone Windows executable.
    The output is placed in dist/pdf-compress.exe

.EXAMPLE
    .\scripts\build-windows.ps1
#>

[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "PDF Compressor - Windows Build" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Change to project root
Push-Location $ProjectRoot

try {
    # Check Python
    $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pythonCmd) {
        Write-Error "Python not found. Please install Python 3.10+ and add to PATH."
        exit 1
    }
    
    Write-Host "Python: $($pythonCmd.Source)"
    python --version
    Write-Host ""

    # Create/activate virtual environment if it doesn't exist
    $venvPath = Join-Path $ProjectRoot ".venv"
    if (-not (Test-Path $venvPath)) {
        Write-Host "Creating virtual environment..."
        python -m venv $venvPath
    }

    # Activate venv
    $activateScript = Join-Path $venvPath "Scripts\Activate.ps1"
    if (Test-Path $activateScript) {
        Write-Host "Activating virtual environment..."
        & $activateScript
    }

    # Install dependencies
    Write-Host "Installing dependencies..."
    pip install --upgrade pip
    pip install pypdf Pillow pyinstaller

    # Clean previous builds
    $distDir = Join-Path $ProjectRoot "dist"
    $buildDir = Join-Path $ProjectRoot "build"
    
    if (Test-Path $distDir) {
        Write-Host "Cleaning dist directory..."
        Remove-Item -Recurse -Force $distDir
    }
    if (Test-Path $buildDir) {
        Write-Host "Cleaning build directory..."
        Remove-Item -Recurse -Force $buildDir
    }

    # Run PyInstaller
    Write-Host ""
    Write-Host "Running PyInstaller..."
    Write-Host ""
    
    $specFile = Join-Path $ScriptDir "pdf-compress.spec"
    pyinstaller --clean --noconfirm $specFile

    # Check result
    $exePath = Join-Path $distDir "pdf-compress.exe"
    if (Test-Path $exePath) {
        $exeSize = (Get-Item $exePath).Length / 1MB
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host "Build successful!" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output: $exePath"
        Write-Host "Size:   $([math]::Round($exeSize, 2)) MB"
        Write-Host ""
        Write-Host "To install context menu, run:"
        Write-Host "  .\install\windows\install-context-menu.ps1"
    } else {
        Write-Error "Build failed - executable not found"
        exit 1
    }

} finally {
    Pop-Location
}
