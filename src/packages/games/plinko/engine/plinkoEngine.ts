/**
 * Imperial Plinko Engine — Verlet-style integration with analytical
 * pin collision response. 64-ball object pool capacity, single rAF.
 */
import type { PlinkoBall, PlinkoRow } from "../types";

export const GRAVITY = 0.32;
export const FRICTION = 0.992;
export const PIN_RADIUS = 4;
export const BALL_RADIUS = 5;
export const ROW_GAP = 32;
export const COL_GAP = 32;

let __nextId = 1;

export function makeBall(centerX: number, topY: number): PlinkoBall {
  return {
    id: __nextId++,
    x: centerX + (Math.random() - 0.5) * 2,
    y: topY,
    vx: (Math.random() - 0.5) * 0.4,
    vy: 0,
    bin: -1,
    row: 0,
    done: false,
    trail: [],
  };
}

export interface PinGrid {
  rows: PlinkoRow;
  pinSpacingX: number;
  pinSpacingY: number;
  topY: number;
  centerX: number;
  /** computed pin positions, row-major */
  pins: Array<{ x: number; y: number; row: number; col: number }>;
}

export function buildPinGrid(rows: PlinkoRow, w: number, h: number): PinGrid {
  // Triangle of pins: row r has (r+3) pins, 0-indexed.
  const bottomCount = rows + 3;
  const usableW = w * 0.78;
  const pinSpacingX = usableW / (bottomCount - 1);
  const pinSpacingY = (h * 0.74) / rows;
  const topY = h * 0.12;
  const centerX = w / 2;
  const pins: PinGrid["pins"] = [];
  for (let r = 0; r < rows; r++) {
    const count = r + 3;
    const rowY = topY + r * pinSpacingY;
    const startX = centerX - ((count - 1) * pinSpacingX) / 2;
    for (let c = 0; c < count; c++) {
      pins.push({ x: startX + c * pinSpacingX, y: rowY, row: r, col: c });
    }
  }
  return { rows, pinSpacingX, pinSpacingY, topY, centerX, pins };
}

/** Advance one ball one tick. Returns true if ball just settled. */
export function stepBall(b: PlinkoBall, grid: PinGrid, w: number, h: number, dpr: number): boolean {
  if (b.done) return false;
  b.vy += GRAVITY * dpr;
  b.vx *= FRICTION;
  b.x += b.vx;
  b.y += b.vy;

  // Trail (last 12 positions)
  b.trail.push([b.x, b.y]);
  if (b.trail.length > 12) b.trail.shift();

  const ballR = BALL_RADIUS * dpr;
  const pinR = PIN_RADIUS * dpr;
  const minDist = ballR + pinR;
  const minDistSq = minDist * minDist;

  // Restrict pin checks to current row band
  const rowGuess = Math.max(0, Math.min(grid.rows - 1,
    Math.floor((b.y - grid.topY * dpr) / (grid.pinSpacingY * dpr))));
  for (let r = Math.max(0, rowGuess - 1); r <= Math.min(grid.rows - 1, rowGuess + 1); r++) {
    const count = r + 3;
    const startIdx = (r * (r + 5)) / 2; // 3+4+...+(r+2)
    for (let c = 0; c < count; c++) {
      const p = grid.pins[startIdx + c];
      if (!p) continue;
      const px = p.x * dpr;
      const py = p.y * dpr;
      const dx = b.x - px;
      const dy = b.y - py;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        const nx = dx / d;
        const ny = dy / d;
        // Push out
        const overlap = minDist - d;
        b.x += nx * overlap;
        b.y += ny * overlap;
        // Reflect velocity with damping
        const vDotN = b.vx * nx + b.vy * ny;
        b.vx -= 2 * vDotN * nx * 0.55;
        b.vy -= 2 * vDotN * ny * 0.55;
        // Add tiny lateral randomness for realism
        b.vx += (Math.random() - 0.5) * 0.3 * dpr;
        b.row = Math.max(b.row, r);
      }
    }
  }

  // Wall bounds
  const margin = 8 * dpr;
  if (b.x < margin) { b.x = margin; b.vx = Math.abs(b.vx) * 0.6; }
  if (b.x > w - margin) { b.x = w - margin; b.vx = -Math.abs(b.vx) * 0.6; }

  // Settle when below bins
  const settleY = grid.topY * dpr + grid.rows * grid.pinSpacingY * dpr + 20 * dpr;
  if (b.y > settleY) {
    b.done = true;
    // Bin index: bottom row has (rows + 3) pins → (rows + 2) gaps,
    // i.e. (rows + 2) bins ... actually we use (rows + 1) bins by collapsing edges to ends.
    const binCount = grid.rows + 1;
    const usableW = grid.pinSpacingX * (binCount - 1);
    const startX = (grid.centerX - usableW / 2) * dpr;
    const rel = (b.x - startX) / (grid.pinSpacingX * dpr);
    b.bin = Math.max(0, Math.min(binCount - 1, Math.round(rel)));
    return true;
  }
  return false;
}

/** Deterministic seed → final bin (uses PF nonce). */
export function deriveBinFromSeed(seed: string, nonce: number, binCount: number): number {
  // Simple hash: sum char codes + nonce, then mod.
  let h = nonce | 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  // Bias toward center via triangular distribution
  const r1 = Math.abs(h) / 2147483647;
  const r2 = (Math.abs(h ^ (h >>> 16)) % 1000) / 1000;
  const tri = (r1 + r2) / 2;
  return Math.floor(tri * binCount);
}
