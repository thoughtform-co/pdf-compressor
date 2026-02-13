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
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
        <Link
          href="/"
          className="text-lg font-bold uppercase tracking-[0.2em] text-foreground"
        >
          Angstrom
        </Link>
        {authEnabled === true ? (
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-sm px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
          >
            Sign out
          </button>
        ) : authEnabled === false ? (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            No password set (local preview)
          </span>
        ) : null}
      </div>
    </header>
  );
}
