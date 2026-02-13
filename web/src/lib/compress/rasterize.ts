/**
 * High-compression mode: rasterize each page, then rebuild the PDF.
 * Tradeoff: strongest size reduction, but text is no longer selectable.
 */

import { PDFDocument } from "pdf-lib";
import type { CompressionProgress, CompressionResult, ProgressCallback } from "./types";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore pdfjs-dist v5 ships .mjs only; bare path may fail on some resolvers
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

interface RasterStep {
  name: string;
  scale: number;
  quality: number;
}

const RASTER_LADDER: RasterStep[] = [
  { name: "raster-light", scale: 1.5, quality: 0.82 },
  { name: "raster-medium", scale: 1.2, quality: 0.68 },
  { name: "raster-heavy", scale: 1.0, quality: 0.55 },
  { name: "raster-extreme", scale: 0.8, quality: 0.45 },
];

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function estimateStartingStep(originalSize: number, targetSize: number): number {
  if (targetSize >= originalSize) return 0;
  const ratioNeeded = originalSize / targetSize;
  if (ratioNeeded < 2) return 0;
  if (ratioNeeded < 4) return 1;
  if (ratioNeeded < 8) return 2;
  return 3;
}

function toUint8(input: ArrayBuffer | Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

async function rasterizeSinglePass(
  inputBytes: Uint8Array,
  step: RasterStep,
  onProgress: ProgressCallback
): Promise<Uint8Array> {
  // Use main-thread parsing/rendering to avoid runtime failures when the CDN worker
  // cannot be fetched (offline/corporate network/CSP environments).
  const loadingTask = pdfjs.getDocument({
    data: inputBytes,
    // pdfjs-dist runtime supports this flag, but the bundled type definition
    // for this import path does not expose it.
    disableWorker: true,
  } as unknown as Parameters<typeof pdfjs.getDocument>[0]);
  const sourcePdf = await loadingTask.promise;
  const outPdf = await PDFDocument.create();

  try {
    for (let pageNum = 1; pageNum <= sourcePdf.numPages; pageNum++) {
      const page = await sourcePdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: step.scale });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) throw new Error("Could not create canvas context");

      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      await page.render({
        canvasContext: ctx,
        viewport,
        canvas,
      }).promise;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (value) => (value ? resolve(value) : reject(new Error("Canvas export failed"))),
          "image/jpeg",
          step.quality
        );
      });
      const jpgBytes = new Uint8Array(await blob.arrayBuffer());
      const image = await outPdf.embedJpg(jpgBytes);

      // PDF page size uses points (1/72 inch). Source PDF page.view is [x1, y1, x2, y2].
      const widthPts = page.view[2] - page.view[0];
      const heightPts = page.view[3] - page.view[1];
      const outPage = outPdf.addPage([widthPts, heightPts]);
      outPage.drawImage(image, { x: 0, y: 0, width: widthPts, height: heightPts });

      onProgress({
        message: `Rasterized page ${pageNum}/${sourcePdf.numPages} (${step.name})`,
        step: step.name,
      });
    }
  } finally {
    await sourcePdf.cleanup();
    await sourcePdf.destroy();
  }

  return outPdf.save({ useObjectStreams: true });
}

export async function compressPdfRasterized(
  inputBytes: Uint8Array,
  targetMb: number,
  onProgress: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const targetBytes = Math.floor(targetMb * 1024 * 1024);
  const originalSize = inputBytes.length;

  onProgress({
    message: `Original size: ${formatMb(originalSize)} MB, target: ${targetMb} MB`,
  });

  if (originalSize <= targetBytes) {
    return {
      success: true,
      outputBytes: inputBytes,
      originalSizeBytes: originalSize,
      finalSizeBytes: originalSize,
      targetReached: true,
      stepUsed: "none (already under target)",
    };
  }

  const startIndex = estimateStartingStep(originalSize, targetBytes);
  let bestSize = originalSize;
  let bestBytes: Uint8Array = inputBytes;
  let bestStepName = "none";

  for (let i = startIndex; i < RASTER_LADDER.length; i++) {
    const step = RASTER_LADDER[i];
    onProgress({
      message: `Trying ${step.name} (scale ${step.scale}, quality ${step.quality})...`,
      step: step.name,
    });

    try {
      const outBytes = toUint8(await rasterizeSinglePass(inputBytes, step, onProgress));
      const size = outBytes.length;
      onProgress({ message: `  -> ${formatMb(size)} MB`, sizeMb: size / (1024 * 1024) });

      if (size < bestSize) {
        bestSize = size;
        bestBytes = outBytes;
        bestStepName = step.name;
      }

      if (size <= targetBytes) {
        onProgress({ message: "Target reached!" });
        return {
          success: true,
          outputBytes: outBytes,
          originalSizeBytes: originalSize,
          finalSizeBytes: size,
          targetReached: true,
          stepUsed: step.name,
        };
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      onProgress({ message: `  -> Step failed: ${err}` });
    }
  }

  onProgress({
    message: `Target not reached. Best result: ${formatMb(bestSize)} MB (step: ${bestStepName})`,
  });
  return {
    success: true,
    outputBytes: bestBytes,
    originalSizeBytes: originalSize,
    finalSizeBytes: bestSize,
    targetReached: false,
    stepUsed: bestStepName,
  };
}
