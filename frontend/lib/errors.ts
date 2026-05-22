type ErrorMap = Record<string, string>;

const CONTRACT_ERRORS: ErrorMap = {
  SlotFull: "Arisan ini sudah penuh. Minta organizer buat grup baru.",
  AlreadyPaid: "Kamu sudah bayar untuk periode ini.",
  InsufficientUSDC: "Saldo USDC-mu kurang untuk membayar iuran ini.",
  DeadlineNotReached: "Periode belum berakhir. Coba lagi setelah deadline.",
  NotMember: "Address ini tidak terdaftar di arisan ini.",
  StateNotOpen: "Arisan sudah berjalan, tidak bisa join lagi.",
  StateNotActive: "Arisan belum aktif atau sudah selesai.",
  AlreadyTriggered: "Periode ini sudah di-trigger dan menunggu hasil VRF.",
  NoClaimable: "Tidak ada dana yang bisa diklaim saat ini.",
};

export function translateError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Terjadi kesalahan tidak diketahui.";

  for (const key of Object.keys(CONTRACT_ERRORS)) {
    if (msg.includes(key)) return CONTRACT_ERRORS[key];
  }

  if (msg.toLowerCase().includes("user rejected")) {
    return "Transaksi dibatalkan dari wallet.";
  }
  if (msg.toLowerCase().includes("insufficient funds")) {
    return "Saldo gas (ETH) tidak cukup untuk transaksi ini.";
  }
  return msg.slice(0, 160);
}
