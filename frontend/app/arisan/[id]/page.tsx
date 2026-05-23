"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ActionButton } from "@/components/ActionButton";
import { CountdownTimer } from "@/components/CountdownTimer";
import { BackIcon, ExternalIcon } from "@/components/icons";
import { MemberGrid } from "@/components/MemberGrid";
import { Stat } from "@/components/Stat";
import { StateBadge } from "@/components/StateBadge";
import { FEE_BPS } from "@/lib/contracts";
import { formatUSDC, shortAddress } from "@/lib/format";
import { MOCK_ARISAN } from "@/lib/mock";

export default function ArisanDetailPage() {
  const params = useParams<{ id: string }>();
  const { address, isConnected } = useAccount();
  const arisan = MOCK_ARISAN; // TODO: fetchArisan(params.id)
  const [shareCopied, setShareCopied] = useState(false);

  const poolPerPeriod =
    BigInt(arisan.iuranAmount) * BigInt(arisan.maxMembers);
  const fee = (poolPerPeriod * BigInt(FEE_BPS)) / 10000n;
  const winnerNet = poolPerPeriod - fee;

  const paidCount = arisan.members.filter((m) => m.paidThisPeriod).length;
  const inviteUrl = `https://arisan3.example/join/${arisan.id}`;

  const isWinnerOfPrev =
    arisan.winnerHistory.length > 0 &&
    address &&
    arisan.winnerHistory.at(-1)?.winner.toLowerCase() === address.toLowerCase();
  const claimable = isWinnerOfPrev ? BigInt(arisan.winnerHistory.at(-1)!.amount) : 0n;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <Link href="/portfolio" className="btn-ghost -ml-3 w-fit">
          <BackIcon size={16} />
          Portfolio
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {arisan.name ?? `Arisan #${params.id}`}
          </h1>
          <StateBadge state={arisan.state} />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <span>
            Organizer: <span className="font-medium text-ink">{shortAddress(arisan.organizer)}</span>
          </span>
          <span>·</span>
          <span>
            Periode {arisan.currentPeriod + 1} / {arisan.maxMembers}
          </span>
          <span>·</span>
          <a
            href={`https://sepolia.basescan.org/address/${arisan.organizer}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-ink-muted hover:text-accent"
          >
            Lihat contract
            <ExternalIcon size={12} />
          </a>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Iuran"
          value={`${formatUSDC(arisan.iuranAmount)} USDC`}
          hint="Per anggota per periode"
        />
        <Stat
          label="Pool periode"
          value={`${formatUSDC(poolPerPeriod)} USDC`}
          hint={`Fee ${formatUSDC(fee)}`}
        />
        <Stat
          label="Pemenang terima"
          value={`${formatUSDC(winnerNet)} USDC`}
          hint={`Setelah fee ${FEE_BPS / 100}%`}
          accent
        />
        <Stat
          label="Sudah bayar"
          value={`${paidCount} / ${arisan.members.length}`}
          hint="Anggota di periode aktif"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <CountdownTimer deadline={arisan.periodDeadline} />

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">
                Anggota & status bayar
              </h2>
              <Link
                href={`/arisan/${arisan.id}/history`}
                className="btn-ghost"
              >
                Lihat riwayat
              </Link>
            </div>
            <MemberGrid
              members={arisan.members}
              maxMembers={arisan.maxMembers}
              highlightAddress={address}
            />
          </section>

          <section className="card">
            <h2 className="font-display text-xl font-semibold">
              Riwayat pemenang
            </h2>
            {arisan.winnerHistory.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">
                Belum ada pemenang — periode pertama masih berjalan.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {arisan.winnerHistory.map((w) => (
                  <li
                    key={w.period}
                    className="flex items-center justify-between rounded-xl border border-ink/5 bg-prime p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-50 text-xs font-bold text-accent-600">
                        #{w.period + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {shortAddress(w.winner)}
                        </div>
                        <div className="text-xs text-ink-subtle">
                          Periode {w.period + 1}
                        </div>
                      </div>
                    </div>
                    <span className="font-display font-bold text-accent-600">
                      +{formatUSDC(w.amount)} USDC
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card space-y-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Aksi
            </div>
            <ActionButton
              arisan={arisan}
              isConnected={isConnected}
              viewer={address}
              claimableAmount={claimable}
            />
            <p className="text-center text-xs text-ink-subtle">
              {arisan.state === "OPEN"
                ? "Arisan akan auto-start ketika semua slot terisi."
                : "Smart contract handle semua transfer. Tidak ada perantara."}
            </p>
          </div>

          <div className="card space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Invite link
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-prime p-2 text-xs text-ink">
                {inviteUrl}
              </code>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined") {
                    navigator.clipboard.writeText(inviteUrl);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }
                }}
                className="btn-secondary px-3 py-2 text-xs"
              >
                {shareCopied ? "Tersalin!" : "Salin"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
