<#
.SYNOPSIS
    Compress PDF files by downsampling images while preserving selectable text.

.DESCRIPTION
    Uses Ghostscript + qpdf to drastically reduce PDF file size without flattening text.
    Iterates through DPI presets to try to reach a target file size.

.PARAMETER InputPdf
    Path to the PDF file to compress (required).

.PARAMETER OutputPdf
    Path for the compressed output. Defaults to <input>.compressed.pdf.

.PARAMETER TargetMB
    Target file size in megabytes. Default: 30.

.PARAMETER MinDpi
    Minimum image DPI (won't go below this). Default: 100.

.PARAMETER Profile
    Compression profile: llm, balanced, or aggressive. Default: llm.

.EXAMPLE
    .\compress-pdf.ps1 -InputPdf "huge.pdf"

.EXAMPLE
    .\compress-pdf.ps1 -InputPdf "huge.pdf" -TargetMB 25 -Profile aggressive
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$InputPdf,

    [Parameter(Mandatory = $false)]
    [string]$OutputPdf,

    [Parameter(Mandatory = $false)]
    [int]$TargetMB = 30,

    [Parameter(Mandatory = $false)]
    [int]$MinDpi = 100,

    [Parameter(Mandatory = $false)]
    [ValidateSet("llm", "balanced", "aggressive")]
    [string]$Profile = "llm"
)

# ============================================================================
# TOOL DETECTION
# ============================================================================

function Find-Ghostscript {
    # Check PATH first
    $gsCmd = Get-Command "gswin64c.exe" -ErrorAction SilentlyContinue
    if ($gsCmd) { return $gsCmd.Source }

    $gsCmd = Get-Command "gswin32c.exe" -ErrorAction SilentlyContinue
    if ($gsCmd) { return $gsCmd.Source }

    # Search common install locations
    $searchPaths = @(
        "C:\Program Files\gs\*\bin\gswin64c.exe",
        "C:\Program Files (x86)\gs\*\bin\gswin32c.exe",
        "C:\Program Files\gs\*\bin\gswin32c.exe",
        "$env:LOCALAPPDATA\Programs\gs\*\bin\gswin64c.exe"
    )

    foreach ($pattern in $searchPaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }

    return $null
}

function Find-Qpdf {
    # Check PATH first
    $qpdfCmd = Get-Command "qpdf.exe" -ErrorAction SilentlyContinue
    if ($qpdfCmd) { return $qpdfCmd.Source }

    # Search common install locations
    $searchPaths = @(
        "C:\Program Files\qpdf*\bin\qpdf.exe",
        "C:\Program Files (x86)\qpdf*\bin\qpdf.exe",
        "$env:LOCALAPPDATA\Programs\qpdf*\bin\qpdf.exe"
    )

    foreach ($pattern in $searchPaths) {
        $found = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }

    return $null
}

# ============================================================================
# HELPERS
# ============================================================================

function Get-FileSizeMB {
    param([string]$Path)
    if (Test-Path $Path) {
        return [math]::Round((Get-Item $Path).Length / 1MB, 2)
    }
    return 0
}

function Format-FileSize {
    param([double]$SizeBytes)
    if ($SizeBytes -ge 1GB) {
        return "{0:N2} GB" -f ($SizeBytes / 1GB)
    } elseif ($SizeBytes -ge 1MB) {
        return "{0:N2} MB" -f ($SizeBytes / 1MB)
    } elseif ($SizeBytes -ge 1KB) {
        return "{0:N2} KB" -f ($SizeBytes / 1KB)
    } else {
        return "$SizeBytes bytes"
    }
}

# ============================================================================
# COMPRESSION
# ============================================================================

function Invoke-GhostscriptCompress {
    param(
        [string]$GsPath,
        [string]$InputFile,
        [string]$OutputFile,
        [int]$Dpi
    )

    $monoDpi = [math]::Max($Dpi, 150)
    
    # Build argument string (Ghostscript needs specific formatting)
    $argString = @(
        "-sDEVICE=pdfwrite",
        "-dNOPAUSE",
        "-dBATCH",
        "-dSAFER",
        "-dQUIET",
        "-dCompatibilityLevel=1.5",
        "-dDetectDuplicateImages=true",
        "-dSubsetFonts=true",
        "-dCompressFonts=true",
        "-dEmbedAllFonts=true",
        "-dDownsampleColorImages=true",
        "-dColorImageResolution=$Dpi",
        "-dColorImageDownsampleType=/Bicubic",
        "-dColorImageDownsampleThreshold=1.0",
        "-dAutoFilterColorImages=false",
        "-dColorImageFilter=/DCTEncode",
        "-dDownsampleGrayImages=true",
        "-dGrayImageResolution=$Dpi",
        "-dGrayImageDownsampleType=/Bicubic",
        "-dGrayImageDownsampleThreshold=1.0",
        "-dAutoFilterGrayImages=false",
        "-dGrayImageFilter=/DCTEncode",
        "-dDownsampleMonoImages=true",
        "-dMonoImageResolution=$monoDpi",
        "-dMonoImageDownsampleType=/Subsample",
        "`"-sOutputFile=$OutputFile`"",
        "`"$InputFile`""
    ) -join " "

    # Use cmd /c to run Ghostscript (handles paths with spaces better)
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"`"$GsPath`" $argString`"" -NoNewWindow -Wait -PassThru
    return ($process.ExitCode -eq 0) -and (Test-Path $OutputFile)
}

function Invoke-QpdfOptimize {
    param(
        [string]$QpdfPath,
        [string]$InputFile,
        [string]$OutputFile
    )

    $argString = "--compress-streams=y --recompress-flate --object-streams=generate `"$InputFile`" `"$OutputFile`""
    
    $process = Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"`"$QpdfPath`" $argString`"" -NoNewWindow -Wait -PassThru
    return ($process.ExitCode -eq 0) -and (Test-Path $OutputFile)
}

# ============================================================================
# MAIN
# ============================================================================

# Validate input file
if (-not (Test-Path $InputPdf)) {
    Write-Error "Input file not found: $InputPdf"
    exit 1
}

$InputPdf = (Resolve-Path $InputPdf).Path

# Set default output path
if (-not $OutputPdf) {
    $dir = Split-Path $InputPdf -Parent
    $name = [System.IO.Path]::GetFileNameWithoutExtension($InputPdf)
    $OutputPdf = Join-Path $dir "$name.compressed.pdf"
}

# Find tools
$gsPath = Find-Ghostscript
$qpdfPath = Find-Qpdf

if (-not $gsPath) {
    Write-Error @"
Ghostscript not found!

Please install from: https://ghostscript.com/releases/gsdnld.html
Or add the bin folder to your PATH.
"@
    exit 1
}

if (-not $qpdfPath) {
    Write-Error @"
qpdf not found!

Please install from: https://github.com/qpdf/qpdf/releases
Or add the bin folder to your PATH.
"@
    exit 1
}

# Define DPI ladder based on profile
$dpiLadder = switch ($Profile) {
    "llm"        { @(200, 175, 150, 125, 110, 100) }
    "balanced"   { @(250, 225, 200, 175, 150) }
    "aggressive" { @(150, 125, 100, 85, 72) }
}

# Filter by MinDpi
$dpiLadder = $dpiLadder | Where-Object { $_ -ge $MinDpi }
if ($dpiLadder.Count -eq 0) {
    $dpiLadder = @($MinDpi)
}

# Get original size
$originalSize = (Get-Item $InputPdf).Length
$originalSizeMB = Get-FileSizeMB $InputPdf
$targetBytes = $TargetMB * 1MB

Write-Host ""
Write-Host "PDF Compressor" -ForegroundColor Cyan
Write-Host "==============" -ForegroundColor Cyan
Write-Host "Input:    $InputPdf"
Write-Host "Size:     $(Format-FileSize $originalSize)"
Write-Host "Target:   $TargetMB MB"
Write-Host "Profile:  $Profile"
Write-Host "DPI range: $($dpiLadder[-1]) - $($dpiLadder[0])"
Write-Host ""
Write-Host "Tools found:"
Write-Host "  Ghostscript: $gsPath"
Write-Host "  qpdf:        $qpdfPath"
Write-Host ""

# Temp files in system temp folder
$tempDir = [System.IO.Path]::GetTempPath()
$tempGs = Join-Path $tempDir "pdfcompress_gs_$([System.Guid]::NewGuid().ToString('N')).pdf"
$tempQpdf = Join-Path $tempDir "pdfcompress_qpdf_$([System.Guid]::NewGuid().ToString('N')).pdf"

$bestResult = $null
$bestSize = [long]::MaxValue
$bestDpi = 0

try {
    foreach ($dpi in $dpiLadder) {
        Write-Host "Trying DPI $dpi... " -NoNewline

        # Clean up temp files from previous iteration
        if (Test-Path $tempGs) { Remove-Item $tempGs -Force }
        if (Test-Path $tempQpdf) { Remove-Item $tempQpdf -Force }

        # Ghostscript pass
        $gsSuccess = Invoke-GhostscriptCompress -GsPath $gsPath -InputFile $InputPdf -OutputFile $tempGs -Dpi $dpi
        if (-not $gsSuccess) {
            Write-Host "Ghostscript failed" -ForegroundColor Red
            continue
        }

        # qpdf pass
        $qpdfSuccess = Invoke-QpdfOptimize -QpdfPath $qpdfPath -InputFile $tempGs -OutputFile $tempQpdf
        if (-not $qpdfSuccess) {
            Write-Host "qpdf failed" -ForegroundColor Red
            continue
        }

        $resultSize = (Get-Item $tempQpdf).Length
        $resultSizeMB = Get-FileSizeMB $tempQpdf
        $ratio = [math]::Round(($originalSize / $resultSize), 1)

        Write-Host "$(Format-FileSize $resultSize) (${ratio}x reduction)" -ForegroundColor Green

        # Track best result
        if ($resultSize -lt $bestSize) {
            $bestSize = $resultSize
            $bestDpi = $dpi
            if ($bestResult -and (Test-Path $bestResult)) {
                Remove-Item $bestResult -Force
            }
            $bestResult = Join-Path $tempDir "pdfcompress_best_$([System.Guid]::NewGuid().ToString('N')).pdf"
            Copy-Item $tempQpdf $bestResult -Force
        }

        # Stop if we hit the target
        if ($resultSize -le $targetBytes) {
            Write-Host ""
            Write-Host "Target reached!" -ForegroundColor Green
            break
        }
    }

    # Copy best result to output
    if ($bestResult -and (Test-Path $bestResult)) {
        Copy-Item $bestResult $OutputPdf -Force
        
        $finalSize = (Get-Item $OutputPdf).Length
        $finalRatio = [math]::Round(($originalSize / $finalSize), 1)
        $savings = [math]::Round((1 - $finalSize / $originalSize) * 100, 1)

        Write-Host ""
        Write-Host "Done!" -ForegroundColor Cyan
        Write-Host "======" -ForegroundColor Cyan
        Write-Host "Output:   $OutputPdf"
        Write-Host "Original: $(Format-FileSize $originalSize)"
        Write-Host "Final:    $(Format-FileSize $finalSize)"
        Write-Host "Savings:  $savings% (${finalRatio}x smaller)"
        Write-Host "DPI used: $bestDpi"

        if ($finalSize -gt $targetBytes) {
            Write-Host ""
            Write-Host "Note: Could not reach $TargetMB MB target. Consider:" -ForegroundColor Yellow
            Write-Host "  - Using -Profile aggressive" -ForegroundColor Yellow
            Write-Host "  - Lowering -MinDpi (e.g., 80 or 72)" -ForegroundColor Yellow
        }
    } else {
        Write-Error "Compression failed - no valid output produced"
        exit 1
    }

} finally {
    # Cleanup temp files
    @($tempGs, $tempQpdf, $bestResult) | ForEach-Object {
        if ($_ -and (Test-Path $_)) {
            Remove-Item $_ -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host ""
