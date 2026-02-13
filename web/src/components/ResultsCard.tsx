"use client";

import type { CompressionResult } from "@/lib/compress/types";

interface ResultsCardProps {
  result: CompressionResult;
  fileName: string;
  onDownload: () => void;
  onReset: () => void;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${bytes} bytes`;
}

export function ResultsCard({
  result,
  fileName,
  onDownload,
  onReset,
  className = "",
}: ResultsCardProps) {
  if (!result.success || !result.outputBytes) {
    return (
      <div
        className={`rounded-sm border border-destructive/30 bg-card/60 p-5 ${className}`}
        role="alert"
      >
        <p className="text-sm text-destructive">
          {result.errorMessage ?? "Compression failed."}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 text-xs font-medium uppercase tracking-wider text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-sm"
        >
          Try again
        </button>
      </div>
    );
  }

  const noReduction =
    result.finalSizeBytes >= result.originalSizeBytes ||
    result.originalSizeBytes === 0;

  const savings =
    result.originalSizeBytes > 0 && !noReduction
      ? (
          (1 - result.finalSizeBytes / result.originalSizeBytes) *
          100
        ).toFixed(1)
      : "0";

  const borderColor = result.targetReached
    ? "border-success/40"
    : noReduction
      ? "border-warning/40"
      : "border-border";

  return (
    <div className={`rounded-sm border ${borderColor} bg-card/60 p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <span className="section-label">Result</span>
        <span className="font-mono text-xs text-muted-foreground">
          {result.targetReached
            ? "Target reached"
            : noReduction
              ? "Could not reduce"
              : "Best effort"}
        </span>
      </div>

      {noReduction ? (
        <div className="mb-4">
          <p className="text-sm text-warning">
            This PDF could not be compressed further in the browser.
            Try the Server mode with Ghostscript for best results on large files.
          </p>
        </div>
      ) : (
        <div className="mb-4">
          <p className="font-mono text-3xl font-bold tabular-nums text-primary">
            {savings}%
          </p>
          <p className="section-label mt-0.5">Smaller</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-sm border border-border bg-background/50 py-3 px-3 text-center">
          <p className="section-label">Original</p>
          <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-foreground">
            {formatBytes(result.originalSizeBytes)}
          </p>
        </div>
        <div className="rounded-sm border border-border bg-background/50 py-3 px-3 text-center">
          <p className="section-label">Compressed</p>
          <p className="mt-0.5 font-mono text-sm font-medium tabular-nums text-primary">
            {formatBytes(result.finalSizeBytes)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        {!noReduction && (
          <button
            type="button"
            onClick={onDownload}
            className="flex-1 rounded-sm border border-primary bg-primary py-3 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Download
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className={`${noReduction ? "flex-1" : ""} rounded-sm border border-border bg-card/60 px-5 py-3 text-xs font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-primary/5 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background`}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
