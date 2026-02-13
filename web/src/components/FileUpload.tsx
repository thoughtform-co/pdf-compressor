"use client";

import { useCallback, useState } from "react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  accept?: string;
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
        flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors
        ${disabled ? "cursor-not-allowed opacity-60" : ""}
        ${
          isDragging
            ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
            : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg)]"
        }
      `}
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
      <span
        className="mb-2 text-4xl"
        aria-hidden
      >
        📄
      </span>
      <span className="text-center font-medium text-[var(--color-text)]">
        Drop a PDF here or click to browse
      </span>
      <span className="mt-1 text-sm text-[var(--color-muted)]">
        PDF only, any size
      </span>
    </label>
  );
}
