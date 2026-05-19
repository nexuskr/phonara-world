/**
 * ImperialPlinkoCanvas — Verlet ball physics + gold trail + bin glow.
 * 64-ball pool, viewport-pause aware, dpr cap 2.
 */
import { memo, useEffect, useImperativeHandle, useRef, forwardRef } from "react";
import { useViewportPause } from "@pkg/games/core";
import { useGoldParticles, hueForMultiplier } from "@pkg/games/core/imperial";
import {
  buildPinGrid, stepBall, makeBall, PIN_RADIUS, BALL_RADIUS,
  type PinGrid,
} from "../engine/plinkoEngine";
import type { PlinkoBall, PlinkoRow } from "../types";
import { PLINKO_MULTIPLIERS } from "../types";

export interface PlinkoCanvasHandle {
  /** Drop one ball; resolves with the settled bin index and multiplier. */
  drop: (opts?: { targetBin?: number }) => Promise<{ bin: number; mult: number }>;
  reset: () => void;
}

interface Props {
  rows: PlinkoRow;
  risk: "low" | "medium" | "high";
}

const POOL = 64;

function ImperialPlinkoCanvasImpl(
  { rows, risk }: Props,
  ref: React.Ref<PlinkoCanvasHandle>,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<PlinkoBall[]>([]);
  const gridRef = useRef<PinGrid | null>(null);
  const binFlashRef = useRef<Map<number, number>>(new Map());
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const settleResolversRef = useRef<Map<number, (v: { bin: number; mult: number }) => void>>(new Map());
  const { spawn: spawnParticle, step: stepParticles } = useGoldParticles(96);

  const { ref: pauseRef, paused } = useViewportPause<HTMLDivElement>();
  const visible = !paused;

  const mults = PLINKO_MULTIPLIERS[rows][risk];

  useImperativeHandle(ref, () => ({
    drop: async () => {
      const grid = gridRef.current;
      if (!grid) return { bin: 0, mult: 1 };
      const dpr = dprRef.current;
      const b = makeBall(grid.centerX * dpr, grid.topY * dpr - 20 * dpr);
      ballsRef.current.push(b);
      if (ballsRef.current.length > POOL) ballsRef.current.shift();
      return new Promise((resolve) => {
        settleResolversRef.current.set(b.id, resolve);
      });
    },
    reset: () => {
      ballsRef.current = [];
      binFlashRef.current.clear();
    },
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = wrap;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w: canvas.width, h: canvas.height };
      gridRef.current = buildPinGrid(rows, w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "hsla(260, 50%, 9%, 1)");
      bg.addColorStop(1, "hsla(340, 60%, 4%, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const grid = gridRef.current;
      if (!grid) {
        raf = requestAnimationFrame(draw);
        return;
      }

      // Pins (with subtle gold shine)
      for (const p of grid.pins) {
        const px = p.x * dpr;
        const py = p.y * dpr;
        ctx.fillStyle = "hsla(45, 90%, 55%, 0.85)";
        ctx.beginPath();
        ctx.arc(px, py, PIN_RADIUS * dpr, 0, Math.PI * 2);
        ctx.fill();
        // tiny highlight
        ctx.fillStyle = "hsla(50, 100%, 80%, 0.6)";
        ctx.beginPath();
        ctx.arc(px - 1.2 * dpr, py - 1.2 * dpr, 1 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bins at bottom
      const binCount = grid.rows + 1;
      const usableW = grid.pinSpacingX * (binCount - 1);
      const startX = (grid.centerX - usableW / 2) * dpr;
      const binW = (grid.pinSpacingX * dpr) * 0.86;
      const binY = (grid.topY + grid.rows * grid.pinSpacingY + 12) * dpr;
      const binH = 28 * dpr;
      for (let i = 0; i < binCount; i++) {
        const m = mults[Math.max(0, Math.min(mults.length - 1, i))] ?? 1;
        const hue = hueForMultiplier(m);
        const x = startX + i * grid.pinSpacingX * dpr - binW / 2;
        const flash = binFlashRef.current.get(i) ?? 0;
        const intensity = 0.18 + flash * 0.6;
        ctx.fillStyle = `hsla(${hue}, 95%, ${m >= 5 ? 60 : 50}%, ${intensity})`;
        ctx.strokeStyle = `hsla(${hue}, 95%, 70%, ${0.45 + flash * 0.5})`;
        ctx.lineWidth = (1 + flash * 1.6) * dpr;
        const r = 6 * dpr;
        ctx.beginPath();
        ctx.moveTo(x + r, binY);
        ctx.lineTo(x + binW - r, binY);
        ctx.quadraticCurveTo(x + binW, binY, x + binW, binY + r);
        ctx.lineTo(x + binW, binY + binH - r);
        ctx.quadraticCurveTo(x + binW, binY + binH, x + binW - r, binY + binH);
        ctx.lineTo(x + r, binY + binH);
        ctx.quadraticCurveTo(x, binY + binH, x, binY + binH - r);
        ctx.lineTo(x, binY + r);
        ctx.quadraticCurveTo(x, binY, x + r, binY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Label
        ctx.fillStyle = `hsla(${hue}, 95%, 80%, ${0.85 + flash * 0.15})`;
        ctx.font = `bold ${10 * dpr}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${m}x`, x + binW / 2, binY + binH / 2);
        // decay flash
        if (flash > 0) binFlashRef.current.set(i, Math.max(0, flash - 0.02));
      }

      // Balls + trails + collisions
      const balls = ballsRef.current;
      for (const b of balls) {
        // Trail
        for (let i = 0; i < b.trail.length; i++) {
          const [tx, ty] = b.trail[i];
          const alpha = (i / b.trail.length) * 0.35;
          ctx.fillStyle = `hsla(45, 95%, 65%, ${alpha})`;
          ctx.beginPath();
          ctx.arc(tx, ty, BALL_RADIUS * dpr * (i / b.trail.length), 0, Math.PI * 2);
          ctx.fill();
        }
        // Ball body
        const grad = ctx.createRadialGradient(b.x - 1.5 * dpr, b.y - 1.5 * dpr, 0.5 * dpr, b.x, b.y, BALL_RADIUS * dpr);
        grad.addColorStop(0, "hsla(50, 100%, 90%, 1)");
        grad.addColorStop(0.5, "hsla(45, 95%, 60%, 1)");
        grad.addColorStop(1, "hsla(35, 90%, 35%, 1)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS * dpr, 0, Math.PI * 2);
        ctx.fill();
        // Halo
        ctx.fillStyle = "hsla(45, 90%, 60%, 0.18)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_RADIUS * 2 * dpr, 0, Math.PI * 2);
        ctx.fill();

        const settled = stepBall(b, grid, W, H, dpr);
        if (settled) {
          const bin = b.bin;
          const m = mults[Math.max(0, Math.min(mults.length - 1, bin))] ?? 1;
          binFlashRef.current.set(bin, 1);
          // Particle burst
          const hue = hueForMultiplier(m);
          for (let i = 0; i < 18; i++) {
            spawnParticle(b.x, b.y, {
              vx: (Math.random() - 0.5) * 4,
              vy: -2 - Math.random() * 3,
              hue,
              maxLife: 40 + Math.random() * 30,
              size: 1.6 + Math.random() * 2.2,
              alpha: 0.9,
            });
          }
          const resolver = settleResolversRef.current.get(b.id);
          if (resolver) {
            resolver({ bin, mult: m });
            settleResolversRef.current.delete(b.id);
          }
        }
      }
      // Trim done balls older than 1s by removing 'done' once they're offscreen
      ballsRef.current = balls.filter((b) => !b.done || b.y < H + 40 * dpr);

      // Particles
      stepParticles(ctx, dpr);

      raf = requestAnimationFrame(draw);
    };
    if (visible) raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [rows, visible, mults, spawnParticle, stepParticles]);

  return (
    <div
      ref={(el) => {
        wrapRef.current = el;
        pauseRef.current = el;
      }}
      className="relative w-full aspect-[4/5] md:aspect-[16/12] rounded-2xl overflow-hidden border border-[hsl(var(--gold))]/30 bg-[hsl(260,50%,6%)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(45,90%,60%,0.12),transparent_60%)]" />
    </div>
  );
}

export const ImperialPlinkoCanvas = memo(forwardRef(ImperialPlinkoCanvasImpl));
export default ImperialPlinkoCanvas;
