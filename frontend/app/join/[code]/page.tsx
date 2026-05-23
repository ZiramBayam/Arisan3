"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { BackIcon, CheckIcon } from "@/components/icons";
import { TxStepper, type Step } from "@/components/TxStepper";
import { MOCK_ARISAN } from "@/lib/mock";
import { formatUSDC, formatDuration } from "@/lib/format";
import { translateError } from "@/lib/errors";

export default function JoinPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { isConnected } = useAccount();
  const arisan = MOCK_ARISAN; // TODO: fetchArisan(params.code)
  type PhaseType = "preview" | "approve" | "join" | "done";
  const [phase, setPhase] = useState<PhaseType>("preview");
  const [error, setError] = useState<string | null>(null);

  const periodSeconds = 30 * 86400;

  async function runStep(target: "approve" | "join") {
    setError(null);
    setPhase(target);
    try {
      // TODO: real tx via wagmi useWriteContract — approve USDC then call join(arisanId)
      await new Promise((r) => setTimeout(r, 1500));
      if (target === "approve") setPhase("join");
      else setPhase("done");
    } catch (e) {
      setError(translateError(e));
      setPhase("preview");
    }
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-xl space-y-6 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-white">
          <CheckIcon size={28} />
        </div>
        <h1 className="font-display text-4xl font-semibold">
          Berhasil join arisan!
        </h1>
        <p className="text-ink-muted">
          Iuran periode pertama sudah masuk ke contract. Kamu sekarang resmi
          jadi anggota.
        </p>
        <button
          type="button"
          onClick={() => router.push(`/arisan/${params.code}`)}
          className="btn-primary"
        >
          Lihat detail arisan
        </button>
      </div>
    );
  }

  const steps: Step[] = [
    {
      title: "Approve USDC",
      description: `Izinkan contract menarik ${formatUSDC(arisan.iuranAmount)} USDC dari wallet.`,
      state: (phase === "approve"
        ? "active"
        : phase === "join" || (phase as any) === "done"
          ? "done"
          : "idle") as "idle" | "active" | "done",
    },
    {
      title: "Join arisan",
      description: "Panggil join() — sekaligus bayar iuran periode pertama.",
      state: (phase === "join"
        ? "active"
        : (phase as any) === "done"
          ? "done"
          : "idle") as "idle" | "active" | "done",
      errorMessage: error ?? undefined,
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <header>
          <Link href="/" className="btn-ghost -ml-3">
            <BackIcon size={16} />
            Kembali
          </Link>
          <span className="chip mt-2">Invite #{params.code}</span>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {arisan.name ?? "Arisan"}
          </h1>
          <p className="mt-2 text-ink-muted">
            Kamu diundang untuk join arisan ini. Pastikan paham parameternya
            sebelum konfirmasi.
          </p>
        </header>

        <section className="card space-y-3">
          <Row label="Iuran per periode">
            <span className="font-display text-xl font-bold text-accent-600">
              {formatUSDC(arisan.iuranAmount)} USDC
            </span>
          </Row>
          <Row label="Jumlah anggota">
            {arisan.members.length} / {arisan.maxMembers}
          </Row>
          <Row label="Durasi periode">
            {formatDuration(periodSeconds)}
          </Row>
          <Row label="Komitmen total">
            {formatUSDC(BigInt(arisan.iuranAmount) * BigInt(arisan.maxMembers))} USDC
          </Row>
        </section>

        <section className="card space-y-3 bg-prime-200">
          <div className="font-display text-base font-semibold">
            Apa yang kamu setujui?
          </div>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              Iuran USDC ditarik otomatis di awal setiap periode.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              Pemenang diundi acak via Chainlink VRF, semua anggota pasti
              dapat giliran.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              Kalau menang, dana di-claim sendiri dari halaman arisan.
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />
              Tidak ada admin yang bisa pause atau ubah parameter setelah
              deploy.
            </li>
          </ul>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Langkah join
          </div>
          <TxStepper steps={steps} />

          {phase === "preview" ? (
            <button
              type="button"
              onClick={() => runStep("approve")}
              disabled={!isConnected}
              className="btn-primary w-full"
            >
              {isConnected ? "Mulai approve USDC" : "Hubungkan wallet dulu"}
            </button>
          ) : null}
          {phase === "join" ? (
            <button
              type="button"
              onClick={() => runStep("join")}
              className="btn-primary w-full"
            >
              Bayar iuran & join
            </button>
          ) : null}
          {(phase === "approve" || phase === "join") && (
            <p className="text-center text-xs text-ink-subtle">
              Konfirmasi transaksi di wallet kamu…
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-semibold text-ink">{children}</span>
    </div>
  );
}
