"""
Command-line interface for PDF Compressor.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pdf_compressor.compress import compress_pdf, CompressionResult


def format_size(bytes_val: int) -> str:
    """Format bytes as human-readable string."""
    if bytes_val >= 1024 * 1024 * 1024:
        return f"{bytes_val / (1024**3):.2f} GB"
    if bytes_val >= 1024 * 1024:
        return f"{bytes_val / (1024**2):.2f} MB"
    if bytes_val >= 1024:
        return f"{bytes_val / 1024:.2f} KB"
    return f"{bytes_val} bytes"


def print_result(result: CompressionResult) -> None:
    """Print compression result summary."""
    print()
    print("=" * 50)
    
    if not result.success:
        print(f"FAILED: {result.error_message}")
        return

    print(f"Output:   {result.output_path}")
    print(f"Original: {format_size(result.original_size_bytes)}")
    print(f"Final:    {format_size(result.final_size_bytes)}")
    print(f"Savings:  {result.savings_percent:.1f}% ({result.reduction_ratio:.1f}x smaller)")
    print(f"Step:     {result.step_used}")
    
    if result.target_reached:
        print("\nTarget size reached!")
    else:
        print(f"\nNote: Could not reach target size.")
        print("      The PDF may have large vector graphics or few compressible images.")


def process_file(input_path: Path, target_mb: float, output_path: Path | None) -> bool:
    """Process a single PDF file. Returns True on success."""
    print()
    print("=" * 50)
    print("PDF Compressor")
    print("=" * 50)

    def progress(msg: str) -> None:
        print(msg)

    result = compress_pdf(
        input_path=input_path,
        output_path=output_path,
        target_mb=target_mb,
        progress_callback=progress,
    )

    print_result(result)
    return result.success


def main() -> int:
    """Main entry point."""
    parser = argparse.ArgumentParser(
        prog="pdf-compress",
        description="Compress PDF files by downsampling images while preserving text.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  pdf-compress document.pdf
  pdf-compress document.pdf --target-mb 25
  pdf-compress document.pdf -o smaller.pdf
  pdf-compress *.pdf
        """,
    )

    parser.add_argument(
        "input",
        nargs="+",
        type=Path,
        help="PDF file(s) to compress",
    )

    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=None,
        help="Output path (only valid with single input file). "
             "Default: <input>.compressed.pdf",
    )

    parser.add_argument(
        "-t", "--target-mb",
        type=float,
        default=30.0,
        help="Target file size in MB (default: 30)",
    )

    parser.add_argument(
        "-q", "--quiet",
        action="store_true",
        help="Suppress progress output",
    )

    parser.add_argument(
        "--version",
        action="version",
        version="%(prog)s 2.0.0",
    )

    args = parser.parse_args()

    # Validate: can't use -o with multiple inputs
    if args.output and len(args.input) > 1:
        print("Error: --output can only be used with a single input file.", file=sys.stderr)
        return 1

    # Process each input file
    success_count = 0
    fail_count = 0

    for input_path in args.input:
        if not input_path.exists():
            print(f"Error: File not found: {input_path}", file=sys.stderr)
            fail_count += 1
            continue

        if not input_path.suffix.lower() == ".pdf":
            print(f"Warning: Skipping non-PDF file: {input_path}", file=sys.stderr)
            continue

        output_path = args.output if len(args.input) == 1 else None

        if process_file(input_path, args.target_mb, output_path):
            success_count += 1
        else:
            fail_count += 1

    # Summary for multiple files
    if len(args.input) > 1:
        print()
        print("=" * 50)
        print(f"Processed {success_count + fail_count} files: "
              f"{success_count} succeeded, {fail_count} failed")

    return 0 if fail_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
