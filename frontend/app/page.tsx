import Link from "next/link";
import { ExternalIcon } from "@/components/icons";

const FEATURES = [
  {
    title: "Non-custodial",
    body:
      "Iuran USDC langsung masuk smart contract, bukan ke dompet organizer. Tidak ada yang bisa kabur dengan kas.",
  },
  {
    title: "Acak yang adil",
    body:
      "Pemenang dipilih lewat Chainlink VRF dengan shuffle bag — semua anggota pasti dapat giliran sebelum ada yang menang dua kali.",
  },
  {
    title: "Verifiable on-chain",
    body:
      "Setiap transaksi tercatat di Base Sepolia. Siapa pun bisa baca sourcenya di Basescan dan memverifikasi sendiri.",
  },
  {
    title: "Tanpa seed phrase",
    body:
      "Onboarding pakai Coinbase Smart Wallet (passkey). Tidak ada catatan 12 kata yang bisa hilang.",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Buat atau join arisan",
    body:
      "Organizer set iuran, jumlah anggota, dan durasi periode. Anggota join lewat invite link.",
  },
  {
    step: "02",
    title: "Bayar iuran setiap periode",
    body:
      "Smart contract menarik USDC dari setiap anggota di awal periode. Tidak ada perantara.",
  },
  {
    step: "03",
    title: "Undian otomatis",
    body:
      "Setelah deadline, siapapun bisa trigger undian. VRF pilih pemenang, fee 0,5% diambil otomatis.",
  },
  {
    step: "04",
    title: "Pemenang claim sendiri",
    body:
      "Pull pattern: pemenang menarik dana dari contract sendiri. Kalau ada masalah di satu address, arisan lain tetap jalan.",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="chip-accent">Live di Base Sepolia Testnet</span>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Arisan tanpa{" "}
            <span className="text-accent">tukang bank</span>.
            <br />
            Cuma kode.
          </h1>
          <p className="max-w-xl text-lg text-ink-muted">
            Arisan3 memindahkan kepercayaan dari satu orang ke smart contract
            yang tidak bisa diubah siapapun — termasuk tim kami sendiri. Iuran
            masuk on-chain, pemenang dipilih acak, pool ditarik sendiri.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/create" className="btn-primary">
              Buat Arisan Baru
            </Link>
            <Link href="/portfolio" className="btn-secondary">
              Lihat Portfolio
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 pt-4 text-xs text-ink-subtle">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Immutable — sekali deploy, tidak bisa diubah
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Audit-ready: Slither + Mythril + external review
            </span>
          </div>
        </div>

        <HeroVisual />
      </section>

      <section>
        <h2 className="font-display text-3xl font-semibold">
          Kenapa Arisan3?
        </h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Empat janji yang dibangun langsung ke dalam kode — bukan janji
          marketing.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className="font-display text-lg font-semibold text-ink">
                {f.title}
              </div>
              <p className="mt-2 text-sm text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl font-semibold">Cara kerjanya</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <div key={step.step} className="card">
              <div className="font-display text-xs font-bold tracking-wider text-accent">
                {step.step}
              </div>
              <div className="mt-3 font-display text-lg font-semibold">
                {step.title}
              </div>
              <p className="mt-2 text-sm text-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-ink/5 bg-ink p-10 text-prime sm:p-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Kode adalah hukum.
            </h2>
            <p className="max-w-xl text-prime-300">
              Kepercayaanmu tidak lagi tergantung ke integritas seseorang. Baca
              source code-nya, verifikasi di Basescan, lalu join arisan tanpa
              kekhawatiran organizer kabur.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-accent-500"
              >
                Mulai Arisan
              </Link>
              <a
                href="https://sepolia.basescan.org/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-prime/20 px-5 py-3 text-sm font-semibold text-prime hover:border-accent hover:text-accent"
              >
                Lihat contract
                <ExternalIcon size={14} />
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-prime">
            <Stat k="0.5%" v="protocol fee" />
            <Stat k="3–50" v="anggota per grup" />
            <Stat k="0" v="admin keys" />
            <Stat k="∞" v="immutability" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border border-prime/10 bg-prime/5 p-4">
      <div className="font-display text-2xl font-bold text-accent">{k}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-prime-300">
        {v}
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative">
      <div className="grid-paper absolute inset-0 rounded-3xl" />
      <div className="relative grid grid-cols-2 gap-3 rounded-3xl border border-ink/5 bg-prime-100 p-6 shadow-soft">
        <div className="col-span-2 flex items-center justify-between rounded-2xl bg-accent p-4 text-prime">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">
              Periode aktif
            </div>
            <div className="font-display text-xl font-bold">
              3 dari 6 · 50 USDC/anggota
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">Sisa waktu</div>
            <div className="font-display text-2xl font-bold">28:14:09</div>
          </div>
        </div>
        {[
          { name: "Rina", paid: true },
          { name: "Budi", paid: true },
          { name: "Dewi", paid: false },
          { name: "Adi", paid: true },
          { name: "Sari", paid: true },
          { name: "Tono", paid: false },
        ].map((m) => (
          <div
            key={m.name}
            className="flex items-center gap-3 rounded-2xl border border-ink/5 bg-prime p-3"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-ink" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{m.name}</div>
              <div className="text-xs text-ink-subtle">
                {m.paid ? "Sudah bayar" : "Belum bayar"}
              </div>
            </div>
            <span
              className={`h-2 w-2 rounded-full ${m.paid ? "bg-accent" : "bg-warn"}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
