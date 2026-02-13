"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}

export function FileUpload({
  onFileSelect,
  disabled = false,
  accept = ".pdf,application/pdf",
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const isPdfFile = useCallback((file: File) => {
    const hasPdfMime = file.type === "application/pdf";
    const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
    return hasPdfMime || hasPdfExtension;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file && isPdfFile(file)) {
        onFileSelect(file);
      }
    },
    [onFileSelect, disabled, isPdfFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && isPdfFile(file)) onFileSelect(file);
      e.target.value = "";
    },
    [onFileSelect, isPdfFile]
  );

  return (
    <label
      className={`
        group flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-sm border-2 border-dashed p-8 transition-all duration-300 bg-dot-grid
        ${disabled ? "cursor-not-allowed opacity-60" : ""}
        ${
          isDragging
            ? "border-primary drop-zone-glow-active bg-primary/5"
            : "border-border drop-zone-glow hover:border-primary/40"
        }
      `}
      style={{ backgroundColor: `hsl(var(--dropzone))` }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        aria-label="Choose PDF file"
      />
      <UploadIcon
        className={`mb-3 transition-transform duration-300 ${
          isDragging
            ? "text-primary -translate-y-1"
            : "text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5"
        }`}
      />
      <span className="text-center text-xs font-medium uppercase tracking-wider text-foreground/90">
        Drop PDF here or click to browse
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        PDF only, any size
      </span>
    </label>
  );
}
