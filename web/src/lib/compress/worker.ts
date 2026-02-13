/**
 * Web Worker wrapper for PDF compression. Keeps the main thread responsive.
 */

import { compressPdf } from "./engine";
import type { CompressionResult, CompressionProgress } from "./types";

export type WorkerRequest =
  | { type: "compress"; bytes: ArrayBuffer; targetMb: number }
  | { type: "cancel" };

export type WorkerResponse =
  | { type: "progress"; progress: CompressionProgress }
  | { type: "result"; result: CompressionResult }
  | { type: "error"; message: string };

let cancelled = false;

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;
  if (msg.type === "cancel") {
    cancelled = true;
    return;
  }
  if (msg.type !== "compress") return;

  cancelled = false;
  const bytes = new Uint8Array(msg.bytes);
  const targetMb = msg.targetMb;

  try {
    const result = await compressPdf(bytes, targetMb, (progress) => {
      if (cancelled) return;
      self.postMessage({ type: "progress", progress } satisfies WorkerResponse);
    });

    if (cancelled) return;

    const outputBuffer = (result.outputBytes?.buffer ?? null) as ArrayBuffer | null;
    const resultForTransfer: Omit<CompressionResult, "outputBytes"> & {
      outputBytes: ArrayBuffer | null;
    } = {
      ...result,
      outputBytes: outputBuffer,
    };
    const response: WorkerResponse = {
      type: "result",
      result: resultForTransfer as unknown as CompressionResult,
    };
    if (outputBuffer) {
      self.postMessage(response, { transfer: [outputBuffer] });
    } else {
      self.postMessage(response);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ type: "error", message } satisfies WorkerResponse);
  }
};
