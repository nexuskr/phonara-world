// NeonGridCanvas — Cyberpunk neon grid + 비스듬히 떨어지는 rain + 미니 flying car.
// 60fps cap (rAF), particle 캡, dpr=1, visibilitychange 일시정지, prefers-reduced-motion 시 정적 그리드만.
import { useEffect, useRef } from "react";

interface RainDrop {
  x: number;
  y: number;
  vy: number;
  len: number;
  hue: number; // 180 cyan ~ 320 magenta
  alpha: number;
}

interface FlyingCar {
  x: number;
  y: number;
  vx: number;
  hue: number;
  size: number;
}

const RAIN_CAP = 50;
const CAR_CAP = 3;

export default function NeonGridCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    const dpr = 1;
    let last = 0;
    const FRAME_MS = 1000 / 60;

    const drops: RainDrop[] = [];
    const cars: FlyingCar[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };

    const seed = () => {
      drops.length = 0;
      for (let i = 0; i < RAIN_CAP; i++) {
        drops.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vy: 2 + Math.random() * 3,
          len: 8 + Math.random() * 18,
          hue: Math.random() < 0.5 ? 320 : 195, // magenta or cyan
          alpha: 0.25 + Math.random() * 0.45,
        });
      }
      cars.length = 0;
      for (let i = 0; i < CAR_CAP; i++) {
        cars.push({
          x: Math.random() * w,
          y: 30 + Math.random() * (h * 0.5),
          vx: 0.6 + Math.random() * 0.8,
          hue: [115, 320, 195][i % 3], // green / magenta / cyan
          size: 2 + Math.random() * 1.5,
        });
      }
    };

    const drawGrid = (offset = 0) => {
      // 원근 horizon grid — magenta lines
      ctx.save();
      ctx.lineWidth = 1;
      // horizontals
      const horizon = h * 0.45;
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        const y = horizon + (h - horizon) * (t * t); // perspective ease
        const a = 0.10 + t * 0.30;
        ctx.strokeStyle = `hsla(320, 100%, 60%, ${a})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      // verticals — converging to vanishing point
      const vpx = w * 0.5;
      const vpy = horizon;
      const cols = 14;
      for (let i = -cols; i <= cols; i++) {
        const x = vpx + (w / cols) * i + offset;
        ctx.strokeStyle = `hsla(195, 100%, 55%, 0.18)`;
        ctx.beginPath();
        ctx.moveTo(vpx, vpy);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      // skyline glow
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      g.addColorStop(0, "rgba(120,0,80,0.35)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, horizon);
      ctx.restore();
    };

    const tick = (t: number) => {
      if (!running) return;
      // 60fps cap — 모바일 배터리 보호
      if (t - last < FRAME_MS) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      last = t;
      ctx.clearRect(0, 0, w, h);

      drawGrid(Math.sin(t * 0.0001) * 8);

      // Rain
      for (const d of drops) {
        d.y += d.vy;
        d.x -= d.vy * 0.15; // slight diagonal
        if (d.y - d.len > h || d.x < -10) {
          d.x = Math.random() * (w + 40);
          d.y = -d.len;
        }
        ctx.strokeStyle = `hsla(${d.hue}, 100%, 65%, ${d.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vy * 0.15 * d.len * 0.3, d.y - d.len);
        ctx.stroke();
      }

      // Flying cars — small bright streaks
      for (const c of cars) {
        c.x += c.vx;
        if (c.x > w + 20) c.x = -20;
        ctx.fillStyle = `hsla(${c.hue}, 100%, 70%, 0.95)`;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
        ctx.fill();
        // tail
        ctx.strokeStyle = `hsla(${c.hue}, 100%, 70%, 0.55)`;
        ctx.lineWidth = c.size * 0.8;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - 22, c.y);
        ctx.stroke();
      }

      raf = window.requestAnimationFrame(tick);
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      drawGrid(0);
    };

    const onVis = () => {
      if (document.hidden) {
        running = false;
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
      } else if (!reduced) {
        running = true;
        if (!raf) raf = window.requestAnimationFrame(tick);
      }
    };

    const ro = new ResizeObserver(() => {
      resize();
      seed();
      if (reduced) drawStatic();
    });
    ro.observe(canvas);

    resize();
    seed();
    if (reduced) {
      drawStatic();
    } else {
      raf = window.requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        willChange: "transform",
        transform: "translate3d(0,0,0)",
      }}
    />
  );
}
