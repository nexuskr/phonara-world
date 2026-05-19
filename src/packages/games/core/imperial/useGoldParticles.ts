/**
 * useGoldParticles — GC-free particle pool for Imperial canvases.
 * Default 128-particle ring buffer. Caller owns rAF.
 */
import { useRef } from "react";

export interface GoldParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  hue: number;
  alpha: number;
}

function makePool(size: number): GoldParticle[] {
  return Array.from({ length: size }, () => ({
    x: 0, y: 0, vx: 0, vy: 0,
    life: 0, maxLife: 1, size: 1, hue: 45, alpha: 1,
  }));
}

export function useGoldParticles(size = 128) {
  const poolRef = useRef<GoldParticle[]>(makePool(size));
  const cursorRef = useRef(0);

  const spawn = (x: number, y: number, opts: Partial<GoldParticle> = {}) => {
    const arr = poolRef.current;
    const p = arr[cursorRef.current];
    cursorRef.current = (cursorRef.current + 1) % arr.length;
    p.x = x; p.y = y;
    p.vx = opts.vx ?? (Math.random() - 0.5) * 2;
    p.vy = opts.vy ?? -1 - Math.random() * 2;
    p.life = 0;
    p.maxLife = opts.maxLife ?? 30 + Math.random() * 30;
    p.size = opts.size ?? 1.4 + Math.random() * 2.2;
    p.hue = opts.hue ?? 45;
    p.alpha = opts.alpha ?? 0.8;
  };

  const step = (ctx: CanvasRenderingContext2D, dpr: number) => {
    const arr = poolRef.current;
    for (const p of arr) {
      if (p.life >= p.maxLife) continue;
      p.life += 1;
      p.x += p.vx * dpr;
      p.y += p.vy * dpr;
      const lr = 1 - p.life / p.maxLife;
      ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${lr * p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * dpr * lr, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const reset = () => {
    for (const p of poolRef.current) p.life = p.maxLife;
  };

  return { spawn, step, reset, pool: poolRef };
}
