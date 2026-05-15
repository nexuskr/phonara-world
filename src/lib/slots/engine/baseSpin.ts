// Base 5x3 spin computation — line-based pays.
// Shared across all 7 games. Bonus mechanics are computed separately.

import type { GameConfig } from "./types";

export type RNG = () => number;

const PAYLINES: ReadonlyArray<readonly [number, number, number, number, number]> = [
  // Top row, mid row, bot row, V, ^
  [0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  // Diagonals
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
];

export const WILD_IDX = 9;
export const SCATTER_IDX = 10;

export function pickWeighted(weights: readonly number[], rng: RNG): number {
  let total = 0;
  for (const w of weights) total += w;
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

export function rollGrid(cfg: GameConfig, rng: RNG): number[][] {
  const grid: number[][] = [];
  for (let row = 0; row < cfg.rows; row++) {
    const r: number[] = [];
    for (let col = 0; col < cfg.reels; col++) {
      r.push(pickWeighted(cfg.symbolWeights, rng));
    }
    grid.push(r);
  }
  return grid;
}

export function evalLines(cfg: GameConfig, grid: number[][]): {
  win: number;     // multiplier on bet
  scatterCount: number;
} {
  let win = 0;
  for (const line of PAYLINES) {
    // gather symbols left-to-right
    const seq: number[] = [];
    for (let c = 0; c < cfg.reels; c++) seq.push(grid[line[c]][c]);

    // ignore SCATTER on lines (it pays on count anywhere)
    if (seq.some((s) => s === SCATTER_IDX)) continue;

    // determine the "anchor" symbol: first non-wild, else wild itself
    let anchor = seq[0];
    if (anchor === WILD_IDX) {
      for (const s of seq) {
        if (s !== WILD_IDX) {
          anchor = s;
          break;
        }
      }
    }

    let matchLen = 0;
    for (let i = 0; i < seq.length; i++) {
      if (seq[i] === anchor || seq[i] === WILD_IDX) matchLen++;
      else break;
    }

    if (matchLen >= 3) {
      const row = cfg.paytable[anchor];
      if (row && row[matchLen - 3] != null) {
        win += row[matchLen - 3];
      }
    }
  }

  // scatter count anywhere
  let scatterCount = 0;
  for (let r = 0; r < cfg.rows; r++)
    for (let c = 0; c < cfg.reels; c++)
      if (grid[r][c] === SCATTER_IDX) scatterCount++;

  return { win, scatterCount };
}
