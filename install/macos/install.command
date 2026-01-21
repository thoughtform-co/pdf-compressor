#!/bin/bash
#
# PDF Compressor - macOS Installer
#
# Installs:
#   1. The pdf-compress binary to ~/Library/Application Support/PDF Compressor/
#   2. The Quick Action workflow to ~/Library/Services/
#
# Double-click this file to run, or execute from Terminal.
#

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_ROOT="$(dirname "$INSTALL_DIR")"

echo ""
echo "========================================"
echo "PDF Compressor - macOS Installer"
echo "========================================"
echo ""

# Directories
APP_SUPPORT_DIR="$HOME/Library/Application Support/PDF Compressor"
SERVICES_DIR="$HOME/Library/Services"
WORKFLOW_NAME="Compress PDF to 30MB.workflow"

# Find the executable
EXE_PATH=""
SEARCH_PATHS=(
    "$PROJECT_ROOT/dist/pdf-compress"
    "$SCRIPT_DIR/pdf-compress"
    "$PROJECT_ROOT/pdf-compress"
)

for path in "${SEARCH_PATHS[@]}"; do
    if [ -f "$path" ]; then
        EXE_PATH="$path"
        break
    fi
done

if [ -z "$EXE_PATH" ]; then
    echo "Error: pdf-compress executable not found!"
    echo ""
    echo "Please build it first:"
    echo "  ./scripts/build-macos.sh"
    echo ""
    echo "Or place pdf-compress in one of these locations:"
    for path in "${SEARCH_PATHS[@]}"; do
        echo "  - $path"
    done
    exit 1
fi

echo "Found executable: $EXE_PATH"

# Create application support directory
echo ""
echo "Installing binary..."
mkdir -p "$APP_SUPPORT_DIR"
cp "$EXE_PATH" "$APP_SUPPORT_DIR/pdf-compress"
chmod +x "$APP_SUPPORT_DIR/pdf-compress"

# Remove quarantine attribute (prevents Gatekeeper issues)
echo "Clearing quarantine attributes..."
xattr -dr com.apple.quarantine "$APP_SUPPORT_DIR/pdf-compress" 2>/dev/null || true

# Ad-hoc sign the binary if not already signed
echo "Signing binary (ad-hoc)..."
codesign --force --sign - "$APP_SUPPORT_DIR/pdf-compress" 2>/dev/null || true

echo "  Installed to: $APP_SUPPORT_DIR/pdf-compress"

# Install Quick Action workflow
echo ""
echo "Installing Quick Action..."
WORKFLOW_SRC="$SCRIPT_DIR/$WORKFLOW_NAME"

if [ -d "$WORKFLOW_SRC" ]; then
    mkdir -p "$SERVICES_DIR"
    
    # Remove existing workflow if present
    if [ -d "$SERVICES_DIR/$WORKFLOW_NAME" ]; then
        rm -rf "$SERVICES_DIR/$WORKFLOW_NAME"
    fi
    
    cp -R "$WORKFLOW_SRC" "$SERVICES_DIR/"
    
    # Clear quarantine on workflow
    xattr -dr com.apple.quarantine "$SERVICES_DIR/$WORKFLOW_NAME" 2>/dev/null || true
    
    echo "  Installed to: $SERVICES_DIR/$WORKFLOW_NAME"
else
    echo "  Warning: Workflow not found at $WORKFLOW_SRC"
    echo "  Quick Action not installed."
fi

# Refresh Services menu
echo ""
echo "Refreshing Services menu..."
/System/Library/CoreServices/pbs -flush 2>/dev/null || true

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "To use:"
echo "  1. Right-click any PDF file in Finder"
echo "  2. Go to Quick Actions (or Services)"
echo "  3. Select 'Compress PDF to 30MB'"
echo ""
echo "The compressed file will be saved as <filename>.compressed.pdf"
echo ""
echo "Note: If the Quick Action doesn't appear immediately,"
echo "      try logging out and back in, or restart Finder."
echo ""
echo "To uninstall, run: ./uninstall.command"
echo ""
