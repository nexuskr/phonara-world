/**
 * Imperial Roulette Engine — wheel spin physics with easeOut + micro bounce.
 * spinTo(result, durationMs) returns a function (t)=>angle for the wheel,
 * plus the ball's spiral path.
 */
import { WHEEL_ORDER } from "../types";

const POCKET_ANGLE = (Math.PI * 2) / WHEEL_ORDER.length;

export function angleForNumber(n: number): number {
  const idx = WHEEL_ORDER.indexOf(n);
  return idx * POCKET_ANGLE;
}

/**
 * Build a wheel angle interpolator: starts at angle 0, ends so that the
 * target pocket sits at the top marker. Adds 6 full revolutions for drama.
 */
export function makeWheelSpin(targetNumber: number, durationMs: number, startAngle = 0) {
  const finalAngle = -angleForNumber(targetNumber); // negate so wheel rotates CW
  const revs = Math.PI * 2 * 6;
  const total = revs + finalAngle - (startAngle % (Math.PI * 2));
  // easeOutQuart
  const ease = (t: number) => 1 - Math.pow(1 - t, 4);
  return (elapsedMs: number) => {
    const u = Math.min(1, elapsedMs / durationMs);
    let a = startAngle + total * ease(u);
    // micro bounce in last 8%
    if (u > 0.92) {
      const bouncePhase = ((u - 0.92) / 0.08) * Math.PI * 2 * 1.5;
      a += Math.sin(bouncePhase) * POCKET_ANGLE * 0.18 * (1 - u);
    }
    return a;
  };
}

/** Ball spiral: outer ring → inner pocket. Returns position in normalized 0..1 radius. */
export function ballSpiral(elapsedMs: number, durationMs: number) {
  const u = Math.min(1, elapsedMs / durationMs);
  const ease = 1 - Math.pow(1 - u, 3);
  const radius = 0.92 - 0.36 * ease;
  // Ball rotates opposite direction faster, then slows
  const angle = -Math.PI * 2 * 9 * ease;
  return { radius, angle, settled: u >= 1 };
}

export const ROULETTE_DURATION_MS = 5200;
