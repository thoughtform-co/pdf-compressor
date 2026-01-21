<#
.SYNOPSIS
    Uninstall the "Compress PDF to 30MB" context menu entry.

.DESCRIPTION
    Removes the right-click menu item for .pdf files and optionally
    removes the installed executable.

.PARAMETER KeepExecutable
    If specified, keeps the installed executable in AppData.

.EXAMPLE
    .\uninstall-context-menu.ps1

.EXAMPLE
    .\uninstall-context-menu.ps1 -KeepExecutable
#>

[CmdletBinding()]
param(
    [switch]$KeepExecutable
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "PDF Compressor - Context Menu Uninstaller" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Registry path
$menuKey = "HKCU:\Software\Classes\SystemFileAssociations\.pdf\shell\CompressPDFto30MB"

# Remove registry entry
if (Test-Path $menuKey) {
    Write-Host "Removing registry entry..."
    Remove-Item -Path $menuKey -Recurse -Force
    Write-Host "  Registry entry removed."
} else {
    Write-Host "  Registry entry not found (already removed)."
}

# Remove installed executable
if (-not $KeepExecutable) {
    $installLocation = Join-Path $env:LOCALAPPDATA "PDF Compressor"
    
    if (Test-Path $installLocation) {
        Write-Host "Removing installed files..."
        Remove-Item -Path $installLocation -Recurse -Force
        Write-Host "  Installed files removed."
    } else {
        Write-Host "  Installed files not found (already removed)."
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Uninstallation complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
