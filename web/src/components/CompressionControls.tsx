"use client";

import type { CompressionMode } from "@/lib/compress/types";
import type { ServerStatus } from "@/lib/compress/server";

interface CompressionControlsProps {
  targetMb: number;
  onTargetMbChange: (value: number) => void;
  mode: CompressionMode;
  onModeChange: (value: CompressionMode) => void;
  onCompress: () => void;
  disabled?: boolean;
  compressing?: boolean;
  hasFile?: boolean;
  serverStatus: ServerStatus;
  serverChecked: boolean;
}

const MIN_MB = 5;
const MAX_MB = 100;
const STEP_MB = 5;

interface ModeOption {
  id: CompressionMode;
  label: string;
  description: string;
  available: boolean;
}

export function CompressionControls({
  targetMb,
  onTargetMbChange,
  mode,
  onModeChange,
  onCompress,
  disabled = false,
  compressing = false,
  hasFile = false,
  serverStatus,
  serverChecked,
}: CompressionControlsProps) {
  const modes: ModeOption[] = [
    {
      id: "server",
      label: "Server (best)",
      description: serverStatus.available
        ? `Ghostscript${serverStatus.qpdf ? " + qpdf" : ""}. Same quality as the desktop tool.`
        : "Compression server not available.",
      available: serverStatus.available,
    },
    {
      id: "preserveText",
      label: "Preserve text",
      description: "Browser-only. Best when selectable text matters.",
      available: true,
    },
    {
      id: "highCompression",
      label: "High compression",
      description: "Browser-only. Strongest size reduction, rasterizes pages.",
      available: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
      <div className="flex flex-col gap-6">
        {/* Engine indicator */}
        {serverChecked && (
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              serverStatus.available
                ? "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                : "bg-[var(--color-border)]/50 text-[var(--color-muted)]"
            }`}
          >
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                serverStatus.available
                  ? "bg-[var(--color-success)]"
                  : "bg-[var(--color-muted)]"
              }`}
            />
            {serverStatus.available
              ? "Compression server connected"
              : "Compression server offline — browser modes available"}
          </div>
        )}

        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <p className="block text-sm font-medium text-[var(--color-text)] mb-2">
              Compression mode
            </p>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => m.available && onModeChange(m.id)}
                  disabled={disabled || compressing || !m.available}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    mode === m.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-text)]"
                      : m.available
                        ? "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] hover:border-[var(--color-primary)]/30"
                        : "border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-muted)] opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="block font-medium">{m.label}</span>
                  <span className="block text-xs leading-snug">
                    {m.description}
                  </span>
                </button>
              ))}
            </div>

            <label
              htmlFor="target-mb"
              className="block text-sm font-medium text-[var(--color-text)] mb-2"
            >
              Target size: {targetMb} MB
            </label>
            <input
              id="target-mb"
              type="range"
              min={MIN_MB}
              max={MAX_MB}
              step={STEP_MB}
              value={targetMb}
              onChange={(e) => onTargetMbChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 rounded-full appearance-none bg-[var(--color-border)] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--color-primary)] [&::-webkit-slider-thumb]:cursor-pointer"
              aria-valuemin={MIN_MB}
              aria-valuemax={MAX_MB}
              aria-valuenow={targetMb}
            />
            <div className="mt-1 flex justify-between text-xs text-[var(--color-muted)]">
              <span>{MIN_MB} MB</span>
              <span>{MAX_MB} MB</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCompress}
            disabled={disabled || compressing || !hasFile}
            className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-medium text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {compressing ? "Compressing…" : "Compress PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
