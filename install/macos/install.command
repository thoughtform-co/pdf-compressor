#!/bin/bash
#
# PDF Compressor - macOS Installer
#
# Installs:
#   1. The pdf-compress binary to ~/Library/Application Support/PDF Compressor/
#   2. A Quick Action workflow (generated natively) to ~/Library/Services/
#
# Double-click this file to run, or execute from Terminal.
#

set -e

# Get script directory (works when run from Finder or Terminal)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "========================================"
echo "PDF Compressor - macOS Installer"
echo "========================================"
echo ""

# Directories
APP_SUPPORT_DIR="$HOME/Library/Application Support/PDF Compressor"
SERVICES_DIR="$HOME/Library/Services"
WORKFLOW_NAME="Compress PDF to 30MB.workflow"

# --- 1. Find and install the binary ---

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
    echo ""
    echo "Ensure pdf-compress is in the same folder as this installer."
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

chmod +x "$EXE_PATH"
echo "Found executable: $EXE_PATH"

echo ""
echo "Installing binary..."
mkdir -p "$APP_SUPPORT_DIR"
cp "$EXE_PATH" "$APP_SUPPORT_DIR/pdf-compress"
chmod +x "$APP_SUPPORT_DIR/pdf-compress"

echo "Clearing quarantine on binary..."
xattr -dr com.apple.quarantine "$APP_SUPPORT_DIR/pdf-compress" 2>/dev/null || true

echo "Signing binary (ad-hoc)..."
codesign --force --sign - "$APP_SUPPORT_DIR/pdf-compress" 2>/dev/null || true

echo "  Installed to: $APP_SUPPORT_DIR/pdf-compress"

# --- 2. Generate the Quick Action workflow natively ---

echo ""
echo "Creating Quick Action workflow..."

WORKFLOW_DIR="$SERVICES_DIR/$WORKFLOW_NAME"
CONTENTS_DIR="$WORKFLOW_DIR/Contents"

# Remove existing workflow
if [ -d "$WORKFLOW_DIR" ]; then
    rm -rf "$WORKFLOW_DIR"
fi

mkdir -p "$CONTENTS_DIR"

# Generate real UUIDs
UUID1=$(uuidgen)
UUID2=$(uuidgen)
UUID3=$(uuidgen)

# Write Info.plist
cat > "$CONTENTS_DIR/Info.plist" << 'INFOPLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>NSServices</key>
	<array>
		<dict>
			<key>NSMenuItem</key>
			<dict>
				<key>default</key>
				<string>Compress PDF to 30MB</string>
			</dict>
			<key>NSMessage</key>
			<string>runWorkflowAsService</string>
			<key>NSRequiredContext</key>
			<dict/>
			<key>NSSendFileTypes</key>
			<array>
				<string>com.adobe.pdf</string>
			</array>
		</dict>
	</array>
</dict>
</plist>
INFOPLIST

# Write document.wflow with real UUIDs
cat > "$CONTENTS_DIR/document.wflow" << WFLOW
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AMApplicationBuild</key>
	<string>523</string>
	<key>AMApplicationVersion</key>
	<string>2.10</string>
	<key>AMDocumentVersion</key>
	<string>2</string>
	<key>actions</key>
	<array>
		<dict>
			<key>action</key>
			<dict>
				<key>AMAccepts</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Optional</key>
					<false/>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.path</string>
					</array>
				</dict>
				<key>AMActionVersion</key>
				<string>1.0.2</string>
				<key>AMApplication</key>
				<array>
					<string>Automator</string>
				</array>
				<key>AMBundleIdentifier</key>
				<string>com.apple.Automator.RunShellScript</string>
				<key>AMCategory</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>AMComment</key>
				<string></string>
				<key>AMDescription</key>
				<dict>
					<key>AMDInput</key>
					<string>The input to the shell script.</string>
					<key>AMDName</key>
					<string>Run Shell Script</string>
					<key>AMDSummary</key>
					<string>Runs a shell script with input as arguments.</string>
				</dict>
				<key>AMIconName</key>
				<string>TerminalAction</string>
				<key>AMName</key>
				<string>Run Shell Script</string>
				<key>AMProvides</key>
				<dict>
					<key>Container</key>
					<string>List</string>
					<key>Types</key>
					<array>
						<string>com.apple.cocoa.path</string>
					</array>
				</dict>
				<key>AMRequiredResources</key>
				<array/>
				<key>ActionBundlePath</key>
				<string>/System/Library/Automator/Run Shell Script.action</string>
				<key>ActionName</key>
				<string>Run Shell Script</string>
				<key>ActionParameters</key>
				<dict>
					<key>COMMAND_STRING</key>
					<string>#!/bin/bash
TARGET_MB=30
COMPRESSOR="\$HOME/Library/Application Support/PDF Compressor/pdf-compress"

if [ ! -x "\$COMPRESSOR" ]; then
    osascript -e 'display notification "PDF Compressor not installed. Run install.command first." with title "PDF Compressor"'
    exit 1
fi

for pdf in "\$@"; do
    if [ -f "\$pdf" ]; then
        filename=\$(basename "\$pdf")
        osascript -e "display notification \"Compressing: \$filename\" with title \"PDF Compressor\""
        if "\$COMPRESSOR" "\$pdf" --target-mb "\$TARGET_MB"; then
            osascript -e "display notification \"Done: \$filename\" with title \"PDF Compressor\""
        else
            osascript -e "display notification \"Failed: \$filename\" with title \"PDF Compressor\""
        fi
    fi
done</string>
					<key>CheckedForUserDefaultShell</key>
					<true/>
					<key>inputMethod</key>
					<integer>1</integer>
					<key>shell</key>
					<string>/bin/bash</string>
					<key>source</key>
					<string></string>
				</dict>
				<key>BundleIdentifier</key>
				<string>com.apple.Automator.RunShellScript</string>
				<key>CFBundleVersion</key>
				<string>1.0.2</string>
				<key>CanShowSelectedItemsWhenRun</key>
				<false/>
				<key>CanShowWhenRun</key>
				<true/>
				<key>Category</key>
				<array>
					<string>AMCategoryUtilities</string>
				</array>
				<key>Class Name</key>
				<string>RunShellScriptAction</string>
				<key>InputUUID</key>
				<string>${UUID1}</string>
				<key>Keywords</key>
				<array>
					<string>Shell</string>
					<string>Script</string>
					<string>Run</string>
				</array>
				<key>OutputUUID</key>
				<string>${UUID2}</string>
				<key>UUID</key>
				<string>${UUID3}</string>
				<key>UnlocalizedApplications</key>
				<array>
					<string>Automator</string>
				</array>
				<key>arguments</key>
				<dict>
					<key>0</key>
					<dict>
						<key>default value</key>
						<integer>0</integer>
						<key>name</key>
						<string>inputMethod</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>0</string>
					</dict>
					<key>1</key>
					<dict>
						<key>default value</key>
						<string></string>
						<key>name</key>
						<string>source</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>1</string>
					</dict>
					<key>2</key>
					<dict>
						<key>default value</key>
						<false/>
						<key>name</key>
						<string>CheckedForUserDefaultShell</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>2</string>
					</dict>
					<key>3</key>
					<dict>
						<key>default value</key>
						<string></string>
						<key>name</key>
						<string>COMMAND_STRING</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>3</string>
					</dict>
					<key>4</key>
					<dict>
						<key>default value</key>
						<string>/bin/sh</string>
						<key>name</key>
						<string>shell</string>
						<key>required</key>
						<string>0</string>
						<key>type</key>
						<string>0</string>
						<key>uuid</key>
						<string>4</string>
					</dict>
				</dict>
				<key>isViewVisible</key>
				<integer>1</integer>
				<key>location</key>
				<string>449.000000:305.000000</string>
				<key>nibPath</key>
				<string>/System/Library/Automator/Run Shell Script.action/Contents/Resources/Base.lproj/main.nib</string>
			</dict>
			<key>isViewVisible</key>
			<integer>1</integer>
		</dict>
	</array>
	<key>connectors</key>
	<dict/>
	<key>workflowMetaData</key>
	<dict>
		<key>inputTypeIdentifier</key>
		<string>com.adobe.pdf</string>
		<key>outputTypeIdentifier</key>
		<string>com.apple.cocoa.path</string>
		<key>presentationMode</key>
		<integer>11</integer>
		<key>processesInput</key>
		<integer>0</integer>
		<key>serviceInputTypeIdentifier</key>
		<string>com.adobe.pdf</string>
		<key>serviceOutputTypeIdentifier</key>
		<string>com.apple.cocoa.path</string>
		<key>serviceProcessesInput</key>
		<integer>0</integer>
		<key>workflowTypeIdentifier</key>
		<string>com.apple.Automator.servicesMenu</string>
	</dict>
</dict>
</plist>
WFLOW

# Convert plists to binary format (what macOS natively expects)
echo "Converting plists to binary format..."
plutil -convert binary1 "$CONTENTS_DIR/Info.plist"
plutil -convert binary1 "$CONTENTS_DIR/document.wflow"

# Validate
echo "Validating workflow..."
if plutil -lint "$CONTENTS_DIR/Info.plist" > /dev/null 2>&1 && \
   plutil -lint "$CONTENTS_DIR/document.wflow" > /dev/null 2>&1; then
    echo "  Workflow is valid."
else
    echo "  Warning: Workflow validation failed."
fi

xattr -dr com.apple.quarantine "$WORKFLOW_DIR" 2>/dev/null || true
echo "  Installed to: $WORKFLOW_DIR"

# --- 3. Refresh and finish ---

echo ""
echo "Refreshing Services menu..."
/System/Library/CoreServices/pbs -flush 2>/dev/null || true

# Brief pause so pbs can re-index
sleep 1

echo ""
echo "========================================"
echo "Installation complete!"
echo "========================================"
echo ""
echo "To use:"
echo "  1. Right-click any PDF in Finder"
echo "  2. Quick Actions -> 'Compress PDF to 30MB'"
echo ""
echo "Output is saved as <filename>.compressed.pdf in the same folder."
echo ""
echo "If the Quick Action does not appear:"
echo "  - System Settings -> Privacy & Security -> Extensions -> Finder"
echo "  - Or log out and back in"
echo ""
echo "To uninstall: run uninstall.command from this folder."
echo ""
read -p "Press Enter to close..."
