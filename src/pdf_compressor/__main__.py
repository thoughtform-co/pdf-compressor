"""
Entry point for PDF Compressor when run as a module or bundled executable.
"""

import sys
from pathlib import Path

# When running as PyInstaller bundle, add the extraction dir to path
if getattr(sys, 'frozen', False):
    # Running in PyInstaller bundle
    bundle_dir = Path(sys._MEIPASS)
    if str(bundle_dir) not in sys.path:
        sys.path.insert(0, str(bundle_dir))

from pdf_compressor.cli import main

if __name__ == "__main__":
    sys.exit(main())
