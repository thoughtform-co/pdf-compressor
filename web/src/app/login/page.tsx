"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Wrong password");
        return;
      }
      window.location.href = "/";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background bg-dot-grid">
      <div className="w-full max-w-sm rounded-sm border border-border bg-card/90 p-8 backdrop-blur-xl">
        <h1 className="mb-1 text-2xl font-bold uppercase tracking-[0.15em] text-foreground">
          Angstrom
        </h1>
        <p className="mb-6 text-[10px] uppercase tracking-wider text-muted-foreground">
          Enter password to continue
        </p>

        {error && (
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="section-label mb-1 block"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              autoFocus
              className="w-full rounded-sm border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-sm border border-primary bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.15em] text-primary-foreground transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50"
          >
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </div>
      <p className="mt-6 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Link
          href="/"
          className="underline hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background rounded-sm"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
