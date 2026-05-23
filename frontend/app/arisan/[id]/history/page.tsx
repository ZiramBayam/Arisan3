"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { EventFeed } from "@/components/EventFeed";
import { BackIcon } from "@/components/icons";
import { MOCK_HISTORY } from "@/lib/mock";

export default function HistoryPage() {
  const params = useParams<{ id: string }>();
  const events = MOCK_HISTORY; // TODO: fetchHistory(params.id)

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3">
        <Link href={`/arisan/${params.id}`} className="btn-ghost -ml-3 w-fit">
          <BackIcon size={16} />
          Kembali ke detail
        </Link>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Riwayat lengkap
        </h1>
        <p className="text-ink-muted">
          Setiap event di-emit oleh smart contract dan di-index oleh Ponder.
          Verifikasi langsung di Basescan kalau ingin lihat raw transaction.
        </p>
      </header>

      <EventFeed events={events.slice().sort((a, b) => b.timestamp - a.timestamp)} />
    </div>
  );
}
