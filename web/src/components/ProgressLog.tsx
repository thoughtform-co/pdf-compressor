"use client";

import type { CompressionProgress } from "@/lib/compress/types";

interface ProgressLogProps {
  entries: CompressionProgress[];
  className?: string;
}

export function ProgressLog({ entries, className = "" }: ProgressLogProps) {
  if (entries.length === 0) return null;

  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Compression progress"
    >
      <p className="mb-2 text-sm font-medium text-[var(--color-text)]">
        Progress
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs text-[var(--color-muted)]">
        {entries.map((entry, i) => (
          <li key={i}>{entry.message}</li>
        ))}
      </ul>
    </div>
  );
}
