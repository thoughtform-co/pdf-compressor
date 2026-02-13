"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function Header() {
  const router = useRouter();
  const [authEnabled, setAuthEnabled] = useState<boolean | null>(null);

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
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-lg font-semibold text-[var(--color-text)]"
        >
          PDF Compressor
        </Link>
        {authEnabled === true ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm font-medium text-[var(--color-muted)] hover:text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 rounded px-2 py-1"
          >
            Sign out
          </button>
        ) : authEnabled === false ? (
          <span className="text-xs text-[var(--color-muted)]">
            No password set (local preview)
          </span>
        ) : null}
      </div>
    </header>
  );
}
