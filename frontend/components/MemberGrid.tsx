import type { ArisanMember } from "@/lib/api";
import { generateBlockie, shortAddress } from "@/lib/format";
import { CheckIcon } from "./icons";

export function MemberGrid({
  members,
  maxMembers,
  highlightAddress,
}: {
  members: ArisanMember[];
  maxMembers: number;
  highlightAddress?: string;
}) {
  const slots = Array.from({ length: maxMembers }, (_, i) => {
    return members.find((m) => m.slotIndex === i) ?? null;
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((member, idx) => {
        if (!member) {
          return (
            <div
              key={`empty-${idx}`}
              className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 bg-prime/60 text-xs text-ink-subtle"
            >
              <span className="text-2xl font-light text-ink-subtle">+</span>
              Slot {idx + 1} kosong
            </div>
          );
        }
        const isYou =
          highlightAddress &&
          member.address.toLowerCase() === highlightAddress.toLowerCase();
        return (
          <div
            key={member.address}
            className={`flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border bg-prime-100 p-3 text-center transition ${
              isYou
                ? "border-accent shadow-ring"
                : "border-ink/5 shadow-soft"
            }`}
          >
            <div
              className="h-10 w-10 rounded-full ring-2 ring-prime"
              style={{ background: generateBlockie(member.address) }}
            />
            <div className="text-xs font-semibold text-ink">
              {isYou ? "Kamu" : shortAddress(member.address)}
            </div>
            {member.paidThisPeriod ? (
              <span className="chip-accent">
                <CheckIcon size={12} />
                Sudah bayar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-prime-300 px-3 py-1 text-xs font-semibold text-warn">
                Belum bayar
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
