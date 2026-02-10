#!/bin/bash
#
# PDF Compressor - macOS Uninstaller
#
# Removes:
#   1. The pdf-compress binary from ~/Library/Application Support/PDF Compressor/
#   2. The Quick Action workflow from ~/Library/Services/
#
# Double-click this file to run, or execute from Terminal.
#

set -e

echo ""
echo "========================================"
echo "PDF Compressor - macOS Uninstaller"
echo "========================================"
echo ""

APP_SUPPORT_DIR="$HOME/Library/Application Support/PDF Compressor"
SERVICES_DIR="$HOME/Library/Services"
WORKFLOW_NAME="Compress PDF to 30MB.workflow"
APP_BUNDLE="$HOME/Applications/PDF Compressor.app"

removed=0

if [ -d "$APP_SUPPORT_DIR" ]; then
    echo "Removing binary..."
    rm -rf "$APP_SUPPORT_DIR"
    echo "  Removed: $APP_SUPPORT_DIR"
    removed=$((removed + 1))
else
    echo "Binary not found (already removed)."
fi

WORKFLOW_PATH="$SERVICES_DIR/$WORKFLOW_NAME"
if [ -d "$WORKFLOW_PATH" ]; then
    echo "Removing Quick Action..."
    rm -rf "$WORKFLOW_PATH"
    echo "  Removed: $WORKFLOW_PATH"
    removed=$((removed + 1))
else
    echo "Quick Action not found (already removed)."
fi

if [ -d "$APP_BUNDLE" ]; then
    echo "Removing Finder app integration..."
    rm -rf "$APP_BUNDLE"
    echo "  Removed: $APP_BUNDLE"
    removed=$((removed + 1))
else
    echo "Finder app integration not found (already removed)."
fi

echo ""
echo "Refreshing Services menu..."
/System/Library/CoreServices/pbs -flush 2>/dev/null || true
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain user -domain local -domain system 2>/dev/null || true
killall Finder 2>/dev/null || true

echo ""
echo "========================================"
echo "Uninstallation complete!"
echo "========================================"
echo ""
if [ "$removed" -eq 0 ]; then
    echo "Nothing was installed; no files were removed."
fi
echo ""
read -p "Press Enter to close..."
