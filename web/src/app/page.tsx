"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ParticleBackground } from "@/components/ParticleBackground";
import { FileUpload } from "@/components/FileUpload";
import { CompressionControls } from "@/components/CompressionControls";
import { ProgressLog } from "@/components/ProgressLog";
import { ResultsCard } from "@/components/ResultsCard";
import { useCompression } from "@/hooks/useCompression";

const CompressionVisualizer = dynamic(
  () =>
    import("@/components/CompressionVisualizer").then((m) => m.CompressionVisualizer),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);

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

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((d) => setAuthEnabled(d.configured === true))
      .catch(() => setAuthEnabled(false));
  }, []);

  async function handleSignOut() {
    if (!authEnabled) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    router.push("/login");
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      <ParticleBackground compressing={compressing} />
      {compressing && (
        <CompressionVisualizer compressing={compressing} progress={progress.length} />
      )}

      {/* Hero */}
      <div className="relative z-10 w-full">
        <div className="mx-auto max-w-md px-5 pt-14 pb-6 sm:pt-20 sm:pb-8 text-center">
          <h1 className="text-4xl font-bold uppercase tracking-[0.2em] text-foreground sm:text-5xl">
            Angstrom
          </h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Atomic-level PDF compression
          </p>
        </div>
      </div>

      {/* App body */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-md px-5 pb-14">
        <div className="space-y-5 border border-border rounded-sm bg-card/30 p-4">
          <FileUpload onFileSelect={onFileSelect} disabled={compressing} />

          {file && (
            <p
              className="text-center text-sm text-muted-foreground"
              aria-live="polite"
            >
              {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          )}

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

          {(compressing || progress.length > 0) && (
            <ProgressLog entries={progress} />
          )}

          {result && !compressing && (
            <ResultsCard
              result={result}
              fileName={file?.name ?? "document.pdf"}
              onDownload={onDownload}
              onReset={onReset}
            />
          )}
        </div>

        {authEnabled === true && (
          <div className="mt-12 text-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            >
              Sign out
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
