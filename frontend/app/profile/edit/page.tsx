"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance } from "wagmi";
import { BackIcon, UploadIcon } from "@/components/icons";
import { USDC_ADDRESS } from "@/lib/contracts";
import { formatUSDC, generateBlockie, shortAddress } from "@/lib/format";
import { useProfile } from "@/lib/profile";

export default function EditProfilePage() {
  const router = useRouter();
  const { profile, save } = useProfile();
  const { address, isConnected } = useAccount();
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
    query: { enabled: Boolean(address) },
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Hydrate form from stored profile
  useEffect(() => {
    setName(profile.name);
    setEmail(profile.email);
    setAvatarDataUrl(profile.avatarDataUrl);
  }, [profile.name, profile.email, profile.avatarDataUrl]);

  function onPickFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 1024 * 1024) {
      alert("Ukuran foto maksimal 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatarDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function validateEmail(value: string): string | null {
    if (!value) return null;
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return ok ? null : "Format email tidak valid.";
  }

  function onSave() {
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;
    save({ name: name.trim(), email: email.trim(), avatarDataUrl });
    setSaved(true);
    setTimeout(() => router.back(), 600);
  }

  const displayBalance =
    isConnected && usdcBalance
      ? `${formatUSDC(usdcBalance.value)} USDC`
      : "Belum tersedia";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header className="flex flex-col gap-3">
        <Link
          href="/"
          className="btn-ghost -ml-3 w-fit"
        >
          <BackIcon size={16} />
          Kembali
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Edit Profil
        </h1>
        <p className="text-ink-muted">
          Profil ini disimpan secara lokal di browser kamu. Nama dan email
          tidak dikirim ke smart contract.
        </p>
      </header>

      <section className="card space-y-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div
            className="h-24 w-24 rounded-full ring-4 ring-prime shadow-soft"
            style={{
              background: avatarDataUrl
                ? `center / cover no-repeat url(${avatarDataUrl})`
                : generateBlockie(address),
            }}
          />
          <div className="flex-1 space-y-2">
            <div className="text-sm font-semibold text-ink">Foto profil</div>
            <p className="text-xs text-ink-muted">
              Format PNG/JPG, maksimal 1 MB. Disimpan lokal sebagai data URL.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="btn-secondary"
              >
                <UploadIcon size={16} />
                Unggah foto
              </button>
              {avatarDataUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarDataUrl("")}
                  className="btn-ghost"
                >
                  Hapus foto
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="card space-y-5">
        <div>
          <label className="label" htmlFor="name">
            Nama
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Rina Wijaya"
            className="input"
            maxLength={48}
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Maksimal 48 karakter. Bisa dikosongkan.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(validateEmail(e.target.value));
            }}
            placeholder="opsional@contoh.com"
            className="input"
          />
          {emailError ? (
            <p className="mt-1 text-xs font-medium text-danger">
              {emailError}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-subtle">
              Opsional. Dipakai untuk reminder iuran jika kamu opt-in.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-ink/5 bg-prime p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Saldo (dibaca dari wallet)
          </div>
          <div className="mt-1 font-display text-2xl font-bold text-accent-600">
            {displayBalance}
          </div>
          <div className="mt-1 text-xs text-ink-subtle">
            {isConnected && address
              ? `${shortAddress(address)} · Base Sepolia`
              : "Hubungkan wallet untuk membaca saldo USDC."}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Batal
        </button>
        <button type="button" onClick={onSave} className="btn-primary">
          {saved ? "Tersimpan" : "Simpan perubahan"}
        </button>
      </div>
    </div>
  );
}
