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

# Get script directory (works when run from Finder or Terminal)
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

# Find the executable (prefer same folder as this script for release zip)
EXE_PATH=""
SEARCH_PATHS=(
    "$SCRIPT_DIR/pdf-compress"
    "$PROJECT_ROOT/dist/pdf-compress"
    "$PROJECT_ROOT/pdf-compress"
)

for path in "${SEARCH_PATHS[@]}"; do
    if [ -f "$path" ]; then
        EXE_PATH="$path"
        break
    fi
done

if [ -z "$EXE_PATH" ]; then
    echo "Error: pdf-compress executable not found."
    echo ""
    echo "If you built from source, run first:"
    echo "  ./scripts/build-macos.sh"
    echo ""
    echo "If you downloaded the zip, ensure pdf-compress is in the same folder as this installer."
    echo "Searched:"
    for path in "${SEARCH_PATHS[@]}"; do
        echo "  - $path"
    done
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Ensure source binary is executable
chmod +x "$EXE_PATH"
echo "Found executable: $EXE_PATH"

# Create application support directory and install binary
echo ""
echo "Installing binary..."
mkdir -p "$APP_SUPPORT_DIR"
cp "$EXE_PATH" "$APP_SUPPORT_DIR/pdf-compress"
chmod +x "$APP_SUPPORT_DIR/pdf-compress"

# Remove quarantine attribute (reduces Gatekeeper issues when run from zip)
echo "Clearing quarantine on binary..."
if xattr -dr com.apple.quarantine "$APP_SUPPORT_DIR/pdf-compress" 2>/dev/null; then
    echo "  Quarantine cleared."
else
    echo "  (Quarantine clear skipped or not needed.)"
fi

# Ad-hoc sign so macOS allows execution without extra prompts
echo "Signing binary (ad-hoc)..."
if codesign --force --sign - "$APP_SUPPORT_DIR/pdf-compress" 2>/dev/null; then
    echo "  Signed successfully."
else
    echo "  (Signing skipped; binary may still work.)"
fi

# Verify installed binary runs
if ! "$APP_SUPPORT_DIR/pdf-compress" --version &>/dev/null; then
    echo ""
    echo "Warning: Installed binary did not run (--version check failed)."
    echo "You may need to allow it in System Settings → Privacy & Security."
fi
echo "  Installed to: $APP_SUPPORT_DIR/pdf-compress"

# Install Quick Action workflow
echo ""
echo "Installing Quick Action..."
WORKFLOW_SRC="$SCRIPT_DIR/$WORKFLOW_NAME"

if [ ! -d "$WORKFLOW_SRC" ]; then
    echo "Error: Quick Action workflow not found at:"
    echo "  $WORKFLOW_SRC"
    echo ""
    echo "The installer archive may be incomplete. Ensure '$WORKFLOW_NAME' is in the same folder as this script."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

mkdir -p "$SERVICES_DIR"
if [ -d "$SERVICES_DIR/$WORKFLOW_NAME" ]; then
    rm -rf "$SERVICES_DIR/$WORKFLOW_NAME"
fi
cp -R "$WORKFLOW_SRC" "$SERVICES_DIR/"
xattr -dr com.apple.quarantine "$SERVICES_DIR/$WORKFLOW_NAME" 2>/dev/null || true
echo "  Installed to: $SERVICES_DIR/$WORKFLOW_NAME"

# Refresh Services menu so Finder shows the new Quick Action
echo ""
echo "Refreshing Services menu..."
/System/Library/CoreServices/pbs -flush 2>/dev/null || true

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "To use:"
echo "  1. Right-click any PDF in Finder"
echo "  2. Quick Actions (or Services) → 'Compress PDF to 30MB'"
echo ""
echo "Output is saved as <filename>.compressed.pdf in the same folder."
echo ""
echo "If the Quick Action does not appear:"
echo "  System Settings → Privacy & Security → Extensions → Finder → enable it"
echo "  Or log out and back in."
echo ""
echo "To uninstall: run uninstall.command from this folder."
echo ""
read -p "Press Enter to close..."
