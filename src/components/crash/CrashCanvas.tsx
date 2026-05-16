import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/haptics";
import { getCrashPrefs } from "./CrashSettingsSheet";

interface Props {
  multiplier: number;
  status: "none" | "pending" | "running" | "crashed";
  crashedAt?: number | null;
}

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; alive: boolean; }

export default function CrashCanvas({ multiplier, status }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    multiplier, status,
    particles: [] as Particle[],
    stars: [] as { x: number; y: number; z: number }[],
    t: 0, crashFlash: 0,
    bgGrad: null as CanvasGradient | null,
    w: 0, h: 0,
  });

  useEffect(() => { stateRef.current.multiplier = multiplier; }, [multiplier]);
  useEffect(() => {
    stateRef.current.status = status;
    if (status === "crashed") stateRef.current.crashFlash = 1;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const prefs = getCrashPrefs();
    const reduce = prefersReducedMotion() || prefs.reducedMotion;
    const lowEndAuto =
      (typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4) ||
      (window.matchMedia && window.matchMedia("(max-width: 480px)").matches);
    const lowEnd = prefs.lowEnd || lowEndAuto;
    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1 : 2);
    const particleCap = reduce ? 0 : lowEnd ? 30 : 80;
    const starCount = reduce ? 0 : lowEnd ? 40 : 100;

    // Pre-allocate particle pool (object pooling — reuse instead of splice/push)
    const pool: Particle[] = Array.from({ length: Math.max(particleCap, 1) }, () => ({
      x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 0, alive: false,
    }));
    stateRef.current.particles = pool;

    let raf = 0;
    let running = true;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.w = r.width;
      stateRef.current.h = r.height;
      const g = ctx.createLinearGradient(0, 0, 0, r.height);
      g.addColorStop(0, "hsl(240 40% 6%)");
      g.addColorStop(1, "hsl(260 30% 3%)");
      stateRef.current.bgGrad = g;
    };
    resize();
    window.addEventListener("resize", resize);

    stateRef.current.stars = Array.from({ length: starCount }, () => ({
      x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 0.7,
    }));

    const lerpColor = (m: number): [number, number, number] => {
      if (m < 3) return [255, 196, 80];
      if (m < 10) {
        const t = (m - 3) / 7;
        return [255, Math.round(196 - 96 * t), Math.round(80 - 50 * t)];
      }
      return [255, 80, 140];
    };

    const spawn = (x: number, y: number, vx: number, vy: number, max: number) => {
      if (particleCap === 0) return;
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.alive) {
          p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = max; p.alive = true;
          return;
        }
      }
    };

    const draw = () => {
      if (!running) return;
      const s = stateRef.current;
      const w = s.w, h = s.h;
      s.t += 1;

      // Background
      ctx.fillStyle = s.bgGrad ?? "hsl(240 40% 5%)";
      ctx.fillRect(0, 0, w, h);

      // Stars (parallax)
      if (s.stars.length) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        for (let i = 0; i < s.stars.length; i++) {
          const star = s.stars[i];
          const sx = (star.x * w + s.t * 0.1 * star.z) % w;
          const sy = (star.y * h) % h;
          ctx.globalAlpha = 0.3 + star.z * 0.5;
          ctx.fillRect(sx, sy, star.z * 1.5, star.z * 1.5);
        }
        ctx.globalAlpha = 1;
      }

      // Rocket position
      const m = Math.max(1, s.multiplier);
      const progress = Math.min(1, Math.log(m) / Math.log(20));
      const rocketX = 60 + progress * (w - 120);
      const rocketY = h - 80 - progress * (h - 160);

      // Trail curve
      const [r, g, b] = lerpColor(m);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, h - 80);
      const steps = lowEnd ? 16 : 30;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        ctx.lineTo(60 + t * (rocketX - 60), (h - 80) + t * (rocketY - (h - 80)));
      }
      ctx.stroke();

      // Spawn particles while running
      if (!reduce && s.status === "running" && s.t % 2 === 0) {
        spawn(rocketX, rocketY, -1.5 - Math.random() * 1.5, 1 + Math.random() * 1.5, 30 + Math.random() * 20);
      }

      // Draw + update particles (pool)
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        if (!p.alive) continue;
        p.x += p.vx; p.y += p.vy; p.life++;
        const a = 1 - p.life / p.max;
        if (a <= 0) { p.alive = false; continue; }
        ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3 * a + 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rocket body
      ctx.save();
      ctx.translate(rocketX, rocketY);
      ctx.rotate(-Math.PI / 4);
      if (!lowEnd && !reduce) {
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(8, 10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Crash flash
      if (!reduce && s.crashFlash > 0) {
        ctx.fillStyle = `rgba(255,200,80,${s.crashFlash * 0.5})`;
        ctx.fillRect(0, 0, w, h);
        s.crashFlash -= 0.04;
        if (s.crashFlash > 0.9) {
          for (let i = 0; i < (lowEnd ? 6 : 12); i++) {
            const ang = Math.random() * Math.PI * 2;
            spawn(rocketX, rocketY, Math.cos(ang) * (2 + Math.random() * 4), Math.sin(ang) * (2 + Math.random() * 4), 40 + Math.random() * 30);
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // Pause when hidden or off-screen
    const onVis = () => {
      if (document.hidden) { running = false; cancelAnimationFrame(raf); }
      else if (!running) { running = true; raf = requestAnimationFrame(draw); }
    };
    document.addEventListener("visibilitychange", onVis);

    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver((entries) => {
        const visible = entries[0]?.isIntersecting;
        if (!visible) { running = false; cancelAnimationFrame(raf); }
        else if (!running) { running = true; raf = requestAnimationFrame(draw); }
      }, { threshold: 0.05 });
      io.observe(canvas);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      io?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full aspect-[16/10] rounded-2xl border border-border/40"
      style={{ background: "hsl(240 40% 5%)" }}
    />
  );
}
