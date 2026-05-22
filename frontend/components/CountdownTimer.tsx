"use client";

import { useEffect, useState } from "react";

function getTone(seconds: number) {
  if (seconds <= 0) return "expired";
  if (seconds < 24 * 3600) return "danger";
  if (seconds < 48 * 3600) return "warn";
  return "ok";
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function CountdownTimer({
  deadline,
  label = "Sisa waktu periode",
  onExpire,
}: {
  deadline: number;
  label?: string;
  onExpire?: () => void;
}) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadline - now);
  const tone = getTone(remaining);

  useEffect(() => {
    if (remaining === 0 && onExpire) onExpire();
  }, [remaining, onExpire]);

  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  const toneClass =
    tone === "expired"
      ? "bg-ink text-prime"
      : tone === "danger"
        ? "bg-danger text-prime"
        : tone === "warn"
          ? "bg-warn text-ink"
          : "bg-accent text-prime";

  return (
    <div className="card flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      {tone === "expired" ? (
        <div className="text-2xl font-display font-semibold">
          Deadline sudah lewat — siap di-trigger
        </div>
      ) : (
        <div className="flex items-center gap-2 font-display">
          <Cell value={pad(d)} unit="hari" tone={toneClass} />
          <span className="text-2xl text-ink-subtle">:</span>
          <Cell value={pad(h)} unit="jam" tone={toneClass} />
          <span className="text-2xl text-ink-subtle">:</span>
          <Cell value={pad(m)} unit="mnt" tone={toneClass} />
          <span className="text-2xl text-ink-subtle">:</span>
          <Cell value={pad(s)} unit="dtk" tone={toneClass} />
        </div>
      )}
    </div>
  );
}

function Cell({
  value,
  unit,
  tone,
}: {
  value: string;
  unit: string;
  tone: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`rounded-xl px-3 py-2 text-2xl font-bold leading-none sm:text-3xl ${tone}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-ink-subtle">
        {unit}
      </div>
    </div>
  );
}
