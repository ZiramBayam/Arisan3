"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { BackIcon, CheckIcon } from "@/components/icons";
import { FEE_BPS } from "@/lib/contracts";
import { formatUSDC } from "@/lib/format";

type FormState = {
  name: string;
  maxMembers: number;
  iuranAmount: string;
  periodDays: number;
  graceDays: number;
};

const DEFAULT_FORM: FormState = {
  name: "",
  maxMembers: 6,
  iuranAmount: "50",
  periodDays: 30,
  graceDays: 3,
};

export default function CreateArisanPage() {
  const { isConnected } = useAccount();
  const [step, setStep] = useState<"form" | "preview" | "success">("form");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(() => validate(form), [form]);
  const hasErrors = Object.values(errors).some(Boolean);

  const iuranBig = useMemo(() => {
    try {
      return BigInt(Math.round(Number(form.iuranAmount) * 1_000_000));
    } catch {
      return 0n;
    }
  }, [form.iuranAmount]);

  const poolPerPeriod = iuranBig * BigInt(form.maxMembers);
  const fee = (poolPerPeriod * BigInt(FEE_BPS)) / 10000n;
  const winnerNet = poolPerPeriod - fee;
  const perMemberCommitment = iuranBig * BigInt(form.maxMembers);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    // TODO: wire to factory.createArisan via wagmi useWriteContract
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    setStep("success");
  }

  if (step === "success") {
    return <SuccessView name={form.name || "Arisan Baru"} />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-6">
        <header>
          <Link href="/" className="btn-ghost -ml-3">
            <BackIcon size={16} />
            Kembali
          </Link>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Buat Arisan Baru
          </h1>
          <p className="mt-2 max-w-xl text-ink-muted">
            Setelah deploy, parameter ini tidak bisa diubah. Pastikan semua
            angka sudah benar sebelum konfirmasi.
          </p>
        </header>

        <section className="card space-y-5">
          <div>
            <label className="label" htmlFor="name">
              Nama Arisan
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Contoh: Arisan Kantor Q3"
              className="input"
            />
            <p className="mt-1 text-xs text-ink-subtle">
              Disimpan di metadata invite link saja, bukan di contract.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Jumlah anggota"
              hint="Antara 3 dan 50 orang"
              error={errors.maxMembers}
            >
              <input
                type="number"
                min={3}
                max={50}
                value={form.maxMembers}
                onChange={(e) =>
                  update("maxMembers", Number(e.target.value))
                }
                className="input"
              />
            </Field>

            <Field
              label="Iuran per periode (USDC)"
              hint="6 desimal, sesuai standar USDC"
              error={errors.iuranAmount}
            >
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.iuranAmount}
                  onChange={(e) => update("iuranAmount", e.target.value)}
                  className="input pr-16"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-subtle">
                  USDC
                </span>
              </div>
            </Field>

            <Field
              label="Durasi periode"
              hint="Minimal 1 hari per periode"
              error={errors.periodDays}
            >
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.periodDays}
                  onChange={(e) =>
                    update("periodDays", Number(e.target.value))
                  }
                  className="input pr-16"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-subtle">
                  hari
                </span>
              </div>
            </Field>

            <Field
              label="Grace period"
              hint="Window peringatan setelah deadline (warn-only)"
            >
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.graceDays}
                  onChange={(e) =>
                    update("graceDays", Number(e.target.value))
                  }
                  className="input pr-16"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-subtle">
                  hari
                </span>
              </div>
            </Field>
          </div>
        </section>

        <button
          type="button"
          onClick={() => setStep("preview")}
          disabled={hasErrors}
          className="btn-primary w-full"
        >
          Lanjut ke Preview
        </button>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Ringkasan
          </div>
          <SummaryRow label="Pool per periode">
            {formatUSDC(poolPerPeriod)} USDC
          </SummaryRow>
          <SummaryRow label={`Protocol fee (${FEE_BPS / 100}%)`}>
            {formatUSDC(fee)} USDC
          </SummaryRow>
          <SummaryRow label="Diterima pemenang">
            <span className="text-accent-600">
              {formatUSDC(winnerNet)} USDC
            </span>
          </SummaryRow>
          <hr className="border-ink/5" />
          <SummaryRow label="Durasi total">
            {form.maxMembers * form.periodDays} hari
          </SummaryRow>
          <SummaryRow label="Total komitmen / anggota">
            {formatUSDC(perMemberCommitment)} USDC
          </SummaryRow>
        </div>

        {step === "preview" ? (
          <div className="card space-y-3 border-accent/30 bg-accent-50">
            <div className="font-display text-base font-semibold">
              Konfirmasi terakhir
            </div>
            <p className="text-xs text-ink-muted">
              Setelah submit, contract instance ArisanPool akan di-deploy di
              Base Sepolia dengan parameter di atas — dan tidak bisa diubah
              lagi.
            </p>
            {!isConnected ? (
              <p className="text-xs font-semibold text-danger">
                Hubungkan wallet dulu di pojok kanan atas.
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="btn-secondary flex-1"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isConnected || submitting}
                className="btn-primary flex-1"
              >
                {submitting ? "Deploying…" : "Submit transaksi"}
              </button>
            </div>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-ink-muted">{label}</span>
      <span className="font-display font-semibold text-ink">{children}</span>
    </div>
  );
}

function validate(form: FormState) {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (form.maxMembers < 3 || form.maxMembers > 50)
    errors.maxMembers = "Harus antara 3 dan 50 anggota.";
  if (Number(form.iuranAmount) <= 0)
    errors.iuranAmount = "Iuran harus lebih dari 0.";
  if (form.periodDays < 1) errors.periodDays = "Minimal 1 hari per periode.";
  return errors;
}

function SuccessView({ name }: { name: string }) {
  const fakeId = "1";
  const inviteUrl = `https://arisan3.example/join/${fakeId}`;
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent text-white">
        <CheckIcon size={28} />
      </div>
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        {name} berhasil di-deploy
      </h1>
      <p className="text-ink-muted">
        Bagikan invite link berikut ke calon anggota. Mereka tinggal connect
        wallet, approve USDC, lalu join.
      </p>
      <div className="card flex items-center gap-3 text-left">
        <code className="flex-1 truncate text-sm text-ink">{inviteUrl}</code>
        <button type="button" className="btn-secondary">
          Salin
        </button>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link href={`/arisan/${fakeId}`} className="btn-primary">
          Buka halaman arisan
        </Link>
        <Link href="/portfolio" className="btn-secondary">
          Lihat portfolio
        </Link>
      </div>
    </div>
  );
}
