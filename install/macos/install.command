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
APP_EXE="$APP_BUNDLE/Contents/MacOS/PDF Compressor"
APP_PLIST="$APP_BUNDLE/Contents/Info.plist"
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
mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"

cat > "$APP_PLIST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>PDF Compressor</string>
  <key>CFBundleDisplayName</key>
  <string>PDF Compressor</string>
  <key>CFBundleIdentifier</key>
  <string>co.thoughtform.pdfcompressor</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0</string>
  <key>CFBundleExecutable</key>
  <string>PDF Compressor</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>CFBundleDocumentTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeName</key>
      <string>PDF Document</string>
      <key>CFBundleTypeRole</key>
      <string>Viewer</string>
      <key>LSHandlerRank</key>
      <string>Alternate</string>
      <key>LSItemContentTypes</key>
      <array>
        <string>com.adobe.pdf</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
PLIST

cat > "$APP_EXE" <<'LAUNCHER'
#!/bin/bash
TARGET_MB=30
COMPRESSOR="$HOME/Library/Application Support/PDF Compressor/pdf-compress"

if [ ! -x "$COMPRESSOR" ]; then
  osascript -e 'display alert "PDF Compressor not installed correctly" message "Run install.command again."'
  exit 1
fi

if [ "$#" -eq 0 ]; then
  osascript -e 'display notification "No PDF selected." with title "PDF Compressor"'
  exit 0
fi

for pdf in "$@"; do
  if [ -f "$pdf" ]; then
    filename=$(basename "$pdf")
    if "$COMPRESSOR" "$pdf" --target-mb "$TARGET_MB"; then
      osascript -e "display notification \"Done: $filename\" with title \"PDF Compressor\""
    else
      osascript -e "display notification \"Failed: $filename\" with title \"PDF Compressor\""
    fi
  fi
done
LAUNCHER

chmod +x "$APP_EXE"
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
