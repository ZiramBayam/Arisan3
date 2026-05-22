import type { ArisanState } from "@/lib/api";

const STATE_META: Record<ArisanState, { label: string; className: string }> = {
  OPEN: {
    label: "Menerima anggota",
    className: "bg-warn/10 text-warn",
  },
  ACTIVE: {
    label: "Aktif",
    className: "bg-accent-50 text-accent-600",
  },
  COMPLETED: {
    label: "Selesai",
    className: "bg-prime-300 text-ink-muted",
  },
};

export function StateBadge({ state }: { state: ArisanState }) {
  const meta = STATE_META[state];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  );
}
