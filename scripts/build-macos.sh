#!/bin/bash
#
# Build the PDF Compressor executable for macOS.
#
# Usage:
#   ./scripts/build-macos.sh
#
# Output:
#   dist/pdf-compress (macOS executable)
#

set -e

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "================================"
echo "PDF Compressor - macOS Build"
echo "================================"
echo ""

cd "$PROJECT_ROOT"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 not found. Please install Python 3.10+."
    exit 1
fi

echo "Python: $(which python3)"
python3 --version
echo ""

# Create/activate virtual environment if it doesn't exist
VENV_PATH="$PROJECT_ROOT/.venv"
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_PATH"
fi

# Activate venv
echo "Activating virtual environment..."
source "$VENV_PATH/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install pypdf Pillow pyinstaller

# Clean previous builds
echo ""
if [ -d "$PROJECT_ROOT/dist" ]; then
    echo "Cleaning dist directory..."
    rm -rf "$PROJECT_ROOT/dist"
fi
if [ -d "$PROJECT_ROOT/build" ]; then
    echo "Cleaning build directory..."
    rm -rf "$PROJECT_ROOT/build"
fi

# Run PyInstaller
echo ""
echo "Running PyInstaller..."
echo ""

SPEC_FILE="$SCRIPT_DIR/pdf-compress.spec"
pyinstaller --clean --noconfirm "$SPEC_FILE"

# Check result
EXE_PATH="$PROJECT_ROOT/dist/pdf-compress"
if [ -f "$EXE_PATH" ]; then
    EXE_SIZE=$(du -h "$EXE_PATH" | cut -f1)
    
    # Ad-hoc sign the binary (required for modern macOS)
    echo ""
    echo "Signing binary (ad-hoc)..."
    codesign --force --sign - "$EXE_PATH" || true
    
    echo ""
    echo "================================"
    echo "Build successful!"
    echo "================================"
    echo ""
    echo "Output: $EXE_PATH"
    echo "Size:   $EXE_SIZE"
    echo ""
    echo "To install Quick Action, run:"
    echo "  ./install/macos/install.command"
else
    echo "Error: Build failed - executable not found"
    exit 1
fi
