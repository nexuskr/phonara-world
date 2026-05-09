import type { Position, Side } from "./types";

export function computeSize(margin: number, leverage: number, entry: number): number {
  if (entry <= 0) return 0;
  return (margin * leverage) / entry;
}

export function computePnl(p: Position, price: number): number {
  const size = computeSize(p.margin, p.leverage, p.entry);
  const dir = p.side === "long" ? 1 : -1;
  return (price - p.entry) * size * dir;
}

export function computeRoi(p: Position, price: number): number {
  if (p.margin <= 0) return 0;
  return computePnl(p, price) / p.margin;
}

/** Liquidation price where roi == -1 (margin fully eaten). */
export function liquidationPrice(side: Side, entry: number, leverage: number): number {
  if (leverage <= 0) return 0;
  const drop = entry / leverage;
  return side === "long" ? Math.max(0, entry - drop) : entry + drop;
}

/** ROI threshold: -1 (= -100%) → liquidation. */
export function isLiquidated(p: Position, price: number): boolean {
  return computeRoi(p, price) <= -1;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
