import { useEffect, useRef } from "react";

/**
 * CosmicBackdrop — 깊은 우주 + 은하수 + 미세한 Crown nebula 입자
 * - mobile 25 / desktop 80 자동
 * - prefers-reduced-motion → 정적 별빛으로 fallback
 * - GPU 친화적: 단일 canvas, additive composite
 */
export default function CosmicBackdrop({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const COUNT = reduced ? 0 : isMobile ? 25 : 80;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    let w = 0, h = 0, raf = 0;
    type P = { x: number; y: number; vx: number; vy: number; r: number; hue: number; a: number };
    let stars: P[] = [];
    let bgStars: { x: number; y: number; r: number; a: number }[] = [];

    const resize = () => {
      w = cvs.clientWidth;
      h = cvs.clientHeight;
      cvs.width = Math.floor(w * dpr);
      cvs.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Static background star field (cheap)
      const bgCount = isMobile ? 80 : 180;
      bgStars = Array.from({ length: bgCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.5 + 0.15,
      }));
      stars = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        r: Math.random() * 1.6 + 0.6,
        hue: Math.random() < 0.65 ? 44 : Math.random() < 0.5 ? 258 : 200,
        a: Math.random() * 0.6 + 0.25,
      }));
    };

    const draw = () => {
      // Cosmic gradient base
      const g = ctx.createRadialGradient(w * 0.5, h * 0.25, 0, w * 0.5, h * 0.5, Math.max(w, h));
      g.addColorStop(0, "hsla(258, 50%, 12%, 1)");
      g.addColorStop(0.5, "hsla(240, 40%, 5%, 1)");
      g.addColorStop(1, "hsla(240, 45%, 2%, 1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Faint milky-way band (diagonal soft glow)
      const band = ctx.createLinearGradient(0, h * 0.2, w, h * 0.8);
      band.addColorStop(0, "hsla(258, 80%, 45%, 0)");
      band.addColorStop(0.45, "hsla(258, 80%, 50%, 0.10)");
      band.addColorStop(0.55, "hsla(200, 90%, 55%, 0.08)");
      band.addColorStop(1, "hsla(44, 90%, 60%, 0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, h);

      // Background static stars
      ctx.globalCompositeOperation = "lighter";
      for (const s of bgStars) {
        ctx.fillStyle = `hsla(45, 100%, 90%, ${s.a})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }

      // Active nebula particles
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;

        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 8);
        grd.addColorStop(0, `hsla(${s.hue}, 100%, 70%, ${s.a})`);
        grd.addColorStop(1, `hsla(${s.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(draw);
    };

    resize();
    if (reduced) {
      // Single static frame
      draw();
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(draw);
    }
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
