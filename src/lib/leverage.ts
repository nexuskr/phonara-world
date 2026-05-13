/**
 * Cosmic Emperor V3 — Leverage Gate
 * Server-truth mirror. The authoritative source is RPC `get_my_max_leverage`,
 * but we mirror the formula here so UI can clamp instantly.
 *
 * Formula:
 *   base = phon ≥5000→100 | ≥1200→50 | ≥500→25 | else→10
 *   final = floor(base * (1 + min(boost_pct,100)/100))
 */

export function basePhonLeverage(phon: number): number {
  if (phon >= 5000) return 100;
  if (phon >= 1200) return 50;
  if (phon >= 500) return 25;
  return 10;
}

export function getMaxLeverageClient(phon: number, boostPct: number): number {
  const base = basePhonLeverage(phon);
  const cap = Math.min(100, Math.max(0, boostPct));
  return Math.floor(base * (1 + cap / 100));
}

export const LEVERAGE_GATES: Array<{ x: number; phon: number; label: string }> = [
  { x: 25, phon: 500, label: "BRONZE" },
  { x: 50, phon: 1200, label: "GOLD" },
  { x: 100, phon: 5000, label: "DIAMOND" },
];
