// Deterministic decomposer — split a server-decided total multiplier into
// `n` story-friendly pieces that visually sum/multiply to the same total.
// Used so client cinematics (sticky cells, coins, picks…) line up with the
// server payout to the exact PHON.

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Split `total` into `n` positive pieces whose sum === total (rounded to 0.01). */
export function splitSum(total: number, n: number, seed = 1): number[] {
  if (n <= 0) return [];
  if (n === 1) return [total];
  const rnd = mulberry32(seed);
  const weights = Array.from({ length: n }, () => 0.4 + rnd() * 1.6);
  const ws = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / ws) * total);
  const rounded = raw.map((v) => Math.round(v * 100) / 100);
  // Fix rounding drift on the last bucket
  const drift = total - rounded.reduce((a, b) => a + b, 0);
  rounded[n - 1] = Math.round((rounded[n - 1] + drift) * 100) / 100;
  return rounded;
}

/** Pick `count` distinct indices in [0,total) deterministically. */
export function pickCells(total: number, count: number, seed = 1): number[] {
  const rnd = mulberry32(seed);
  const pool = Array.from({ length: total }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, total)).sort((a, b) => a - b);
}

export { mulberry32 };
