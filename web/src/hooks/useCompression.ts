"use client";

import { useState, useCallback, useEffect } from "react";
import { runCompressionInWorker } from "@/lib/compress/runWorker";
import { compressPdfRasterized } from "@/lib/compress/rasterize";
import {
  checkServerAvailable,
  compressOnServer,
  type ServerStatus,
} from "@/lib/compress/server";
import type {
  CompressionMode,
  CompressionResult,
  CompressionProgress,
} from "@/lib/compress/types";

export function useCompression() {
  const [file, setFile] = useState<File | null>(null);
  const [targetMb, setTargetMb] = useState(30);
  const [mode, setMode] = useState<CompressionMode>("server");
  const [compressing, setCompressing] = useState(false);
  const [progress, setProgress] = useState<CompressionProgress[]>([]);
  const [result, setResult] = useState<CompressionResult | null>(null);

  // Server availability state
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    available: false,
    ghostscript: null,
    qpdf: null,
  });
  const [serverChecked, setServerChecked] = useState(false);

  // Check server availability on mount
  useEffect(() => {
    let cancelled = false;
    checkServerAvailable().then((status) => {
      if (cancelled) return;
      setServerStatus(status);
      setServerChecked(true);
      // Default to server mode if available, otherwise preserve text
      if (!status.available) {
        setMode("preserveText");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setProgress([]);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setCompressing(true);
    setProgress([]);
    setResult(null);

    const onProgress = (p: CompressionProgress) =>
      setProgress((prev) => [...prev, p]);

    try {
      let res: CompressionResult;

      if (mode === "server") {
        try {
          res = await compressOnServer(file, targetMb, onProgress);
        } catch (serverErr) {
          // Server failed – fall back to client-side
          onProgress({
            message: `Server unavailable (${serverErr instanceof Error ? serverErr.message : "unknown error"}), falling back to browser compression…`,
          });
          const bytes = new Uint8Array(await file.arrayBuffer());
          res = await runCompressionInWorker(bytes, targetMb, onProgress);
        }
      } else if (mode === "highCompression") {
        const bytes = new Uint8Array(await file.arrayBuffer());
        res = await compressPdfRasterized(bytes, targetMb, onProgress);
      } else {
        // preserveText
        const bytes = new Uint8Array(await file.arrayBuffer());
        res = await runCompressionInWorker(bytes, targetMb, onProgress);

        // If preserve-text path cannot reduce size, fall back to raster mode.
        // This sacrifices text selection but avoids a "no-op" compression result.
        // NOTE: we must re-read the file because the worker transfer detaches the buffer.
        if (res.finalSizeBytes >= res.originalSizeBytes) {
          onProgress({
            message:
              "Preserve-text mode could not reduce file size. Trying high-compression raster fallback (text may not remain selectable)...",
          });
          const freshBytes = new Uint8Array(await file.arrayBuffer());
          const rasterRes = await compressPdfRasterized(freshBytes, targetMb, onProgress);
          if (rasterRes.finalSizeBytes < res.finalSizeBytes) {
            res = rasterRes;
          }
        }
      }

      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        outputBytes: null,
        originalSizeBytes: file.size,
        finalSizeBytes: 0,
        targetReached: false,
        stepUsed: "none",
        errorMessage: err instanceof Error ? err.message : "Compression failed",
      });
    } finally {
      setCompressing(false);
    }
  }, [file, targetMb, mode]);

  const handleDownload = useCallback(() => {
    const r = result;
    if (!r?.outputBytes) return;
    const blob = new Blob([r.outputBytes as BlobPart], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file
      ? file.name.replace(/\.pdf$/i, "") + ".compressed.pdf"
      : "compressed.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }, [result, file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResult(null);
    setProgress([]);
  }, []);

  return {
    file,
    targetMb,
    setTargetMb,
    mode,
    setMode,
    compressing,
    progress,
    result,
    serverStatus,
    serverChecked,
    onFileSelect: handleFileSelect,
    onCompress: handleCompress,
    onDownload: handleDownload,
    onReset: handleReset,
  };
}
