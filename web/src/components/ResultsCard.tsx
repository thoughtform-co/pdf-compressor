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
        className={`rounded-2xl border border-[var(--color-error)]/30 bg-[var(--color-surface)] p-6 ${className}`}
        role="alert"
      >
        <p className="text-[var(--color-error)]">
          {result.errorMessage ?? "Compression failed."}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 text-sm font-medium text-[var(--color-primary)] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const savings =
    result.originalSizeBytes > 0
      ? (
          (1 - result.finalSizeBytes / result.originalSizeBytes) *
          100
        ).toFixed(1)
      : "0";
  const baseName = fileName.replace(/\.pdf$/i, "");
  const downloadFileName = `${baseName}.compressed.pdf`;

  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 ${className}`}
    >
      <h2 className="font-display text-lg font-semibold text-[var(--color-text)] mb-4">
        Done
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-[var(--color-muted)]">Original</p>
          <p className="font-medium text-[var(--color-text)]">
            {formatBytes(result.originalSizeBytes)}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--color-muted)]">Compressed</p>
          <p className="font-medium text-[var(--color-success)]">
            {formatBytes(result.finalSizeBytes)}
          </p>
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--color-muted)]">
        {savings}% smaller · step: {result.stepUsed}
        {result.targetReached ? " · Target reached" : ""}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onDownload}
          className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          Download {downloadFileName}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-5 py-2.5 font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          Compress another
        </button>
      </div>
    </div>
  );
}
