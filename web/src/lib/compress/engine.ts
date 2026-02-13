/**
 * Client-side PDF compression engine.
 * Port of the pypdf fallback path from compress.py: extract images, resize/recompress via Canvas, replace in PDF.
 */

import {
  PDFDocument,
  PDFName,
  PDFRef,
  PDFDict,
  PDFRawStream,
  PDFPageLeaf,
} from "pdf-lib";
import type { CompressionStep, CompressionResult, ProgressCallback } from "./types";

export const COMPRESSION_LADDER: CompressionStep[] = [
  { name: "light", maxDimension: 2000, quality: 0.85 },
  { name: "moderate", maxDimension: 1600, quality: 0.75 },
  { name: "standard", maxDimension: 1200, quality: 0.65 },
  { name: "aggressive", maxDimension: 1000, quality: 0.55 },
  { name: "heavy", maxDimension: 800, quality: 0.45 },
  { name: "extreme", maxDimension: 600, quality: 0.35 },
];

const NAME_RESOURCES = PDFName.of("Resources");
const NAME_XOBJECT = PDFName.of("XObject");
const NAME_SUBTYPE = PDFName.of("Subtype");
const NAME_IMAGE = PDFName.of("Image");
const NAME_FILTER = PDFName.of("Filter");
const NAME_DCTDECODE = PDFName.of("DCTDecode");

function formatMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function estimateStartingStep(originalSize: number, targetSize: number): number {
  if (targetSize >= originalSize) return 0;
  const ratioNeeded = originalSize / targetSize;
  if (ratioNeeded < 1.5) return 0;
  if (ratioNeeded < 2) return 1;
  if (ratioNeeded < 3) return 2;
  if (ratioNeeded < 4) return 3;
  if (ratioNeeded < 5) return 4;
  return 5;
}

/** Decode image bytes (JPEG only for now) to ImageBitmap. */
async function decodeImageToBitmap(
  bytes: Uint8Array,
  filter: string | undefined
): Promise<ImageBitmap | null> {
  if (filter === "DCTDecode" || filter === "/DCTDecode") {
    const blob = new Blob([bytes as BlobPart], { type: "image/jpeg" });
    return createImageBitmap(blob);
  }
  return null;
}

/** Resize image to fit within maxDimension, preserve aspect ratio. */
function resizeImage(
  bitmap: ImageBitmap,
  maxDimension: number
): { width: number; height: number } {
  const { width, height } = bitmap;
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const scale = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

/** Draw bitmap to canvas, resize, and export as JPEG blob. */
async function recompressAsJpeg(
  bitmap: ImageBitmap,
  maxDimension: number,
  quality: number
): Promise<Uint8Array> {
  const { width, height } = resizeImage(bitmap, maxDimension);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas 2d context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await canvas.convertToBlob({
    type: "image/jpeg",
    quality,
  });
  if (!blob) throw new Error("convertToBlob failed");
  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
}

/** Process a single PDF with one compression step; returns output size. */
async function compressPdfSinglePass(
  doc: PDFDocument,
  step: CompressionStep,
  onProgress: ProgressCallback
): Promise<Uint8Array> {
  const pages = doc.getPages();
  let processed = 0;
  let replaced = 0;
  let skippedLarger = 0;
  const replacementCache = new Map<string, PDFRef | null>();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const leaf = page.node as PDFPageLeaf;
    const resources = leaf.Resources();
    if (!resources) continue;

    const xoRef = resources.get(NAME_XOBJECT);
    if (!xoRef) continue;

    const xoDict = doc.context.lookup(xoRef) as PDFDict | undefined;
    if (!xoDict || !(xoDict instanceof PDFDict)) continue;

    const entries = xoDict.entries();
    for (const [name, refObj] of entries) {
      if (!(refObj instanceof PDFRef)) continue;

      const cacheKey = refObj.toString();
      if (replacementCache.has(cacheKey)) {
        const cachedRef = replacementCache.get(cacheKey);
        if (cachedRef) {
          leaf.setXObject(name, cachedRef);
        }
        continue;
      }

      const obj = doc.context.lookup(refObj);
      if (!obj || !(obj instanceof PDFRawStream)) continue;

      const subtype = obj.dict.get(NAME_SUBTYPE);
      const subtypeStr = subtype?.toString?.() ?? "";
      if (subtypeStr !== "/Image") continue;

      const filterObj = obj.dict.get(NAME_FILTER);
      let filterStr: string | undefined;
      if (filterObj) {
        const str = filterObj.toString?.();
        filterStr = str?.startsWith("/") ? str.slice(1) : str;
      }

      try {
        const contents = obj.getContents();
        const bitmap = await decodeImageToBitmap(contents, filterStr);
        if (!bitmap) continue;

        const jpegBytes = await recompressAsJpeg(
          bitmap,
          step.maxDimension,
          step.quality
        );
        bitmap.close();

        // Keep original image when recompression is not actually smaller.
        if (jpegBytes.length >= contents.length) {
          skippedLarger++;
          replacementCache.set(cacheKey, null);
          continue;
        }

        const newImage = await doc.embedJpg(jpegBytes);
        leaf.setXObject(name, newImage.ref);
        replacementCache.set(cacheKey, newImage.ref);
        processed++;
        replaced++;
      } catch {
        // Skip images that can't be processed
      }
    }
  }

  onProgress({
    message: `Processed ${processed} images at step "${step.name}" (replaced: ${replaced}, skipped larger: ${skippedLarger})`,
    step: step.name,
  });

  return doc.save({ useObjectStreams: true });
}

/**
 * Compress a PDF in memory: try steps from estimated start until target is reached or ladder exhausted.
 */
export async function compressPdf(
  inputBytes: Uint8Array,
  targetMb: number,
  onProgress: ProgressCallback
): Promise<CompressionResult> {
  const targetBytes = Math.floor(targetMb * 1024 * 1024);
  const originalSize = inputBytes.length;

  onProgress({
    message: `Original size: ${formatMb(originalSize)} MB, target: ${targetMb} MB`,
  });

  if (originalSize <= targetBytes) {
    onProgress({ message: "File already under target size." });
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
  const ratioNeeded = originalSize / targetBytes;
  onProgress({
    message: `Compression ratio needed: ${ratioNeeded.toFixed(1)}x, starting at step "${COMPRESSION_LADDER[startIndex].name}"`,
  });

  let bestSize = originalSize;
  let bestBytes: Uint8Array = inputBytes;
  let bestStepName = "none";

  for (let idx = startIndex; idx < COMPRESSION_LADDER.length; idx++) {
    const step = COMPRESSION_LADDER[idx];
    onProgress({
      message: `Trying step "${step.name}" (max ${step.maxDimension}px, quality ${step.quality})...`,
      step: step.name,
    });

    try {
      const doc = await PDFDocument.load(inputBytes, { ignoreEncryption: true });
      const outBytes = await compressPdfSinglePass(doc, step, onProgress);
      const resultSize = outBytes.length;

      onProgress({
        message: `  -> ${formatMb(resultSize)} MB`,
        sizeMb: resultSize / (1024 * 1024),
      });

      if (resultSize < bestSize) {
        bestSize = resultSize;
        bestBytes = outBytes;
        bestStepName = step.name;
      }

      if (resultSize <= targetBytes) {
        onProgress({ message: "Target reached!" });
        return {
          success: true,
          outputBytes: outBytes,
          originalSizeBytes: originalSize,
          finalSizeBytes: resultSize,
          targetReached: true,
          stepUsed: step.name,
        };
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
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
