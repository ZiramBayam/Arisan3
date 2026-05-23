import type { ReactElement } from "react";
import type { EventLogItem } from "@/lib/api";
import { formatTimestamp, formatUSDC, shortAddress } from "@/lib/format";
import {
  DownloadIcon,
  ExternalIcon,
  PlayIcon,
  RandomIcon,
  SparkleIcon,
  StarIcon,
  UploadIcon,
  UserPlusIcon,
} from "./icons";

const EVENT_META: Record<
  EventLogItem["type"],
  {
    icon: (p: { size?: number }) => ReactElement;
    tone: string;
    describe: (e: EventLogItem) => string;
  }
> = {
  ArisanCreated: {
    icon: (p) => <SparkleIcon {...p} />,
    tone: "bg-accent-50 text-accent-600",
    describe: (e) => `Arisan dibuat oleh ${shortAddress(e.actor)}`,
  },
  MemberJoined: {
    icon: (p) => <UserPlusIcon {...p} />,
    tone: "bg-prime-300 text-ink",
    describe: (e) => `${shortAddress(e.actor)} bergabung sebagai anggota`,
  },
  ArisanStarted: {
    icon: (p) => <PlayIcon {...p} />,
    tone: "bg-accent-50 text-accent-600",
    describe: () => "Arisan resmi dimulai, semua slot terisi",
  },
  IuranDeposited: {
    icon: (p) => <DownloadIcon {...p} />,
    tone: "bg-prime-300 text-ink",
    describe: (e) =>
      `${shortAddress(e.actor)} bayar iuran periode ${(e.period ?? 0) + 1}`,
  },
  RandomnessRequested: {
    icon: (p) => <RandomIcon {...p} />,
    tone: "bg-warn/10 text-warn",
    describe: (e) =>
      `Random pemenang diminta untuk periode ${(e.period ?? 0) + 1}`,
  },
  WinnerSelected: {
    icon: (p) => <StarIcon {...p} />,
    tone: "bg-accent-50 text-accent-600",
    describe: (e) =>
      `${shortAddress(e.actor)} menang periode ${(e.period ?? 0) + 1}, ${
        e.amount ? formatUSDC(e.amount) : "?"
      } USDC`,
  },
  FundsClaimed: {
    icon: (p) => <UploadIcon {...p} />,
    tone: "bg-accent-50 text-accent-600",
    describe: (e) =>
      `${shortAddress(e.actor)} claim ${
        e.amount ? formatUSDC(e.amount) : "?"
      } USDC`,
  },
};

export function EventFeed({ events }: { events: EventLogItem[] }) {
  if (events.length === 0) {
    return (
      <div className="card text-center text-sm text-ink-muted">
        Belum ada event tercatat.
      </div>
    );
  }
  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const meta = EVENT_META[event.type];
        return (
          <li key={event.id} className="card flex items-start gap-4">
            <div
              className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl ${meta.tone}`}
            >
              {meta.icon({ size: 18 })}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">
                {meta.describe(event)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
                <span>{formatTimestamp(event.timestamp)}</span>
                <a
                  href={`https://sepolia.basescan.org/tx/${event.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-ink-muted hover:text-accent"
                >
                  Lihat di Basescan
                  <ExternalIcon size={12} />
                </a>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
