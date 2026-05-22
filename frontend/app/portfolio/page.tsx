"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { Stat } from "@/components/Stat";
import { StateBadge } from "@/components/StateBadge";
import { MOCK_PORTFOLIO } from "@/lib/mock";
import { formatDuration, formatUSDC } from "@/lib/format";

export default function PortfolioPage() {
  const { isConnected, address } = useAccount();
  const items = MOCK_PORTFOLIO; // TODO: fetchPortfolio(address)

  const totals = useMemo(() => {
    return items.reduce(
      (acc, it) => ({
        active: acc.active + (it.state === "ACTIVE" ? 1 : 0),
        completed: acc.completed + (it.state === "COMPLETED" ? 1 : 0),
        contributed: acc.contributed + BigInt(it.totalContributed),
      }),
      { active: 0, completed: 0, contributed: 0n },
    );
  }, [items]);

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-xl space-y-4 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">
          Hubungkan wallet untuk lihat portfolio
        </h1>
        <p className="text-ink-muted">
          Portfolio menampilkan semua arisan aktif yang kamu ikuti, total
          kontribusi, dan deadline iuran berikutnya.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Portfolio
        </h1>
        <p className="mt-2 text-ink-muted">
          {address ? `Untuk wallet ${address.slice(0, 10)}…` : ""}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Aktif" value={totals.active} hint="Arisan berjalan" />
        <Stat
          label="Selesai"
          value={totals.completed}
          hint="Sudah complete satu siklus"
        />
        <Stat
          label="Total kontribusi"
          value={`${formatUSDC(totals.contributed)} USDC`}
          hint="Akumulasi semua periode"
          accent
        />
      </div>

      {items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-ink-muted">
            Belum ada arisan yang kamu ikuti. Buat atau join lewat invite link.
          </p>
          <Link href="/create" className="btn-primary">
            Buat arisan baru
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((it) => {
            const remaining = it.periodDeadline - Math.floor(Date.now() / 1000);
            return (
              <Link
                key={it.arisanId}
                href={`/arisan/${it.arisanId}`}
                className="card flex flex-col gap-4 transition hover:border-accent/40 hover:shadow-ring sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold">
                      {it.name ?? `Arisan #${it.arisanId}`}
                    </span>
                    <StateBadge state={it.state} />
                    {it.role === "ORGANIZER" ? (
                      <span className="chip-accent">Organizer</span>
                    ) : null}
                    {!it.paidThisPeriod && it.state === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/10 px-3 py-1 text-xs font-semibold text-warn">
                        Iuran belum dibayar
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                    <span>{formatUSDC(it.iuranAmount)} USDC/periode</span>
                    <span>Periode {it.currentPeriod + 1}</span>
                    {it.state === "ACTIVE" ? (
                      <span>
                        {remaining > 0
                          ? `Deadline dalam ${formatDuration(remaining)}`
                          : "Deadline lewat — perlu trigger"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-ink-subtle">
                    Total kontribusi
                  </div>
                  <div className="font-display text-lg font-bold text-accent-600">
                    {formatUSDC(it.totalContributed)} USDC
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
