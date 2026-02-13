/**
 * Main-thread runner: creates the compression worker and returns a promise.
 */

import type { CompressionResult, CompressionProgress } from "./types";
import type { WorkerResponse } from "./worker";

export function runCompressionInWorker(
  bytes: Uint8Array,
  targetMb: number,
  onProgress: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === "progress") {
        onProgress(msg.progress);
      } else if (msg.type === "result") {
        const r = msg.result as CompressionResult & {
          outputBytes?: ArrayBuffer | Uint8Array | null;
        };
        const outputBytes =
          r.outputBytes instanceof ArrayBuffer
            ? new Uint8Array(r.outputBytes)
            : r.outputBytes ?? null;
        resolve({
          ...r,
          outputBytes,
        });
        worker.terminate();
      } else if (msg.type === "error") {
        reject(new Error(msg.message));
        worker.terminate();
      }
    };

    worker.onerror = () => {
      reject(new Error("Worker error"));
      worker.terminate();
    };

    worker.postMessage(
      { type: "compress", bytes: bytes.buffer, targetMb },
      [bytes.buffer]
    );
  });
}
