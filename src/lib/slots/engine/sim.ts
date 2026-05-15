// Pure simulation harness — Node + browser safe.

import type { GameConfig, SimReport } from "./types";
import { evalLines, rollGrid, type RNG } from "./baseSpin";
import { runBonus } from "./mechanics";

// xorshift32 deterministic RNG
export function makeRng(seed: number): RNG {
  let s = seed >>> 0 || 0xdeadbeef;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return (s >>> 0) / 0xffffffff;
  };
}

export function simulate(cfg: GameConfig, rounds: number, seed = 1): SimReport {
  const rng = makeRng(seed);
  let totalBet = 0;
  let baseWin = 0;
  let bonusWin = 0;
  let bonusCount = 0;
  let big = 0, ultra = 0, maxX = 0;

  // estimate base hit profile in a quick pre-pass for sticky_multi & three_path
  const preRng = makeRng(seed ^ 0xa5a5a5a5);
  let preHits = 0, preHitSum = 0;
  const PRE = 5000;
  for (let i = 0; i < PRE; i++) {
    const g = rollGrid(cfg, preRng);
    const r = evalLines(cfg, g);
    if (r.win > 0) { preHits++; preHitSum += r.win; }
  }
  const baseHitChance = preHits / PRE;
  const baseAvgHitX = preHits > 0 ? preHitSum / preHits : 1;

  for (let i = 0; i < rounds; i++) {
    totalBet += 1;
    const grid = rollGrid(cfg, rng);
    const { win, scatterCount } = evalLines(cfg, grid);
    let roundWin = win;
    baseWin += win;

    if (scatterCount >= cfg.scatterTrigger) {
      bonusCount++;
      let bw = runBonus(cfg.bonus, { baseHitChance, baseAvgHitX }, rng);
      // hard cap to declared max
      if (bw > cfg.maxMultiplier) bw = cfg.maxMultiplier;
      bonusWin += bw;
      roundWin += bw;
    }

    if (roundWin > maxX) maxX = roundWin;
    if (roundWin >= 100) big++;
    if (roundWin >= 1000) ultra++;
  }

  return {
    game: cfg.code,
    rounds,
    rtp: (baseWin + bonusWin) / totalBet,
    baseRtp: baseWin / totalBet,
    bonusRtp: bonusWin / totalBet,
    bonusHitFreq: bonusCount > 0 ? rounds / bonusCount : Infinity,
    maxObservedX: maxX,
    bigWinRate: big / rounds,
    ultraWinRate: ultra / rounds,
  };
}

export function formatReport(r: SimReport): string {
  return [
    `${r.game.padEnd(22)}`,
    `RTP=${(r.rtp * 100).toFixed(2)}%`,
    `(base ${(r.baseRtp * 100).toFixed(1)}% + bonus ${(r.bonusRtp * 100).toFixed(1)}%)`,
    `bonus 1/${r.bonusHitFreq.toFixed(0)}`,
    `MAX=${r.maxObservedX.toFixed(1)}x`,
    `≥100x ${(r.bigWinRate * 100).toFixed(2)}%`,
    `≥1000x ${(r.ultraWinRate * 100).toFixed(3)}%`,
  ].join(" | ");
}
