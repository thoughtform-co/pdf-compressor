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
      className={`relative rounded-sm border border-border bg-card/60 p-4 scanlines ${className}`}
      role="log"
      aria-live="polite"
      aria-label="Compression progress"
    >
      <p className="section-label mb-2">Progress</p>
      <ul className="max-h-40 space-y-0.5 overflow-y-auto font-mono text-xs text-muted-foreground">
        {entries.map((entry, i) => (
          <li key={i} className="text-foreground/80">
            <span className="text-primary/80 select-none">&gt; </span>
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
