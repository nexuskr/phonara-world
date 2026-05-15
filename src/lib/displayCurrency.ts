// Phonara — Display Currency Layer (FE only).
// Internal base = PHON. KRW/USDT are deposit/withdraw display layers.
// Anchored: 1 USDT = 1300 PHON (PhonaraPay), 1 USDT ≈ ₩1400 (trading display).
// All math is one-way conversion from a *known unit* — never settlement.
import { PHON_PER_USDT } from "@/lib/phonaraPay";
import { KRW_PER_USDT } from "@/lib/trading/currency";

export type DisplayCurrency = "KRW" | "USDT" | "PHON";

export const KRW_PER_PHON = KRW_PER_USDT / PHON_PER_USDT; // ≈ 1.077
export const PHON_PER_KRW = PHON_PER_USDT / KRW_PER_USDT;
export const USDT_PER_PHON = 1 / PHON_PER_USDT;

export const SYMBOL: Record<DisplayCurrency, string> = {
  KRW: "₩",
  USDT: "$",
  PHON: "Φ",
};

export const LABEL: Record<DisplayCurrency, string> = {
  KRW: "원화",
  USDT: "USDT",
  PHON: "PHON",
};

/** Convert any unit → any unit. */
export function convert(amount: number, from: DisplayCurrency, to: DisplayCurrency): number {
  if (from === to) return amount;
  // Normalize to PHON first
  let phon: number;
  if (from === "PHON") phon = amount;
  else if (from === "KRW") phon = amount * PHON_PER_KRW;
  else phon = amount * PHON_PER_USDT; // USDT
  // PHON → target
  if (to === "PHON") return phon;
  if (to === "KRW") return phon * KRW_PER_PHON;
  return phon * USDT_PER_PHON;
}

export function formatCurrency(
  amount: number,
  currency: DisplayCurrency,
  opts?: { decimals?: number; sign?: boolean; compact?: boolean }
): string {
  const sign = opts?.sign && amount > 0 ? "+" : "";
  const abs = Math.abs(amount);
  const neg = amount < 0 ? "-" : "";
  const decimals = opts?.decimals ?? (currency === "USDT" ? 2 : 0);
  const formatted = opts?.compact && abs >= 10_000
    ? new Intl.NumberFormat("ko", { notation: "compact", maximumFractionDigits: 1 }).format(abs)
    : abs.toLocaleString(undefined, { maximumFractionDigits: decimals });
  if (currency === "KRW") return `${neg}${sign}${SYMBOL.KRW}${formatted}`;
  if (currency === "USDT") return `${neg}${sign}${formatted} USDT`;
  return `${neg}${sign}${formatted} PHON`;
}

/** Format same PHON amount in any target currency. */
export function formatFromPhon(phonAmount: number, target: DisplayCurrency, opts?: Parameters<typeof formatCurrency>[2]) {
  return formatCurrency(convert(phonAmount, "PHON", target), target, opts);
}
