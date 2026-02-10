# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for PDF Compressor.

Build commands:
  Windows: pyinstaller scripts/pdf-compress.spec
  macOS:   pyinstaller scripts/pdf-compress.spec
"""

import sys
from pathlib import Path

# Determine platform-specific settings
is_windows = sys.platform == 'win32'
is_macos = sys.platform == 'darwin'

# Get the project root (parent of scripts/)
spec_dir = Path(SPECPATH)
project_root = spec_dir.parent

# Analysis
a = Analysis(
    [str(project_root / 'src' / 'pdf_compressor' / '__main__.py')],
    pathex=[str(project_root / 'src')],
    binaries=[],
    datas=[
        # Include the pdf_compressor package
        (str(project_root / 'src' / 'pdf_compressor'), 'pdf_compressor'),
    ],
    hiddenimports=[
        'PIL',
        'PIL.Image',
        'PIL.JpegImagePlugin',
        'PIL.PngImagePlugin',
        'PIL.GifImagePlugin',
        'PIL.TiffImagePlugin',
        'PIL.BmpImagePlugin',
        'pypdf',
        'pypdf._page',
        'pypdf._reader',
        'pypdf._writer',
        'pypdf.generic',
        'pdf_compressor',
        'pdf_compressor.compress',
        'compress',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter',
        'matplotlib',
        'numpy',
        'scipy',
        'pandas',
        'pytest',
        'IPython',
        'jupyter',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# Platform-specific executable settings
if is_windows:
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.zipfiles,
        a.datas,
        [],
        name='pdf-compress',
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        upx_exclude=[],
        runtime_tmpdir=None,
        console=True,  # Console app for Windows
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,
        codesign_identity=None,
        entitlements_file=None,
        icon=None,  # Can add .ico file here
    )
elif is_macos:
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.zipfiles,
        a.datas,
        [],
        name='pdf-compress',
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=False,  # UPX can cause issues on macOS
        upx_exclude=[],
        runtime_tmpdir=None,
        console=True,
        disable_windowed_traceback=False,
        argv_emulation=False,
        target_arch=None,  # Build for native arch (arm64 on Apple Silicon runners)
        codesign_identity=None,  # Ad-hoc signing by default
        entitlements_file=None,
    )
else:
    # Linux or other
    exe = EXE(
        pyz,
        a.scripts,
        a.binaries,
        a.zipfiles,
        a.datas,
        [],
        name='pdf-compress',
        debug=False,
        bootloader_ignore_signals=False,
        strip=False,
        upx=True,
        runtime_tmpdir=None,
        console=True,
    )
