// CosmicNebulaCanvas — drift starfield + nebula glow.
// requestAnimationFrame, 60-star cap, prefers-reduced-motion 시 정지,
// visibilitychange 시 일시정지(배터리 보호). 메모리 누수 0.
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  hue: number; // 220 (cyan) ~ 290 (purple)
  alpha: number;
  twinkle: number;
}

const STAR_CAP = 60;

export default function CosmicNebulaCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const stars: Star[] = [];
    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    const dpr = 1; // 의도적 1로 고정 (모바일 GPU 부하 최소화)

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };

    const seed = () => {
      stars.length = 0;
      for (let i = 0; i < STAR_CAP; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.6 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          hue: 220 + Math.random() * 70,
          alpha: 0.4 + Math.random() * 0.5,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
    };

    const drawStatic = () => {
      ctx.clearRect(0, 0, w, h);
      // nebula radial wash
      const g1 = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, Math.max(w, h) * 0.7);
      g1.addColorStop(0, "rgba(120,80,220,0.18)");
      g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createRadialGradient(w * 0.75, h * 0.7, 0, w * 0.75, h * 0.7, Math.max(w, h) * 0.65);
      g2.addColorStop(0, "rgba(34,211,238,0.14)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
      // static stars
      for (const s of stars) {
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${s.alpha})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (t: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      // nebula wash (cheap, redrawn per frame for subtle parallax)
      const cx1 = w * (0.3 + Math.sin(t * 0.00005) * 0.04);
      const cy1 = h * (0.4 + Math.cos(t * 0.00007) * 0.04);
      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, Math.max(w, h) * 0.7);
      g1.addColorStop(0, "rgba(120,80,220,0.20)");
      g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const cx2 = w * (0.75 + Math.cos(t * 0.00006) * 0.04);
      const cy2 = h * (0.7 + Math.sin(t * 0.00005) * 0.04);
      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(w, h) * 0.65);
      g2.addColorStop(0, "rgba(34,211,238,0.16)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -2) s.x = w + 2;
        else if (s.x > w + 2) s.x = -2;
        if (s.y < -2) s.y = h + 2;
        else if (s.y > h + 2) s.y = -2;
        s.twinkle += 0.02;
        const a = s.alpha * (0.7 + Math.sin(s.twinkle) * 0.3);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 100%, 82%, ${a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onVisibility = () => {
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
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      if (raf) window.cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
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
