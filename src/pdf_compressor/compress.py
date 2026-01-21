"""
Core compression logic for PDF files.

Compresses PDFs by iteratively downsampling and recompressing embedded images
while preserving text and vector content (no page rasterization).

Uses Ghostscript + qpdf when available (much better compression),
falls back to pypdf when they're not installed.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image
from pypdf import PdfReader, PdfWriter


# =============================================================================
# GHOSTSCRIPT + QPDF DETECTION
# =============================================================================

def _find_ghostscript() -> Path | None:
    """Find Ghostscript executable."""
    import sys
    
    if sys.platform == "win32":
        # Check PATH first
        for name in ["gswin64c.exe", "gswin32c.exe"]:
            result = shutil.which(name)
            if result:
                return Path(result)
        
        # Search common install locations
        search_patterns = [
            Path("C:/Program Files/gs") / "*" / "bin" / "gswin64c.exe",
            Path("C:/Program Files (x86)/gs") / "*" / "bin" / "gswin32c.exe",
            Path(os.environ.get("LOCALAPPDATA", "")) / "Programs/gs" / "*" / "bin" / "gswin64c.exe",
        ]
        
        for pattern in search_patterns:
            parent = pattern.parent.parent
            if parent.exists():
                for gs_dir in parent.iterdir():
                    candidate = gs_dir / "bin" / pattern.name
                    if candidate.exists():
                        return candidate
    else:
        # macOS / Linux
        result = shutil.which("gs")
        if result:
            return Path(result)
    
    return None


def _find_qpdf() -> Path | None:
    """Find qpdf executable."""
    import sys
    
    if sys.platform == "win32":
        result = shutil.which("qpdf.exe")
        if result:
            return Path(result)
        
        # Search common install locations
        search_patterns = [
            Path("C:/Program Files") / "qpdf*" / "bin" / "qpdf.exe",
            Path("C:/Program Files (x86)") / "qpdf*" / "bin" / "qpdf.exe",
            Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "qpdf*" / "bin" / "qpdf.exe",
        ]
        
        for pattern in search_patterns:
            parent = pattern.parent.parent
            if parent.exists():
                for qpdf_dir in parent.iterdir():
                    if qpdf_dir.name.startswith("qpdf"):
                        candidate = qpdf_dir / "bin" / "qpdf.exe"
                        if candidate.exists():
                            return candidate
    else:
        result = shutil.which("qpdf")
        if result:
            return Path(result)
    
    return None


# =============================================================================
# COMPRESSION STEPS
# =============================================================================

@dataclass
class CompressionStep:
    """A single step in the compression ladder."""
    name: str
    dpi: int            # Image DPI for Ghostscript
    max_dimension: int  # max width or height in pixels (for pypdf fallback)
    quality: int        # JPEG quality 1-100


# Compression ladder: from least aggressive to most aggressive
COMPRESSION_LADDER: list[CompressionStep] = [
    CompressionStep("light",      dpi=200, max_dimension=2000, quality=85),
    CompressionStep("moderate",   dpi=175, max_dimension=1600, quality=75),
    CompressionStep("standard",   dpi=150, max_dimension=1200, quality=65),
    CompressionStep("aggressive", dpi=125, max_dimension=1000, quality=55),
    CompressionStep("heavy",      dpi=110, max_dimension=800,  quality=45),
    CompressionStep("extreme",    dpi=100, max_dimension=600,  quality=35),
]


@dataclass
class CompressionResult:
    """Result of a compression attempt."""
    success: bool
    output_path: Path | None
    original_size_bytes: int
    final_size_bytes: int
    target_reached: bool
    step_used: str
    error_message: str | None = None

    @property
    def original_size_mb(self) -> float:
        return self.original_size_bytes / (1024 * 1024)

    @property
    def final_size_mb(self) -> float:
        return self.final_size_bytes / (1024 * 1024)

    @property
    def reduction_ratio(self) -> float:
        if self.final_size_bytes == 0:
            return 0.0
        return self.original_size_bytes / self.final_size_bytes

    @property
    def savings_percent(self) -> float:
        if self.original_size_bytes == 0:
            return 0.0
        return (1 - self.final_size_bytes / self.original_size_bytes) * 100


# =============================================================================
# GHOSTSCRIPT + QPDF COMPRESSION (PREFERRED)
# =============================================================================

def _compress_with_ghostscript(
    gs_path: Path,
    qpdf_path: Path | None,
    input_path: Path,
    output_path: Path,
    dpi: int,
) -> int:
    """
    Compress PDF using Ghostscript (and optionally qpdf).
    Returns the output file size in bytes.
    """
    import sys
    
    mono_dpi = max(dpi, 150)
    
    # Build Ghostscript arguments
    gs_args = [
        str(gs_path),
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
        # Color image settings
        "-dDownsampleColorImages=true",
        f"-dColorImageResolution={dpi}",
        "-dColorImageDownsampleType=/Bicubic",
        "-dColorImageDownsampleThreshold=1.0",
        "-dAutoFilterColorImages=false",
        "-dColorImageFilter=/DCTEncode",
        # Gray image settings
        "-dDownsampleGrayImages=true",
        f"-dGrayImageResolution={dpi}",
        "-dGrayImageDownsampleType=/Bicubic",
        "-dGrayImageDownsampleThreshold=1.0",
        "-dAutoFilterGrayImages=false",
        "-dGrayImageFilter=/DCTEncode",
        # Mono image settings
        "-dDownsampleMonoImages=true",
        f"-dMonoImageResolution={mono_dpi}",
        "-dMonoImageDownsampleType=/Subsample",
        f"-sOutputFile={output_path}",
        str(input_path),
    ]
    
    # Run Ghostscript
    result = subprocess.run(
        gs_args,
        capture_output=True,
        text=True,
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
    )
    
    if result.returncode != 0 or not output_path.exists():
        raise RuntimeError(f"Ghostscript failed: {result.stderr}")
    
    # Optionally run qpdf for additional optimization
    if qpdf_path:
        temp_qpdf = output_path.with_suffix(".qpdf.pdf")
        qpdf_args = [
            str(qpdf_path),
            "--compress-streams=y",
            "--recompress-flate",
            "--object-streams=generate",
            str(output_path),
            str(temp_qpdf),
        ]
        
        result = subprocess.run(
            qpdf_args,
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0,
        )
        
        if result.returncode == 0 and temp_qpdf.exists():
            # Replace with qpdf output
            output_path.unlink()
            temp_qpdf.rename(output_path)
    
    return output_path.stat().st_size


# =============================================================================
# PYPDF FALLBACK COMPRESSION
# =============================================================================

def _resize_image_if_needed(
    img: Image.Image,
    max_dimension: int,
) -> Image.Image:
    """Resize image if it exceeds max_dimension, preserving aspect ratio."""
    width, height = img.size
    if width <= max_dimension and height <= max_dimension:
        return img

    # Calculate scale to fit within max_dimension
    scale = min(max_dimension / width, max_dimension / height)
    new_size = (int(width * scale), int(height * scale))
    return img.resize(new_size, Image.Resampling.LANCZOS)


def _prepare_image_for_jpeg(img: Image.Image) -> Image.Image:
    """Convert image to a mode compatible with JPEG encoding."""
    if img.mode in ("RGB", "L"):
        return img
    if img.mode == "RGBA":
        # Composite onto white background to remove transparency
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])  # Use alpha as mask
        return background
    if img.mode == "P":
        # Palette mode - convert to RGB or RGBA first
        if "transparency" in img.info:
            return _prepare_image_for_jpeg(img.convert("RGBA"))
        return img.convert("RGB")
    if img.mode == "LA":
        # Grayscale with alpha
        background = Image.new("L", img.size, 255)
        background.paste(img, mask=img.split()[1])
        return background
    # Fallback: convert to RGB
    return img.convert("RGB")


def _compress_pdf_single_pass(
    input_path: Path,
    output_path: Path,
    step: CompressionStep,
) -> int:
    """
    Compress a PDF using the given compression step.
    Returns the output file size in bytes.
    """
    reader = PdfReader(str(input_path))
    writer = PdfWriter()

    # Copy all pages to writer
    for page in reader.pages:
        writer.add_page(page)

    # Process images on each page
    for page in writer.pages:
        try:
            images = page.images
        except Exception:
            # Some pages may not have images or may have issues
            continue

        for img_file in images:
            try:
                pil_img = img_file.image
                if pil_img is None:
                    continue

                # Prepare for JPEG encoding
                pil_img = _prepare_image_for_jpeg(pil_img)

                # Resize if needed
                pil_img = _resize_image_if_needed(pil_img, step.max_dimension)

                # Replace with compressed version
                img_file.replace(pil_img, quality=step.quality, optimize=True)

            except Exception:
                # Skip images that can't be processed
                continue

    # Write output
    with open(output_path, "wb") as f:
        writer.write(f)

    return output_path.stat().st_size


def _estimate_starting_step_gs(original_size: int, target_size: int) -> int:
    """
    Estimate starting step for Ghostscript compression.
    Ghostscript is more effective, so we can be less aggressive initially.
    """
    if target_size >= original_size:
        return 0
    
    ratio_needed = original_size / target_size
    
    # Ghostscript is more effective - use lighter initial steps
    if ratio_needed < 3:
        return 0  # light
    elif ratio_needed < 5:
        return 1  # moderate
    elif ratio_needed < 8:
        return 2  # standard
    elif ratio_needed < 12:
        return 3  # aggressive
    elif ratio_needed < 20:
        return 4  # heavy
    else:
        return 5  # extreme


def _estimate_starting_step_pypdf(original_size: int, target_size: int) -> int:
    """
    Estimate starting step for pypdf compression.
    pypdf is less effective, so we need more aggressive steps.
    """
    if target_size >= original_size:
        return 0
    
    ratio_needed = original_size / target_size
    
    # pypdf is less effective - need more aggressive starting points
    if ratio_needed < 1.5:
        return 0
    elif ratio_needed < 2:
        return 1
    elif ratio_needed < 3:
        return 2
    elif ratio_needed < 4:
        return 3
    elif ratio_needed < 5:
        return 4
    else:
        return 5  # extreme - max index


def compress_pdf(
    input_path: Path | str,
    output_path: Path | str | None = None,
    target_mb: float = 30.0,
    progress_callback: Callable[[str], None] | None = None,
) -> CompressionResult:
    """
    Compress a PDF file to achieve the target size.

    Args:
        input_path: Path to the input PDF file.
        output_path: Path for the output file. If None, uses <input>.compressed.pdf.
        target_mb: Target file size in megabytes.
        progress_callback: Optional callback for progress messages.

    Returns:
        CompressionResult with details about the compression.
    """
    input_path = Path(input_path)
    
    if not input_path.exists():
        return CompressionResult(
            success=False,
            output_path=None,
            original_size_bytes=0,
            final_size_bytes=0,
            target_reached=False,
            step_used="none",
            error_message=f"Input file not found: {input_path}",
        )

    # Determine output path
    if output_path is None:
        stem = input_path.stem
        # Remove any existing .compressed suffix to avoid double-naming
        if stem.endswith(".compressed"):
            stem = stem[:-11]
        output_path = input_path.parent / f"{stem}.compressed.pdf"
    else:
        output_path = Path(output_path)

    original_size = input_path.stat().st_size
    target_bytes = int(target_mb * 1024 * 1024)

    def log(msg: str) -> None:
        if progress_callback:
            progress_callback(msg)

    log(f"Input: {input_path.name}")
    log(f"Original size: {original_size / (1024*1024):.2f} MB")
    log(f"Target: {target_mb:.0f} MB")

    # If already under target, just copy
    if original_size <= target_bytes:
        log("File already under target size, copying as-is.")
        shutil.copy2(input_path, output_path)
        return CompressionResult(
            success=True,
            output_path=output_path,
            original_size_bytes=original_size,
            final_size_bytes=original_size,
            target_reached=True,
            step_used="none (already under target)",
        )

    # Check for Ghostscript + qpdf (preferred, much better compression)
    gs_path = _find_ghostscript()
    qpdf_path = _find_qpdf()
    use_ghostscript = gs_path is not None
    
    if use_ghostscript:
        log(f"Using Ghostscript: {gs_path}")
        if qpdf_path:
            log(f"Using qpdf: {qpdf_path}")
        start_index = _estimate_starting_step_gs(original_size, target_bytes)
    else:
        log("Ghostscript not found - using pypdf fallback (less effective)")
        log("Install Ghostscript for much better compression:")
        log("  https://ghostscript.com/releases/gsdnld.html")
        start_index = _estimate_starting_step_pypdf(original_size, target_bytes)

    ratio_needed = original_size / target_bytes
    log(f"Compression ratio needed: {ratio_needed:.1f}x -> starting at step '{COMPRESSION_LADDER[start_index].name}'")

    # Track best result
    best_size = original_size
    best_temp_path: Path | None = None
    best_step_name = "none"

    # Create temp directory for intermediate files
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)

        # Start from estimated step and go more aggressive if needed
        for step in COMPRESSION_LADDER[start_index:]:
            if use_ghostscript:
                log(f"Trying step '{step.name}' (DPI {step.dpi})...")
            else:
                log(f"Trying step '{step.name}' (max {step.max_dimension}px, quality {step.quality})...")

            temp_output = temp_dir_path / f"compressed_{step.name}.pdf"

            try:
                if use_ghostscript:
                    result_size = _compress_with_ghostscript(
                        gs_path, qpdf_path, input_path, temp_output, step.dpi
                    )
                else:
                    result_size = _compress_pdf_single_pass(input_path, temp_output, step)
                log(f"  -> {result_size / (1024*1024):.2f} MB")

                # Track best result
                if result_size < best_size:
                    best_size = result_size
                    best_step_name = step.name
                    # Keep copy of best result
                    if best_temp_path and best_temp_path.exists():
                        best_temp_path.unlink()
                    best_temp_path = temp_dir_path / "best.pdf"
                    shutil.copy2(temp_output, best_temp_path)

                # Check if target reached
                if result_size <= target_bytes:
                    log("Target reached!")
                    shutil.copy2(temp_output, output_path)
                    return CompressionResult(
                        success=True,
                        output_path=output_path,
                        original_size_bytes=original_size,
                        final_size_bytes=result_size,
                        target_reached=True,
                        step_used=step.name,
                    )

            except Exception as e:
                log(f"  -> Step failed: {e}")
                continue

        # Target not reached - use best result
        if best_temp_path and best_temp_path.exists():
            shutil.copy2(best_temp_path, output_path)
            log(f"Target not reached. Best result: {best_size / (1024*1024):.2f} MB (step: {best_step_name})")
            return CompressionResult(
                success=True,
                output_path=output_path,
                original_size_bytes=original_size,
                final_size_bytes=best_size,
                target_reached=False,
                step_used=best_step_name,
            )

        # Complete failure
        return CompressionResult(
            success=False,
            output_path=None,
            original_size_bytes=original_size,
            final_size_bytes=0,
            target_reached=False,
            step_used="none",
            error_message="All compression steps failed.",
        )
