/**
 * Server-side compression client.
 *
 * Calls the FastAPI compression server which uses Ghostscript + qpdf
 * (same engine as the desktop tool). Falls back gracefully if the server
 * is unreachable.
 */

import type { CompressionResult, ProgressCallback } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_COMPRESS_API_URL || "http://localhost:8080";

// ── Health check ────────────────────────────────────────────────────────

export interface ServerStatus {
  available: boolean;
  ghostscript: string | null;
  qpdf: string | null;
}

export async function checkServerAvailable(): Promise<ServerStatus> {
  try {
    const res = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { available: false, ghostscript: null, qpdf: null };
    const data = await res.json();
    return {
      available: true,
      ghostscript: data.ghostscript ?? null,
      qpdf: data.qpdf ?? null,
    };
  } catch {
    return { available: false, ghostscript: null, qpdf: null };
  }
}

// ── Compress via server (SSE streaming) ─────────────────────────────────

export async function compressOnServer(
  file: File,
  targetMb: number,
  onProgress: ProgressCallback
): Promise<CompressionResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("target_mb", targetMb.toString());

  onProgress({ message: "Uploading to compression server…" });

  const res = await fetch(`${API_URL}/compress`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Server error: ${res.status}`);
  }

  // Read SSE stream
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  interface DonePayload {
    type: "done";
    success: boolean;
    originalSize: number;
    finalSize: number;
    targetReached: boolean;
    stepUsed: string;
    downloadUrl: string | null;
    error: string | null;
  }

  let donePayload: DonePayload | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === "progress") {
          onProgress({ message: data.message });
        } else if (data.type === "done") {
          donePayload = data as DonePayload;
        }
      } catch {
        // ignore malformed SSE lines
      }
    }
  }

  if (!donePayload) {
    throw new Error("No result received from compression server");
  }

  if (!donePayload.success || !donePayload.downloadUrl) {
    return {
      success: false,
      outputBytes: null,
      originalSizeBytes: donePayload.originalSize,
      finalSizeBytes: 0,
      targetReached: false,
      stepUsed: "none",
      errorMessage: donePayload.error || "Server compression failed",
    };
  }

  // Download the compressed file
  onProgress({ message: "Downloading compressed file…" });
  const dlRes = await fetch(`${API_URL}${donePayload.downloadUrl}`);
  if (!dlRes.ok) throw new Error("Failed to download compressed file");
  const outputBytes = new Uint8Array(await dlRes.arrayBuffer());

  return {
    success: true,
    outputBytes,
    originalSizeBytes: donePayload.originalSize,
    finalSizeBytes: donePayload.finalSize,
    targetReached: donePayload.targetReached,
    stepUsed: donePayload.stepUsed,
  };
}
