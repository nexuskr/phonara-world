/**
 * ImperialCanvas — gold-empire crash visualization.
 *
 * Pure <canvas> 2D — no WebGL/Three, no external libs. Renders:
 *   • exponential rocket trajectory in Warm Gold → Imperial Pink gradient
 *   • particle exhaust trail (32-particle ring buffer, GC-free)
 *   • aura halo that intensifies with multiplier
 *   • crash shockwave + ember burst on explosion
 *
 * Honors prefers-reduced-motion and pauses when offscreen via the
 * shared useViewportPause hook from @pkg/games/core.
 */
import { memo, useEffect, useRef } from "react";
import { useViewportPause } from "@pkg/games/core";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
}

interface Props {
  multiplier: number;
  phase: "idle" | "pending" | "running" | "crashed";
}

const POOL = 64;

function ImperialCanvasImpl({ multiplier, phase }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: POOL }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 1, hue: 45,
    })),
  );
  const cursorRef = useRef(0);
  const multRef = useRef(multiplier);
  const phaseRef = useRef(phase);
  const shockRef = useRef(0);
  const dprRef = useRef(1);

  useEffect(() => { multRef.current = multiplier; }, [multiplier]);
  useEffect(() => {
    if (phase === "crashed" && phaseRef.current !== "crashed") {
      shockRef.current = 1;
    }
    phaseRef.current = phase;
  }, [phase]);

  const { paused } = useViewportPause<HTMLDivElement>();
  const visible = !paused;

  const visible = useViewportPause(wrapRef);

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
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let t0 = performance.now();

    const spawnExhaust = (x: number, y: number, intensity: number) => {
      if (reducedMotion) return;
      const n = Math.min(3, Math.ceil(intensity));
      for (let i = 0; i < n; i++) {
        const p = particlesRef.current[cursorRef.current];
        cursorRef.current = (cursorRef.current + 1) % POOL;
        p.x = x + (Math.random() - 0.5) * 6;
        p.y = y + (Math.random() - 0.5) * 6;
        p.vx = -1 - Math.random() * 2;
        p.vy = 1 + Math.random() * 1.6;
        p.life = 0;
        p.maxLife = 28 + Math.random() * 22;
        p.size = 1.4 + Math.random() * 2.2;
        // Gold (45) → pink (340) as mult climbs
        const m = multRef.current;
        p.hue = m < 3 ? 45 : m < 10 ? 30 : 340;
      }
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient — deep navy → pink wash on big mult
      const m = multRef.current;
      const heat = Math.min(1, (m - 1) / 12);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, `hsla(${260 - heat * 40}, 50%, 8%, 1)`);
      bg.addColorStop(1, `hsla(${340 - heat * 10}, 60%, 4%, 1)`);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = "hsla(45, 80%, 60%, 0.06)";
      ctx.lineWidth = 1 * dpr;
      const grid = 48 * dpr;
      for (let x = 0; x < W; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Trajectory curve — exp growth normalized so visual fills 80% of canvas
      // at mult ~5x and asymptotes.
      const padX = 24 * dpr;
      const padY = 24 * dpr;
      const usableW = W - padX * 2;
      const usableH = H - padY * 2;

      // Time axis: stretch 0..1 over current elapsed visual time (synthesized
      // from log of multiplier so any startedAt works visually).
      const tNorm = Math.min(1, Math.log(Math.max(1, m)) / Math.log(20));

      // Build curve points
      const N = 64;
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const x = padX + usableW * u * tNorm;
        // y is exponential — flip so up = high
        const mu = Math.pow(20, u * tNorm); // 1..m approx
        const yNorm = Math.min(1, Math.log(mu) / Math.log(20));
        const y = H - padY - usableH * yNorm;
        pts.push([x, y]);
      }

      const isCrashed = phaseRef.current === "crashed";

      // Glow halo around end of curve
      const last = pts[pts.length - 1];
      const hue = m < 3 ? 45 : m < 10 ? 30 : 340;
      const auraR = (30 + heat * 60) * dpr;
      const aura = ctx.createRadialGradient(
        last[0], last[1], 0, last[0], last[1], auraR,
      );
      aura.addColorStop(0, `hsla(${hue}, 90%, 60%, ${isCrashed ? 0.2 : 0.55})`);
      aura.addColorStop(1, `hsla(${hue}, 90%, 60%, 0)`);
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(last[0], last[1], auraR, 0, Math.PI * 2);
      ctx.fill();

      // Curve stroke — gradient gold→pink
      const stroke = ctx.createLinearGradient(padX, 0, last[0], 0);
      stroke.addColorStop(0, "hsla(45, 95%, 60%, 0.9)");
      stroke.addColorStop(1, `hsla(${hue}, 95%, 65%, 1)`);
      ctx.strokeStyle = isCrashed ? "hsla(0, 80%, 55%, 0.9)" : stroke;
      ctx.lineWidth = 3 * dpr;
      ctx.shadowColor = isCrashed ? "hsla(0, 80%, 55%, 0.6)" : `hsla(${hue}, 95%, 60%, 0.5)`;
      ctx.shadowBlur = 18 * dpr;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0], pts[i][1]);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Filled area below curve
      const fill = ctx.createLinearGradient(0, padY, 0, H - padY);
      fill.addColorStop(0, `hsla(${hue}, 90%, 55%, 0.18)`);
      fill.addColorStop(1, `hsla(${hue}, 90%, 55%, 0)`);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], H - padY);
      for (const p of pts) ctx.lineTo(p[0], p[1]);
      ctx.lineTo(last[0], H - padY);
      ctx.closePath();
      ctx.fill();

      // Rocket exhaust spawn
      if (phaseRef.current === "running") {
        spawnExhaust(last[0], last[1], 1 + heat * 2);
      }

      // Particles
      const arr = particlesRef.current;
      for (const p of arr) {
        if (p.life >= p.maxLife) continue;
        p.life += 1;
        p.x += p.vx * dpr;
        p.y += p.vy * dpr;
        const lifeRatio = 1 - p.life / p.maxLife;
        ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${lifeRatio * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * dpr * lifeRatio, 0, Math.PI * 2);
        ctx.fill();
      }

      // Shockwave on crash
      if (shockRef.current > 0) {
        const s = shockRef.current;
        ctx.strokeStyle = `hsla(0, 85%, 55%, ${s})`;
        ctx.lineWidth = 4 * dpr * s;
        ctx.beginPath();
        ctx.arc(last[0], last[1], (1 - s) * 220 * dpr, 0, Math.PI * 2);
        ctx.stroke();
        shockRef.current = Math.max(0, s - 0.025);
      }

      raf = requestAnimationFrame(draw);
    };

    if (visible) {
      t0 = performance.now();
      raf = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [visible]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-[hsl(var(--gold))]/30 bg-[hsl(260,50%,6%)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
      {/* corner shine */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(45,90%,60%,0.12),transparent_60%)]" />
    </div>
  );
}

export const ImperialCanvas = memo(ImperialCanvasImpl);
export default ImperialCanvas;
