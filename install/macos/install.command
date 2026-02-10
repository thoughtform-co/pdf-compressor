#!/bin/bash
#
# PDF Compressor - macOS Installer
#
# Installs:
#   1) Binary to ~/Library/Application Support/PDF Compressor/pdf-compress
#   2) Finder app integration to ~/Applications/PDF Compressor.app
#
# This provides right-click usage via Finder: Open With -> PDF Compressor
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_SUPPORT_DIR="$HOME/Library/Application Support/PDF Compressor"
APP_DIR="$HOME/Applications"
APP_BUNDLE="$APP_DIR/PDF Compressor.app"
INSTALLED_BIN="$APP_SUPPORT_DIR/pdf-compress"

echo ""
echo "========================================"
echo "PDF Compressor - macOS Installer"
echo "========================================"
echo ""

EXE_PATH=""
SEARCH_PATHS=(
    "$SCRIPT_DIR/pdf-compress"
    "$SCRIPT_DIR/../dist/pdf-compress"
    "$SCRIPT_DIR/../../dist/pdf-compress"
)

for path in "${SEARCH_PATHS[@]}"; do
    if [ -f "$path" ]; then
        EXE_PATH="$path"
        break
    fi
done

if [ -z "$EXE_PATH" ]; then
    echo "Error: pdf-compress executable not found."
    echo "Put pdf-compress in the same folder as install.command."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

echo "Found executable: $EXE_PATH"
echo ""
echo "Installing binary..."
mkdir -p "$APP_SUPPORT_DIR"
cp "$EXE_PATH" "$INSTALLED_BIN"
chmod +x "$INSTALLED_BIN"
xattr -dr com.apple.quarantine "$INSTALLED_BIN" 2>/dev/null || true
codesign --force --sign - "$INSTALLED_BIN" 2>/dev/null || true
echo "  Installed: $INSTALLED_BIN"

echo ""
echo "Installing Finder app integration..."
TMP_APPLESCRIPT="$(mktemp -t pdf-compressor-XXXXXX.applescript)"
cat > "$TMP_APPLESCRIPT" <<'APPLESCRIPT'
on run
    display notification "Use Open With on a PDF file." with title "PDF Compressor"
end run

on open droppedItems
    set compressorPath to POSIX path of (path to home folder) & "Library/Application Support/PDF Compressor/pdf-compress"

    try
        do shell script "test -x " & quoted form of compressorPath
    on error
        display alert "PDF Compressor not installed correctly" message "Run install.command again."
        return
    end try

    repeat with droppedItem in droppedItems
        set pdfPath to POSIX path of droppedItem
        try
            set fileName to do shell script "basename " & quoted form of pdfPath
        on error
            set fileName to "PDF"
        end try

        try
            do shell script quoted form of compressorPath & " " & quoted form of pdfPath & " --target-mb 30"
            display notification "Done: " & fileName with title "PDF Compressor"
        on error
            display notification "Failed: " & fileName with title "PDF Compressor"
        end try
    end repeat
end open
APPLESCRIPT

rm -rf "$APP_BUNDLE"
osacompile -o "$APP_BUNDLE" "$TMP_APPLESCRIPT"
rm -f "$TMP_APPLESCRIPT"

APP_PLIST="$APP_BUNDLE/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Delete :CFBundleDocumentTypes" "$APP_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Delete :CFBundleIdentifier" "$APP_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Delete :CFBundleDisplayName" "$APP_PLIST" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Delete :LSUIElement" "$APP_PLIST" 2>/dev/null || true

/usr/libexec/PlistBuddy -c "Add :CFBundleIdentifier string co.thoughtform.pdfcompressor" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDisplayName string PDF Compressor" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :LSUIElement bool true" "$APP_PLIST"

/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes array" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes:0 dict" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes:0:CFBundleTypeName string PDF Document" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes:0:CFBundleTypeRole string Viewer" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes:0:LSHandlerRank string Alternate" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes array" "$APP_PLIST"
/usr/libexec/PlistBuddy -c "Add :CFBundleDocumentTypes:0:LSItemContentTypes:0 string com.adobe.pdf" "$APP_PLIST"

xattr -dr com.apple.quarantine "$APP_BUNDLE" 2>/dev/null || true
codesign --force --sign - "$APP_BUNDLE" 2>/dev/null || true
echo "  Installed: $APP_BUNDLE"

# Remove older workflow install to avoid "service misconfigured" errors.
rm -rf "$HOME/Library/Services/Compress PDF to 30MB.workflow" 2>/dev/null || true

echo ""
echo "Refreshing Finder registrations..."
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$APP_BUNDLE" 2>/dev/null || true
/System/Library/CoreServices/pbs -flush 2>/dev/null || true
killall Finder 2>/dev/null || true

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "Use in Finder:"
echo "  Right-click a PDF -> Open With -> PDF Compressor"
echo ""
echo "Output is saved as <filename>.compressed.pdf in the same folder."
echo ""
echo "To uninstall, run uninstall.command."
echo ""
read -p "Press Enter to close..."
