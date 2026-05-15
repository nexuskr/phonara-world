// 7 distinct bonus mechanics. Each returns total bonus multiplier (× bet).
// All pure / deterministic given an RNG.

import type { BonusSpec } from "./types";
import { type RNG, pickWeighted } from "./baseSpin";

function pickWeightedT<T>(items: ReadonlyArray<readonly [T, number]>, rng: RNG): T {
  const weights = items.map(([, w]) => w);
  return items[pickWeighted(weights, rng)][0];
}

// ───────── 1. Cosmic Forge — Sticky Multiplier Constellation ─────────
// Free spins. Each spin a wild MAY land in an empty cell with a multiplier.
// Cells persist. Final payout = base spin wins × (sum of sticky mults, min 1).
function runStickyMulti(
  spec: Extract<BonusSpec, { kind: "sticky_multi" }>,
  baseHitChance: number,   // per-spin probability of any base hit
  baseAvgHitX: number,     // avg multiplier when a hit occurs
  rng: RNG,
): number {
  const cells: number[] = [];
  let win = 0;
  for (let s = 0; s < spec.spins; s++) {
    if (cells.length < spec.maxCells && rng() < spec.collectChance) {
      cells.push(pickWeightedT(spec.multWeights, rng));
    }
    if (rng() < baseHitChance) {
      const stickySum = cells.reduce((a, b) => a + b, 0) || 1;
      // exponential-ish base hit (bell around avg)
      const base = baseAvgHitX * (0.3 + rng() * 1.7);
      win += base * stickySum;
    }
  }
  return win;
}

// ───────── 2. Neon Tokyo 88 — Hold & Spin (Big Bass) ─────────
// 15 cells, start with 3 respins. Each spin coins land with values.
// Coin land RESETS respins to spec.respinReset. End when 0 respins or grid full.
function runHold88(
  spec: Extract<BonusSpec, { kind: "hold88" }>,
  rng: RNG,
): number {
  const filled = new Set<number>();
  let respins = spec.respinReset;
  let win = 0;
  while (respins > 0 && filled.size < spec.cells) {
    let coinsThisSpin = 0;
    for (let cell = 0; cell < spec.cells; cell++) {
      if (filled.has(cell)) continue;
      if (rng() < spec.coinChance) {
        const v = pickWeightedT(spec.coinWeights, rng);
        const value = v === "GRAND" ? spec.grandValue : v;
        win += value;
        filled.add(cell);
        coinsThisSpin++;
      }
    }
    if (coinsThisSpin > 0) respins = spec.respinReset;
    else respins--;
  }
  // full grid bonus = 2× current
  if (filled.size === spec.cells) win *= 2;
  return win;
}

// ───────── 3. Pirate's Curse — Crash Cannon ─────────
// Geometric crash. Sim auto-cashes at autoCashoutMult for fairness.
// EV = autoCashoutMult * P(survive past it).
function runCrashCannon(
  spec: Extract<BonusSpec, { kind: "crash_cannon" }>,
  rng: RNG,
): number {
  const target = spec.autoCashoutMult ?? 2.0;
  let mult = 1.0;
  let ticks = 0;
  while (mult < target) {
    if (rng() < spec.crashHazard) return 0; // crashed before cashout
    mult *= 1 + spec.growthPerTick;
    ticks++;
    if (ticks > 5000) break;
  }
  return target;
}

// ───────── 4. Pharaoh's Vault — Pick & Reveal + Jackpot ─────────
function runPickReveal(
  spec: Extract<BonusSpec, { kind: "pick_reveal" }>,
  rng: RNG,
): number {
  let picksLeft = spec.picks;
  let win = 0;
  while (picksLeft > 0) {
    picksLeft--;
    const prize = pickWeightedT(spec.prizeWeights, rng);
    if (prize === "STOP") break;
    if (prize === "MORE_PICKS") {
      picksLeft += spec.morePicksAdd;
      continue;
    }
    if (prize === "JACKPOT") {
      win += pickWeightedT(spec.jackpotWeights, rng);
      continue;
    }
    win += prize;
  }
  return win;
}

// ───────── 5. Viking Thunder — Three-Path Free Spins ─────────
// We sim equal selection across 3 paths to get fair RTP contribution.
function runThreePath(
  spec: Extract<BonusSpec, { kind: "three_path" }>,
  baseHitChance: number,
  baseAvgHitX: number,
  rng: RNG,
): number {
  const path = spec.paths[Math.floor(rng() * spec.paths.length)];
  let runningMult = path.startMult;
  let win = 0;
  for (let s = 0; s < path.spins; s++) {
    // wilds occur ~1.5x base hit during free spins
    const wildHit = rng() < baseHitChance * 1.5;
    if (wildHit) runningMult += path.wildBoostX;
    if (rng() < baseHitChance) {
      let bw = baseAvgHitX * (0.4 + rng() * 1.8) * runningMult;
      if (path.xbombChance && rng() < path.xbombChance) bw *= 5; // xbomb explosion
      win += bw;
    }
  }
  return win;
}

// ───────── 6. Aztec Sun — Cluster Tumble + Cell Multipliers ─────────
function runClusterTumble(
  spec: Extract<BonusSpec, { kind: "cluster_tumble" }>,
  rng: RNG,
): number {
  let win = 0;
  for (let s = 0; s < spec.spins; s++) {
    let chain = 0;
    let cellMult = 0;
    while (rng() < 0.55 - chain * 0.08) { // diminishing tumble chance
      const baseCluster = 0.5 + rng() * 4;
      const lvl = spec.cellMultLadder[Math.min(cellMult, spec.cellMultLadder.length - 1)];
      win += baseCluster * spec.tumbleClearMult * lvl;
      chain++;
      cellMult++;
      if (chain > 12) break;
    }
  }
  return win;
}

// ───────── 7. Cherry Sakura — Mission Trail ─────────
function runMissionTrail(
  spec: Extract<BonusSpec, { kind: "mission_trail" }>,
  rng: RNG,
): number {
  let pos = 0;
  let win = 0;
  const collected = new Set<number>();
  // capped roll budget — most bonuses don't reach 100
  for (let i = 0; i < 12 && pos < spec.steps; i++) {
    pos += pickWeightedT(spec.moveDistWeights, rng);
    if (pos > spec.steps) pos = spec.steps;
    for (const k of Object.keys(spec.checkpoints)) {
      const stepNum = Number(k);
      if (stepNum <= pos && !collected.has(stepNum)) {
        collected.add(stepNum);
        const r = spec.checkpoints[stepNum];
        win += typeof r === "number" ? r : 500; // jackpot fixed
      }
    }
  }
  return win;
}

export function runBonus(
  spec: BonusSpec,
  ctx: { baseHitChance: number; baseAvgHitX: number },
  rng: RNG,
): number {
  switch (spec.kind) {
    case "sticky_multi":
      return runStickyMulti(spec, ctx.baseHitChance, ctx.baseAvgHitX, rng);
    case "hold88":
      return runHold88(spec, rng);
    case "crash_cannon":
      return runCrashCannon(spec, rng);
    case "pick_reveal":
      return runPickReveal(spec, rng);
    case "three_path":
      return runThreePath(spec, ctx.baseHitChance, ctx.baseAvgHitX, rng);
    case "cluster_tumble":
      return runClusterTumble(spec, rng);
    case "mission_trail":
      return runMissionTrail(spec, rng);
  }
}
