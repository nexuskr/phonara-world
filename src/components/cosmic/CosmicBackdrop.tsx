import { useEffect, useRef } from "react";
import { useReducedMotionPref } from "@/lib/app-settings";

/**
 * CosmicBackdrop — 정적 그라디언트 + (옵션) 부드러운 별 입자.
 * - 기본은 정적 (animated=false). 메인/대시보드 등에서 CPU/배터리 절약.
 * - prefers-reduced-motion 또는 모바일 → 강제 정적.
 * - animated=true 일 때만 RAF 루프 가동 (PC/desktop).
 */
export default function CosmicBackdrop({
  className = "",
  animated = false,
}: { className?: string; animated?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotionPref();

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d", { alpha: true });
    if (!ctx) return;

    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    const allowAnim = animated && !reduced && !isMobile;
    const COUNT = allowAnim ? 60 : 0;
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
      const bgCount = isMobile ? 60 : 140;
      bgStars = Array.from({ length: bgCount }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 0.9 + 0.2,
        a: Math.random() * 0.5 + 0.15,
      }));
      stars = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        r: Math.random() * 1.4 + 0.5,
        hue: Math.random() < 0.65 ? 44 : Math.random() < 0.5 ? 258 : 200,
        a: Math.random() * 0.55 + 0.2,
      }));
    };

    const drawBase = () => {
      const g = ctx.createRadialGradient(w * 0.5, h * 0.25, 0, w * 0.5, h * 0.5, Math.max(w, h));
      g.addColorStop(0, "hsla(258, 50%, 12%, 1)");
      g.addColorStop(0.5, "hsla(240, 40%, 5%, 1)");
      g.addColorStop(1, "hsla(240, 45%, 2%, 1)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const band = ctx.createLinearGradient(0, h * 0.2, w, h * 0.8);
      band.addColorStop(0, "hsla(258, 80%, 45%, 0)");
      band.addColorStop(0.45, "hsla(258, 80%, 50%, 0.10)");
      band.addColorStop(0.55, "hsla(200, 90%, 55%, 0.08)");
      band.addColorStop(1, "hsla(44, 90%, 60%, 0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "lighter";
      for (const s of bgStars) {
        ctx.fillStyle = `hsla(45, 100%, 90%, ${s.a})`;
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawAnimatedFrame = () => {
      drawBase();
      ctx.globalCompositeOperation = "lighter";
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;
        const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 7);
        grd.addColorStop(0, `hsla(${s.hue}, 100%, 70%, ${s.a})`);
        grd.addColorStop(1, `hsla(${s.hue}, 100%, 60%, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(drawAnimatedFrame);
    };

    resize();
    if (allowAnim) {
      raf = requestAnimationFrame(drawAnimatedFrame);
    } else {
      drawBase();
    }
    const onResize = () => {
      resize();
      if (!allowAnim) drawBase();
    };
    window.addEventListener("resize", onResize);
    // Stop animation when tab is hidden
    const onVis = () => {
      if (!allowAnim) return;
      if (document.visibilityState === "hidden") cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(drawAnimatedFrame);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [animated, reduced]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}
