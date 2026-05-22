"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAccount, useBalance, useConnect, useDisconnect } from "wagmi";
import { USDC_ADDRESS } from "@/lib/contracts";
import { formatUSDC, generateBlockie, shortAddress } from "@/lib/format";
import { useProfile } from "@/lib/profile";
import { CloseIcon, PencilIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

export function ProfilePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { profile } = useProfile();

  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
    query: { enabled: Boolean(address) },
  });

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const smartConnector =
    connectors.find((c) => c.id === "coinbaseWalletSDK") ?? connectors[0];

  const fallbackName =
    isConnected && address ? shortAddress(address) : "Tamu";
  const displayName = profile.name.trim() || fallbackName;
  const displayBalance =
    isConnected && usdcBalance
      ? `${formatUSDC(usdcBalance.value)} USDC`
      : "Belum tersedia";

  const avatarStyle = profile.avatarDataUrl
    ? { background: `center / cover no-repeat url(${profile.avatarDataUrl})` }
    : { background: generateBlockie(address) };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-100 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer: 1/3 width, slides in from left over 100ms */}
      <aside
        role="dialog"
        aria-label="Profile"
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[33.333vw] min-w-[280px] max-w-[480px] flex-col border-r border-ink/5 bg-prime-100 shadow-soft transition-transform duration-100 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-ink/5 px-6 py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Profil
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-prime-300 hover:text-ink"
            aria-label="Tutup profil"
          >
            <CloseIcon size={16} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {/* Avatar + name + balance.
              Avatar sits a small but deliberate gap above the identity
              cluster (mt-3). Inside the cluster, name / status / email use
              a tight 2-px stack so they read as one block instead of three
              spaced lines. The balance card then has its own breathing room
              below so it doesn't get pulled into the identity cluster. */}
          <section className="flex flex-col items-center text-center">
            <div
              className="h-20 w-20 rounded-full ring-4 ring-prime shadow-soft"
              style={avatarStyle}
            />

            <div className="mt-3 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2">
                <div className="font-display text-lg font-semibold leading-tight text-ink">
                  {displayName}
                </div>
                <Link
                  href="/profile/edit"
                  onClick={onClose}
                  className="grid h-7 w-7 place-items-center rounded-full text-ink-muted transition hover:bg-prime-300 hover:text-accent"
                  aria-label="Edit profil"
                  title="Edit profil"
                >
                  <PencilIcon size={14} />
                </Link>
              </div>
              <div className="text-xs leading-tight text-ink-subtle">
                {isConnected ? "Base Sepolia" : "Belum terhubung"}
              </div>
              {profile.email ? (
                <div className="text-xs leading-tight text-ink-muted">
                  {profile.email}
                </div>
              ) : null}
            </div>

            <div className="mt-4 w-full rounded-2xl border border-ink/5 bg-prime p-4 text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Saldo
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-accent-600">
                {displayBalance}
              </div>
              <div className="mt-0.5 text-xs text-ink-subtle">
                USDC di wallet kamu
              </div>
            </div>
          </section>

          {/* Theme toggle */}
          <section>
            <div className="label">Tampilan</div>
            <ThemeToggle />
          </section>

          {/* Wallet connect */}
          <section className="space-y-2">
            <div className="label">Wallet</div>
            {isConnected && address ? (
              <div className="space-y-2">
                <div className="rounded-2xl border border-ink/5 bg-prime p-4">
                  <div className="text-xs text-ink-subtle">Address</div>
                  <div className="mt-1 break-all font-mono text-xs text-ink">
                    {address}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  className="btn-secondary w-full"
                >
                  Disconnect wallet
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() =>
                  smartConnector && connect({ connector: smartConnector })
                }
                disabled={isPending || !smartConnector}
                className="btn-primary w-full"
              >
                {isPending ? "Menghubungkan" : "Connect Wallet"}
              </button>
            )}
          </section>

          <section>
            <div className="label">Navigasi</div>
            <div className="space-y-1">
              <Link
                href="/portfolio"
                onClick={onClose}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-prime-300"
              >
                Portfolio
              </Link>
              <Link
                href="/create"
                onClick={onClose}
                className="block rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-prime-300"
              >
                Buat arisan baru
              </Link>
            </div>
          </section>
        </div>

        <footer className="border-t border-ink/5 px-6 py-4 text-xs text-ink-subtle">
          Arisan3 · Immutable contract di Base Sepolia
        </footer>
      </aside>
    </>
  );
}
