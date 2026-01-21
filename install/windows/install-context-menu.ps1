<#
.SYNOPSIS
    Install the "Compress PDF to 30MB" context menu entry for Windows Explorer.

.DESCRIPTION
    Adds a right-click menu item for .pdf files that runs the pdf-compress tool.
    The entry appears when you right-click any PDF file in Explorer.

.PARAMETER ExePath
    Path to pdf-compress.exe. If not specified, looks in dist/ or current directory.

.PARAMETER TargetMB
    Target size in MB for compression. Default: 30

.EXAMPLE
    .\install-context-menu.ps1

.EXAMPLE
    .\install-context-menu.ps1 -ExePath "C:\Tools\pdf-compress.exe"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$ExePath,

    [Parameter(Mandatory = $false)]
    [int]$TargetMB = 30
)

$ErrorActionPreference = "Stop"

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallDir = Split-Path -Parent $ScriptDir
$ProjectRoot = Split-Path -Parent $InstallDir

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PDF Compressor - Context Menu Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find the executable
if (-not $ExePath) {
    # Search in common locations
    $searchPaths = @(
        (Join-Path $ProjectRoot "dist\pdf-compress.exe"),
        (Join-Path $ProjectRoot "pdf-compress.exe"),
        (Join-Path $ScriptDir "pdf-compress.exe"),
        (Join-Path $env:LOCALAPPDATA "PDF Compressor\pdf-compress.exe")
    )
    
    foreach ($path in $searchPaths) {
        if (Test-Path $path) {
            $ExePath = $path
            break
        }
    }
}

if (-not $ExePath -or -not (Test-Path $ExePath)) {
    Write-Error @"
pdf-compress.exe not found!

Please either:
1. Build it first: .\scripts\build-windows.ps1
2. Specify the path: .\install-context-menu.ps1 -ExePath "C:\path\to\pdf-compress.exe"
"@
    exit 1
}

$ExePath = (Resolve-Path $ExePath).Path
Write-Host "Executable: $ExePath"

# Install to user's local app data for persistence
$installLocation = Join-Path $env:LOCALAPPDATA "PDF Compressor"
$installedExe = Join-Path $installLocation "pdf-compress.exe"

if ($ExePath -ne $installedExe) {
    Write-Host "Installing to: $installLocation"
    
    if (-not (Test-Path $installLocation)) {
        New-Item -ItemType Directory -Path $installLocation -Force | Out-Null
    }
    
    Copy-Item $ExePath $installedExe -Force
    $ExePath = $installedExe
}

# Registry paths
$shellKey = "HKCU:\Software\Classes\SystemFileAssociations\.pdf\shell"
$menuKey = "$shellKey\CompressPDFto30MB"
$commandKey = "$menuKey\command"

# Create registry entries
Write-Host ""
Write-Host "Creating registry entries..."

# Ensure parent keys exist
if (-not (Test-Path $shellKey)) {
    New-Item -Path $shellKey -Force | Out-Null
}

# Create menu entry
if (-not (Test-Path $menuKey)) {
    New-Item -Path $menuKey -Force | Out-Null
}

# Set display name
Set-ItemProperty -Path $menuKey -Name "(Default)" -Value "Compress PDF to ${TargetMB}MB"

# Set icon (use the exe itself as icon source)
Set-ItemProperty -Path $menuKey -Name "Icon" -Value "`"$ExePath`",0"

# Create command key
if (-not (Test-Path $commandKey)) {
    New-Item -Path $commandKey -Force | Out-Null
}

# Set command - use cmd /k to keep window open after completion
# This allows users to see the output before closing
$command = "cmd.exe /k `"`"$ExePath`" `"%1`" --target-mb $TargetMB && echo. && echo Press any key to close... && pause >nul`""
Set-ItemProperty -Path $commandKey -Name "(Default)" -Value $command

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Installation complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Right-click any PDF file in Explorer to see:"
Write-Host "  'Compress PDF to ${TargetMB}MB'"
Write-Host ""
Write-Host "To uninstall, run:"
Write-Host "  .\uninstall-context-menu.ps1"
Write-Host ""
