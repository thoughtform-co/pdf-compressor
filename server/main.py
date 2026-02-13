"""
FastAPI compression server.

Wraps the existing compress.py module to expose PDF compression via HTTP.
Uses Ghostscript + qpdf when available (same as the desktop tool).

Run locally:
    cd server
    pip install -r requirements.txt
    uvicorn main:app --port 8080 --reload
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from queue import Empty, Queue

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse

# ---------------------------------------------------------------------------
# Make the src/ package importable so we can reuse compress.py directly.
# ---------------------------------------------------------------------------
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_PROJECT_ROOT / "src"))

from pdf_compressor.compress import (  # noqa: E402
    _find_ghostscript,
    _find_qpdf,
    compress_pdf,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(title="PDF Compressor API")

_cors_origins = os.environ.get("ALLOWED_ORIGINS", "*").strip()
allow_origins = ["*"] if _cors_origins == "*" else [o.strip() for o in _cors_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "X-Original-Size",
        "X-Final-Size",
        "X-Target-Reached",
        "X-Step-Used",
    ],
)

_executor = ThreadPoolExecutor(max_workers=2)

# In-memory registry of completed downloads (fine for local / single-instance).
_downloads: dict[str, Path] = {}

# Max upload size: 500 MB
MAX_UPLOAD_BYTES = 500 * 1024 * 1024


# ---------------------------------------------------------------------------
# Health endpoint – reports which tools are available
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    gs = _find_ghostscript()
    qpdf = _find_qpdf()
    return {
        "status": "ok",
        "ghostscript": str(gs) if gs else None,
        "qpdf": str(qpdf) if qpdf else None,
    }


# ---------------------------------------------------------------------------
# Compress endpoint – streams progress via SSE, stores result for download
# ---------------------------------------------------------------------------
@app.post("/compress")
async def compress_endpoint(
    file: UploadFile = File(...),
    target_mb: float = Form(30),
):
    content = await file.read()

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 500 MB)")

    # Write upload to a temp directory
    tmp_dir = tempfile.mkdtemp(prefix="pdfcompress_")
    input_path = Path(tmp_dir) / "input.pdf"
    input_path.write_bytes(content)
    output_path = Path(tmp_dir) / "compressed.pdf"

    job_id = str(uuid.uuid4())
    progress_queue: Queue[str] = Queue()

    def on_progress(msg: str) -> None:
        progress_queue.put(msg)

    def run() -> object:
        return compress_pdf(input_path, output_path, target_mb, on_progress)

    async def generate():  # type: ignore[return]
        loop = asyncio.get_event_loop()
        future = loop.run_in_executor(_executor, run)

        # Stream progress while compression runs
        while not future.done():
            await asyncio.sleep(0.15)
            while True:
                try:
                    msg = progress_queue.get_nowait()
                    yield f"data: {json.dumps({'type': 'progress', 'message': msg})}\n\n"
                except Empty:
                    break

        # Drain any remaining progress messages
        while True:
            try:
                msg = progress_queue.get_nowait()
                yield f"data: {json.dumps({'type': 'progress', 'message': msg})}\n\n"
            except Empty:
                break

        result = future.result()

        download_url = None
        if result.success and result.output_path and result.output_path.exists():
            _downloads[job_id] = result.output_path
            download_url = f"/download/{job_id}"

        yield (
            f"data: {json.dumps({
                'type': 'done',
                'success': result.success,
                'originalSize': result.original_size_bytes,
                'finalSize': result.final_size_bytes,
                'targetReached': result.target_reached,
                'stepUsed': result.step_used,
                'downloadUrl': download_url,
                'error': result.error_message,
            })}\n\n"
        )

        # Cleanup the input file (keep the compressed output for download)
        input_path.unlink(missing_ok=True)

    return StreamingResponse(generate(), media_type="text/event-stream")


# ---------------------------------------------------------------------------
# Download endpoint – serves the compressed PDF
# ---------------------------------------------------------------------------
@app.get("/download/{job_id}")
async def download(job_id: str):
    path = _downloads.get(job_id)
    if not path or not path.exists():
        raise HTTPException(404, "Job not found or expired")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename="compressed.pdf",
    )
