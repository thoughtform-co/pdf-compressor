"use client";

import { Header } from "@/components/Header";
import { FileUpload } from "@/components/FileUpload";
import { CompressionControls } from "@/components/CompressionControls";
import { ProgressLog } from "@/components/ProgressLog";
import { ResultsCard } from "@/components/ResultsCard";
import { useCompression } from "@/hooks/useCompression";

export default function HomePage() {
  const {
    file,
    targetMb,
    setTargetMb,
    mode,
    setMode,
    compressing,
    progress,
    result,
    serverStatus,
    serverChecked,
    onFileSelect,
    onCompress,
    onDownload,
    onReset,
  } = useCompression();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)] mb-2">
          Compress PDF
        </h1>
        <p className="text-[var(--color-muted)] mb-8">
          Reduce file size using Ghostscript when available, or in-browser as a fallback.
        </p>

        <FileUpload
          onFileSelect={onFileSelect}
          disabled={compressing}
        />
        {file && (
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </p>
        )}

        <div className="mt-8">
          <CompressionControls
            targetMb={targetMb}
            onTargetMbChange={setTargetMb}
            mode={mode}
            onModeChange={setMode}
            onCompress={onCompress}
            disabled={!file}
            compressing={compressing}
            hasFile={!!file}
            serverStatus={serverStatus}
            serverChecked={serverChecked}
          />
        </div>

        {(compressing || progress.length > 0) && (
          <div className="mt-6">
            <ProgressLog entries={progress} />
          </div>
        )}

        {result && !compressing && (
          <div className="mt-8">
            <ResultsCard
              result={result}
              fileName={file?.name ?? "document.pdf"}
              onDownload={onDownload}
              onReset={onReset}
            />
          </div>
        )}
      </main>
    </div>
  );
}
