import type { Mode } from "./types";

/** Fixed display reference rate (UI only — server math is unit-agnostic). */
export const KRW_PER_USDT = 1400;

export type Unit = "USDT" | "KRW";

export const unitForMode = (m: Mode): Unit => (m === "real" ? "KRW" : "USDT");

export function fmtMoney(n: number, unit: Unit, opts?: { sign?: boolean; decimals?: number }) {
  const sign = opts?.sign && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  if (unit === "KRW") {
    return `${n < 0 ? "-" : sign}₩${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  const d = opts?.decimals ?? 2;
  return `${n < 0 ? "-" : sign}${abs.toLocaleString(undefined, { maximumFractionDigits: d })} USDT`;
}

/** Approximate cross-display: convert one unit to the other for the small subtitle. */
export function approxCross(n: number, from: Unit): { value: number; unit: Unit } {
  if (from === "KRW") return { value: n / KRW_PER_USDT, unit: "USDT" };
  return { value: n * KRW_PER_USDT, unit: "KRW" };
}
