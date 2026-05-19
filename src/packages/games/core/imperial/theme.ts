/**
 * Imperial theme tokens — HSL strings only (never raw hex in components).
 * Deep Black + Imperial Gold + Pink accents, shared by all 7 games.
 */
export const IMPERIAL = {
  goldH: 45,
  pinkH: 340,
  bg: "hsl(260, 50%, 6%)",
  bgDeep: "hsla(340, 60%, 4%, 1)",
  goldStroke: "hsla(45, 95%, 60%, 0.9)",
  goldSoft: "hsla(45, 80%, 60%, 0.06)",
  pinkStroke: "hsla(340, 95%, 65%, 1)",
  shock: "hsla(0, 85%, 55%, 0.9)",
  emerald: "hsla(150, 70%, 55%, 0.9)",
  violet: "hsla(280, 80%, 65%, 0.9)",
} as const;

export function hueForMultiplier(m: number) {
  if (m >= 10) return IMPERIAL.pinkH;
  if (m >= 3) return 30;
  return IMPERIAL.goldH;
}

export function toneClassForMult(m: number): string {
  if (m >= 10) return "text-[hsl(var(--pink))]";
  if (m >= 3) return "text-orange-400";
  return "text-[hsl(var(--gold))]";
}
