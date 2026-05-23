"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";
import { generateBlockie } from "@/lib/format";
import { Logo } from "./Logo";
import { ProfilePanel } from "./ProfilePanel";

export function Header() {
  const [profileOpen, setProfileOpen] = useState(false);
  const { address, isConnected } = useAccount();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-ink/5 bg-prime/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* LEFT — Profile button */}
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            aria-label="Buka profil"
            aria-expanded={profileOpen}
            className="flex items-center gap-2 rounded-full border border-ink/10 bg-prime-100 py-1.5 pl-1.5 pr-3 text-sm font-medium text-ink shadow-soft transition hover:border-accent hover:text-accent"
          >
            {isConnected && address ? (
              <span
                className="h-7 w-7 rounded-full ring-2 ring-prime"
                style={{ background: generateBlockie(address) }}
                aria-hidden
              />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-prime-300 text-ink-muted" aria-hidden>
                {/* user glyph */}
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
                </svg>
              </span>
            )}
            <span className="hidden sm:inline">Profil</span>
          </button>

          {/* RIGHT — Arisan3 wordmark followed by the logo, sized to match
              the text height so the two read as one balanced lockup. */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-ink transition-colors hover:text-accent"
          >
            <span className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Arisan3
            </span>
            <Logo size={30} className="flex-shrink-0" />
          </Link>
        </div>
      </header>

      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
