import { formatUnits } from "viem";
import { USDC_DECIMALS } from "./contracts";

export function formatUSDC(value: bigint | string | number): string {
  const v = typeof value === "bigint" ? value : BigInt(value);
  const decimal = formatUnits(v, USDC_DECIMALS);
  const [whole, fraction = ""] = decimal.split(".");
  const wholeFormatted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (!fraction || fraction.replace(/0+$/, "") === "") return wholeFormatted;
  return `${wholeFormatted},${fraction.slice(0, 2)}`;
}

export function shortAddress(address?: string | null): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "Sudah lewat";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${minutes} mnt`;
  return `${minutes} menit`;
}

export function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateBlockie(address?: string | null): string {
  if (!address) return "linear-gradient(135deg, #1DB954, #0E1411)";
  const hash = address.toLowerCase().replace(/[^0-9a-f]/g, "");
  const c1 = `#${hash.slice(2, 8)}`;
  const c2 = `#${hash.slice(10, 16)}`;
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}
