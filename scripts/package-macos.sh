#!/bin/bash
#
# Package PDF Compressor for macOS release.
#
# Builds the binary if needed, then creates dist/pdf-compressor-macos.zip
# containing the executable, installer, and uninstaller.
# Run on macOS only.
#
# Usage:
#   ./scripts/package-macos.sh
#
# Output:
#   dist/pdf-compressor-macos.zip
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INSTALL_MACOS="$PROJECT_ROOT/install/macos"
STAGING_NAME="pdf-compressor-macos"
DIST_DIR="$PROJECT_ROOT/dist"
EXE_PATH="$DIST_DIR/pdf-compress"
STAGING_DIR="$DIST_DIR/$STAGING_NAME"
ZIP_PATH="$DIST_DIR/pdf-compressor-macos.zip"

if [ "$(uname -s)" != "Darwin" ]; then
    echo "Error: This script must be run on macOS (creates macOS binary and zip)."
    exit 1
fi

echo ""
echo "========================================"
echo "PDF Compressor - macOS Package"
echo "========================================"
echo ""

cd "$PROJECT_ROOT"

# Build binary if missing
if [ ! -f "$EXE_PATH" ]; then
    echo "Binary not found. Running build..."
    "$SCRIPT_DIR/build-macos.sh"
else
    echo "Using existing binary: $EXE_PATH"
fi

echo ""
echo "Assembling release folder..."

rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"

# Copy binary and install assets
cp "$EXE_PATH" "$STAGING_DIR/pdf-compress"
cp "$INSTALL_MACOS/install.command" "$STAGING_DIR/"
cp "$INSTALL_MACOS/uninstall.command" "$STAGING_DIR/"

# Preserve execute bits for zip
chmod +x "$STAGING_DIR/pdf-compress"
chmod +x "$STAGING_DIR/install.command"
chmod +x "$STAGING_DIR/uninstall.command"

# Release readme
cat > "$STAGING_DIR/README.txt" << 'README'
PDF Compressor for macOS
========================

Install (one-time):
  1. Double-click "install.command"
  2. If macOS blocks it: right-click → Open, then Open

Use:
  Right-click any PDF in Finder -> Open With -> PDF Compressor
  Output is saved as <filename>.compressed.pdf in the same folder.

Uninstall:
  Double-click "uninstall.command"

If "Open With -> PDF Compressor" does not appear:
  Re-run install.command, then restart Finder.
README

# Create zip (from dist so the archive has one root folder)
echo "Creating zip..."
rm -f "$ZIP_PATH"
(cd "$DIST_DIR" && zip -r "$STAGING_NAME.zip" "$STAGING_NAME" -x "*.DS_Store")

# Remove staging dir
rm -rf "$STAGING_DIR"

SIZE=$(du -h "$ZIP_PATH" | cut -f1)
echo ""
echo "========================================"
echo "Package ready!"
echo "========================================"
echo ""
echo "Output: $ZIP_PATH"
echo "Size:   $SIZE"
echo ""
echo "Share this zip with Mac users. They extract it and double-click install.command."
echo ""
