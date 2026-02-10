# PDF Compressor

A cross-platform PDF compression tool with **right-click menu integration** for Windows and macOS. Compresses image-heavy PDFs while **preserving selectable/searchable text** (no page rasterization).

## Features

- **Right-click integration**: Compress PDFs directly from Windows Explorer or macOS Finder
- **Cross-platform**: Works on Windows 10/11 and macOS
- **Text preservation**: Compresses images while keeping text selectable and searchable
- **Target size**: Aims for 30MB by default (configurable)
- **Best effort**: If target can't be reached without destroying text, outputs the smallest achievable size
- **Standalone**: No external dependencies required (self-contained executable)
- **Easy sharing**: Simple installers for both platforms

---

## Quick Start

### Windows

1. **Download** the latest release (`pdf-compressor-windows.zip`)
2. **Extract** and run `install\windows\install-context-menu.ps1`
3. **Right-click** any PDF → select "Compress PDF to 30MB"

### macOS

1. **Download** the latest release (`pdf-compressor-macos.zip`)
2. **Extract** the zip (you get a folder `pdf-compressor-macos`)
3. Open that folder and **double-click** `install.command`
4. If macOS blocks it: right-click `install.command` → **Open** → **Open**
5. **Right-click** any PDF in Finder -> **Open With** -> "PDF Compressor"

---

## Command-Line Usage

The tool can also be used directly from the command line:

```bash
# Basic usage
pdf-compress document.pdf

# Specify target size
pdf-compress document.pdf --target-mb 25

# Specify output path
pdf-compress document.pdf -o smaller.pdf

# Compress multiple files
pdf-compress *.pdf
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `-o, --output` | `<input>.compressed.pdf` | Output file path |
| `-t, --target-mb` | `30` | Target file size in MB |
| `-q, --quiet` | - | Suppress progress output |
| `--version` | - | Show version number |

---

## Building from Source

### Prerequisites

- Python 3.10 or later
- pip

### Windows

```powershell
# Clone or download the repository
cd "PDF Compressor"

# Build the executable
.\scripts\build-windows.ps1

# Install context menu
.\install\windows\install-context-menu.ps1
```

### macOS

Build and install locally:

```bash
# Clone or download the repository
cd "PDF Compressor"

chmod +x scripts/build-macos.sh scripts/package-macos.sh

# Build the executable
./scripts/build-macos.sh

# Install Finder integration (binary + app)
./install/macos/install.command
```

Create a release zip (for sharing with other Mac users):

```bash
./scripts/package-macos.sh
# Output: dist/pdf-compressor-macos.zip
# Zip contains: install.command, uninstall.command, pdf-compress, README
```

**Release verification (on macOS):** Extract the zip, double-click `install.command`, then right-click a PDF in Finder -> Open With -> "PDF Compressor" and confirm `<name>.compressed.pdf` is created. Run `uninstall.command` and confirm "PDF Compressor" is removed from Open With.

### Development (without building)

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\Activate.ps1

# Activate (macOS/Linux)
source .venv/bin/activate

# Install dependencies
pip install pypdf Pillow

# Run directly
python -m pdf_compressor.cli document.pdf
```

---

## How It Works

The compressor uses a multi-step approach to reduce PDF size:

1. **Image Detection**: Identifies all embedded raster images in the PDF
2. **Progressive Compression**: Tries increasingly aggressive compression steps:
   - Light: max 2000px, quality 85
   - Moderate: max 1600px, quality 75
   - Standard: max 1200px, quality 65
   - Aggressive: max 1000px, quality 55
   - Heavy: max 800px, quality 45
   - Extreme: max 600px, quality 35
3. **Target Check**: Stops as soon as file size reaches the target
4. **Best Effort**: If target isn't reached, outputs the smallest achieved size

### What Gets Compressed

- Embedded JPEG, PNG, and other raster images
- Images are resized (if larger than step threshold) and re-encoded as JPEG

### What Stays Intact

- All text content (remains selectable and searchable)
- Vector graphics
- Fonts
- Document structure and metadata

---

## Installation Details

### Windows Context Menu

The installer creates a registry entry at:
```
HKCU\Software\Classes\SystemFileAssociations\.pdf\shell\CompressPDFto30MB
```

This adds "Compress PDF to 30MB" to the right-click menu for all PDF files, regardless of which PDF viewer is set as default.

**Files installed:**
- `%LOCALAPPDATA%\PDF Compressor\pdf-compress.exe`

**To uninstall:**
```powershell
.\install\windows\uninstall-context-menu.ps1
```

### macOS Finder Integration

When you run `install.command` (from the release zip or after building), it installs:
- Binary: `~/Library/Application Support/PDF Compressor/pdf-compress`
- Finder app integration: `~/Applications/PDF Compressor.app`

Compressed files are saved as `<filename>.compressed.pdf` in the same folder as the original.

**To uninstall:** Double-click `uninstall.command` from the same folder you used to install, or run:
```bash
./install/macos/uninstall.command
```

### Troubleshooting

**Windows: Menu item doesn't appear**
- Try signing out and back in
- Or restart Explorer: `taskkill /f /im explorer.exe && start explorer`

**macOS: "PDF Compressor" doesn't appear in Open With**
- Re-run `install.command`
- Restart Finder (or log out and back in)
- Run in Terminal: `/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -kill -r -domain user -domain local -domain system`

**macOS: "Cannot be opened because the developer cannot be verified"**
- Right-click `install.command` → **Open** → **Open** (one-time)
- The installer also clears quarantine on the binary and app bundle
- If a specific file is blocked: `xattr -dr com.apple.quarantine /path/to/file`

---

## Comparison with Original Script

This project includes two compression approaches:

| Feature | `compress-pdf.ps1` (v1) | `pdf-compress` (v2) |
|---------|------------------------|---------------------|
| Dependencies | Ghostscript + qpdf required | None (bundled) |
| Platform | Windows only | Windows + macOS |
| Installation | Manual PATH setup | Right-click menu integration |
| Compression engine | Ghostscript | pypdf + Pillow |
| Sharing | Requires tool installation | Single executable |

The original `compress-pdf.ps1` script using Ghostscript may achieve better compression in some cases but requires external tool installation. The new `pdf-compress` binary is fully self-contained and easier to share.

---

## License

MIT

---

## Credits

Built with:
- [pypdf](https://github.com/py-pdf/pypdf) - PDF manipulation
- [Pillow](https://python-pillow.org/) - Image processing
- [PyInstaller](https://pyinstaller.org/) - Executable bundling
