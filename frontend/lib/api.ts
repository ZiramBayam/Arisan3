const INDEXER_URL =
  process.env.NEXT_PUBLIC_INDEXER_URL ?? "http://localhost:42069";

export type ArisanState = "OPEN" | "ACTIVE" | "COMPLETED";

export type ArisanMember = {
  address: string;
  slotIndex: number;
  paidThisPeriod: boolean;
};

export type WinnerRecord = {
  period: number;
  winner: string;
  amount: string;
};

export type ArisanDetail = {
  id: string;
  name?: string;
  state: ArisanState;
  currentPeriod: number;
  iuranAmount: string;
  periodDeadline: number;
  maxMembers: number;
  organizer: string;
  members: ArisanMember[];
  winnerHistory: WinnerRecord[];
};

export type EventLogItem = {
  id: string;
  type:
    | "ArisanCreated"
    | "MemberJoined"
    | "ArisanStarted"
    | "IuranDeposited"
    | "RandomnessRequested"
    | "WinnerSelected"
    | "FundsClaimed";
  arisanId?: string;
  actor?: string;
  period?: number;
  amount?: string;
  txHash: string;
  timestamp: number;
};

export type PortfolioItem = {
  arisanId: string;
  name?: string;
  state: ArisanState;
  role: "ORGANIZER" | "MEMBER";
  iuranAmount: string;
  currentPeriod: number;
  periodDeadline: number;
  totalContributed: string;
  paidThisPeriod: boolean;
};

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${INDEXER_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchArisan(id: string): Promise<ArisanDetail | null> {
  return safeFetch<ArisanDetail>(`/arisan/${id}`);
}

export async function fetchHistory(id: string): Promise<EventLogItem[]> {
  return (await safeFetch<EventLogItem[]>(`/arisan/${id}/history`)) ?? [];
}

export async function fetchPortfolio(
  address: string,
): Promise<PortfolioItem[]> {
  return (
    (await safeFetch<PortfolioItem[]>(`/wallet/${address}/portfolio`)) ?? []
  );
}
