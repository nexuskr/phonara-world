import { useEffect, useRef } from "react";

// Lightweight canvas particle/starfield with neon glow.
// Optimized: capped density on mobile, throttled to ~30fps, simpler fills.
export default function Particles({ density = 60, className = "" }: { density?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    let raf = 0;
    let w = 0, h = 0;
    let last = 0;
    const FRAME_MS = 1000 / 30; // 30fps target
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const effective = reduce ? 0 : isMobile ? Math.min(14, density) : Math.min(40, density);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    type P = { x: number; y: number; r: number; vx: number; vy: number; c: string; a: number };
    let pts: P[] = [];
    const colors = ["255,140,40", "60,200,255", "180,120,255", "255,200,80"];

    function resize() {
      w = canvas!.clientWidth; h = canvas!.clientHeight;
      canvas!.width = Math.floor(w * dpr); canvas!.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: effective }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        c: colors[Math.floor(Math.random() * colors.length)],
        a: Math.random() * 0.55 + 0.2,
      }));
    }
    resize();
    let resizeTimer: any;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); };
    window.addEventListener("resize", onResize);

    function tick(ts: number) {
      // Pause entirely when tab is hidden — saves CPU/battery on mobile.
      if (typeof document !== "undefined" && document.hidden) { raf = 0; return; }
      raf = requestAnimationFrame(tick);
      if (ts - last < FRAME_MS) return;
      last = ts;
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.fillStyle = `rgba(${p.c},${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const onVis = () => {
      if (!document.hidden && !raf && !reduce) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density]);

  return <canvas ref={ref} className={`absolute inset-0 pointer-events-none ${className}`} />;
}
