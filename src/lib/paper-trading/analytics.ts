import type { Position } from "./types";

export interface EquityPoint {
  t: number;
  equity: number;
  pnl: number;
}

const STARTING_CREDIT = 10_000;

/** Builds equity curve from chronological closed history. */
export function buildEquityCurve(history: Position[], start = STARTING_CREDIT): EquityPoint[] {
  const ordered = [...history]
    .filter((h) => h.closed)
    .sort((a, b) => (a.closed!.at) - (b.closed!.at));
  const out: EquityPoint[] = [{ t: ordered[0]?.closed?.at ? ordered[0].closed.at - 1 : Date.now(), equity: start, pnl: 0 }];
  let eq = start;
  for (const h of ordered) {
    eq += h.closed!.pnl;
    out.push({ t: h.closed!.at, equity: eq, pnl: h.closed!.pnl });
  }
  return out;
}

export interface RiskMetrics {
  peak: number;
  trough: number;
  maxDrawdown: number;
  maxDrawdownPct: number;
  profitFactor: number;
  sharpe: number;
  winStreak: number;
  lossStreak: number;
  currentStreak: number;
  bestWinStreak: number;
}

export function computeRiskMetrics(history: Position[]): RiskMetrics {
  const closed = history.filter((h) => h.closed).sort((a, b) => a.closed!.at - b.closed!.at);
  let peak = STARTING_CREDIT;
  let trough = STARTING_CREDIT;
  let maxDD = 0;
  let eq = STARTING_CREDIT;
  let grossWin = 0;
  let grossLoss = 0;
  const returns: number[] = [];
  let curStreak = 0;
  let bestWinStreak = 0;
  let bestLossStreak = 0;

  for (const h of closed) {
    const pnl = h.closed!.pnl;
    eq += pnl;
    if (eq > peak) { peak = eq; trough = eq; }
    if (eq < trough) trough = eq;
    const dd = peak - eq;
    if (dd > maxDD) maxDD = dd;
    if (pnl > 0) grossWin += pnl;
    else grossLoss += -pnl;
    returns.push(pnl / h.margin);

    if (pnl > 0) {
      curStreak = curStreak >= 0 ? curStreak + 1 : 1;
      if (curStreak > bestWinStreak) bestWinStreak = curStreak;
    } else if (pnl < 0) {
      curStreak = curStreak <= 0 ? curStreak - 1 : -1;
      if (-curStreak > bestLossStreak) bestLossStreak = -curStreak;
    }
  }

  const mean = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const variance = returns.length ? returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length : 0;
  const std = Math.sqrt(variance);
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(returns.length) : 0;

  return {
    peak,
    trough,
    maxDrawdown: maxDD,
    maxDrawdownPct: peak > 0 ? (maxDD / peak) * 100 : 0,
    profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0,
    sharpe,
    winStreak: curStreak > 0 ? curStreak : 0,
    lossStreak: curStreak < 0 ? -curStreak : 0,
    currentStreak: curStreak,
    bestWinStreak,
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  unlocked: boolean;
  progress?: number; // 0..1
}

export function computeAchievements(history: Position[], paperCredit: number): Achievement[] {
  const closed = history.filter((h) => h.closed);
  const wins = closed.filter((h) => (h.closed?.pnl ?? 0) > 0);
  const totalPnl = closed.reduce((s, h) => s + (h.closed?.pnl ?? 0), 0);
  const best = closed.reduce((m, h) => Math.max(m, h.closed?.pnl ?? 0), 0);
  const metrics = computeRiskMetrics(history);
  const liquidations = closed.filter((h) => h.closed?.reason === "liquidation").length;
  const high100x = closed.filter((h) => h.leverage >= 100).length;
  const symbols = new Set(closed.map((h) => h.symbol));

  return [
    { id: "first-blood", name: "First Blood", emoji: "🩸", description: "첫 트레이드 종료", unlocked: closed.length >= 1, progress: Math.min(1, closed.length) },
    { id: "first-win", name: "First Win", emoji: "🥇", description: "첫 수익 트레이드", unlocked: wins.length >= 1, progress: Math.min(1, wins.length) },
    { id: "streak-3", name: "Hot Hand", emoji: "🔥", description: "3연승 달성", unlocked: metrics.bestWinStreak >= 3, progress: Math.min(1, metrics.bestWinStreak / 3) },
    { id: "streak-5", name: "Unstoppable", emoji: "⚡", description: "5연승 달성", unlocked: metrics.bestWinStreak >= 5, progress: Math.min(1, metrics.bestWinStreak / 5) },
    { id: "streak-10", name: "Legendary", emoji: "👑", description: "10연승 달성", unlocked: metrics.bestWinStreak >= 10, progress: Math.min(1, metrics.bestWinStreak / 10) },
    { id: "huge-win", name: "Whale Hunter", emoji: "🐋", description: "단일 트레이드 +500 USDT", unlocked: best >= 500, progress: Math.min(1, best / 500) },
    { id: "mega-win", name: "Empire Maker", emoji: "🏛️", description: "단일 트레이드 +2,000 USDT", unlocked: best >= 2000, progress: Math.min(1, best / 2000) },
    { id: "stack-15k", name: "Stacker", emoji: "💰", description: "Paper Credit 15,000 돌파", unlocked: paperCredit >= 15_000, progress: Math.min(1, paperCredit / 15_000) },
    { id: "stack-25k", name: "Tycoon", emoji: "💎", description: "Paper Credit 25,000 돌파", unlocked: paperCredit >= 25_000, progress: Math.min(1, paperCredit / 25_000) },
    { id: "max-lev", name: "Adrenaline", emoji: "🚀", description: "100× 레버리지 사용", unlocked: high100x >= 1, progress: Math.min(1, high100x) },
    { id: "diversify", name: "Globalist", emoji: "🌐", description: "5종 이상 심볼 트레이딩", unlocked: symbols.size >= 5, progress: Math.min(1, symbols.size / 5) },
    { id: "survivor", name: "Survivor", emoji: "🛡️", description: "청산 없이 10트레이드", unlocked: closed.length >= 10 && liquidations === 0, progress: Math.min(1, closed.length / 10) },
    { id: "comeback", name: "Comeback Kid", emoji: "🔄", description: "MDD 후 신고점 회복", unlocked: metrics.maxDrawdown > 100 && paperCredit >= metrics.peak, progress: metrics.peak > 0 ? Math.min(1, paperCredit / metrics.peak) : 0 },
    { id: "century", name: "Century Club", emoji: "💯", description: "100 트레이드 종료", unlocked: closed.length >= 100, progress: Math.min(1, closed.length / 100) },
    { id: "profit-1k", name: "Capitalist", emoji: "📈", description: "누적 +1,000 USDT", unlocked: totalPnl >= 1000, progress: Math.min(1, totalPnl / 1000) },
  ];
}
