"use client";

import Link from "next/link";
import type { ArisanDetail } from "@/lib/api";
import { formatUSDC } from "@/lib/format";

type Action =
  | { kind: "connect"; label: string }
  | { kind: "join"; label: string; href: string }
  | { kind: "pay"; label: string; onClick: () => void }
  | { kind: "claim"; label: string; amount: bigint; onClick: () => void }
  | { kind: "trigger"; label: string; onClick: () => void }
  | { kind: "wait"; label: string }
  | { kind: "done"; label: string };

export function ActionButton({
  arisan,
  isConnected,
  viewer,
  claimableAmount = 0n,
  onPay,
  onClaim,
  onTrigger,
}: {
  arisan: ArisanDetail;
  isConnected: boolean;
  viewer?: string;
  claimableAmount?: bigint;
  onPay?: () => void;
  onClaim?: () => void;
  onTrigger?: () => void;
}) {
  const action = resolveAction({
    arisan,
    isConnected,
    viewer,
    claimableAmount,
    onPay: onPay ?? noop,
    onClaim: onClaim ?? noop,
    onTrigger: onTrigger ?? noop,
  });

  if (action.kind === "connect") {
    return (
      <button type="button" disabled className="btn-primary w-full">
        {action.label}
      </button>
    );
  }
  if (action.kind === "join") {
    return (
      <Link href={action.href} className="btn-primary w-full">
        {action.label}
      </Link>
    );
  }
  if (action.kind === "wait" || action.kind === "done") {
    return (
      <button type="button" disabled className="btn-secondary w-full">
        {action.label}
      </button>
    );
  }
  if (action.kind === "claim") {
    return (
      <button
        type="button"
        onClick={action.onClick}
        className="btn-primary w-full"
      >
        Claim {formatUSDC(action.amount)} USDC
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={action.onClick}
      className="btn-primary w-full"
    >
      {action.label}
    </button>
  );
}

function noop() {}

function resolveAction({
  arisan,
  isConnected,
  viewer,
  claimableAmount,
  onPay,
  onClaim,
  onTrigger,
}: {
  arisan: ArisanDetail;
  isConnected: boolean;
  viewer?: string;
  claimableAmount: bigint;
  onPay: () => void;
  onClaim: () => void;
  onTrigger: () => void;
}): Action {
  if (!isConnected || !viewer) {
    return { kind: "connect", label: "Hubungkan wallet untuk lanjut" };
  }
  if (claimableAmount > 0n) {
    return {
      kind: "claim",
      label: "Claim Pool",
      amount: claimableAmount,
      onClick: onClaim,
    };
  }
  if (arisan.state === "COMPLETED") {
    return { kind: "done", label: "Arisan selesai" };
  }

  const me = viewer.toLowerCase();
  const isMember = arisan.members.some((m) => m.address.toLowerCase() === me);

  if (arisan.state === "OPEN") {
    if (isMember)
      return { kind: "wait", label: "Menunggu slot terisi penuh" };
    return { kind: "join", label: "Join Arisan", href: `/join/${arisan.id}` };
  }

  const member = arisan.members.find((m) => m.address.toLowerCase() === me);
  const now = Math.floor(Date.now() / 1000);
  if (now >= arisan.periodDeadline) {
    return { kind: "trigger", label: "Trigger Undian Periode", onClick: onTrigger };
  }
  if (member && !member.paidThisPeriod) {
    return {
      kind: "pay",
      label: `Bayar Iuran Periode ${arisan.currentPeriod + 1}`,
      onClick: onPay,
    };
  }
  return { kind: "wait", label: "Menunggu periode berikutnya" };
}
