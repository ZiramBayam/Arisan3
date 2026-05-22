export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`card ${accent ? "border-accent/30 bg-accent-50" : ""}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </div>
      <div
        className={`mt-2 font-display text-2xl font-semibold ${
          accent ? "text-accent-600" : "text-ink"
        }`}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-ink-subtle">{hint}</div>
      ) : null}
    </div>
  );
}
