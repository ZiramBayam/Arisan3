import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <div className="font-display text-7xl font-bold text-accent">404</div>
      <h1 className="mt-4 font-display text-3xl font-semibold">
        Halaman tidak ditemukan
      </h1>
      <p className="mt-2 text-ink-muted">
        URL ini tidak cocok dengan arisan manapun.
      </p>
      <Link href="/" className="btn-primary mt-6 inline-flex">
        Kembali ke beranda
      </Link>
    </div>
  );
}
