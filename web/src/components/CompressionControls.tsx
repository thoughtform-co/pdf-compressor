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

  const valuePercent = ((targetMb - MIN_MB) / (MAX_MB - MIN_MB)) * 100;

  return (
    <div className="flex flex-col gap-5">
      {serverChecked && (
        <div
          className={`flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wider ${
            serverStatus.available
              ? "border-primary/30 bg-primary/5 text-primary"
              : "bg-muted/50 text-muted-foreground"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 ${
              serverStatus.available ? "bg-primary" : "bg-muted-foreground"
            }`}
          />
          {serverStatus.available
            ? "Server connected"
            : "Server offline — browser modes available"}
        </div>
      )}

      {/* Mode selector */}
      <div>
        <p className="section-label mb-2">Mode</p>
        <div className="grid grid-cols-3 gap-1.5">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => m.available && onModeChange(m.id)}
              disabled={disabled || compressing || !m.available}
              className={`rounded-sm border px-2.5 py-2 text-left text-[10px] font-medium uppercase tracking-wider transition-all duration-200 ${
                mode === m.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : m.available
                    ? "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                    : "cursor-not-allowed border-border bg-card/30 text-muted-foreground opacity-50"
              }`}
            >
              <span className="block leading-tight">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target size slider – stat readout style */}
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="section-label">Target size</span>
          <span className="font-mono text-sm font-medium tabular-nums text-primary">
            {targetMb} MB
          </span>
        </div>
        <input
          id="target-mb"
          type="range"
          min={MIN_MB}
          max={MAX_MB}
          step={STEP_MB}
          value={targetMb}
          onChange={(e) => onTargetMbChange(Number(e.target.value))}
          disabled={disabled}
          style={
            { "--value-percent": `${valuePercent}%` } as React.CSSProperties
          }
          className="target-size-slider mt-1 block w-full appearance-none bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
          aria-valuemin={MIN_MB}
          aria-valuemax={MAX_MB}
          aria-valuenow={targetMb}
          aria-valuetext={`${targetMb} megabytes`}
          aria-label="Target file size"
        />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground/70">
          <span>{MIN_MB} MB</span>
          <span>{MAX_MB} MB</span>
        </div>
      </div>

      {/* Compress button */}
      <button
        type="button"
        onClick={onCompress}
        disabled={disabled || compressing || !hasFile}
        className="w-full rounded-sm border border-primary bg-primary py-3.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition-all duration-200 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground"
      >
        {compressing ? "Compressing…" : "Compress"}
      </button>
    </div>
  );
}
