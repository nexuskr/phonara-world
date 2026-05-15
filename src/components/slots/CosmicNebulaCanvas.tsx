// CosmicNebulaCanvas — drift starfield + nebula glow.
// useAnimatedCanvas로 RAF/dpr/visibility/RO/cleanup 자동화.
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

interface Star {
  x: number; y: number; r: number;
  vx: number; vy: number;
  hue: number; alpha: number; twinkle: number;
}
interface State { stars: Star[]; }

const STAR_CAP = 60;

export default function CosmicNebulaCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const stars: Star[] = [];
      for (let i = 0; i < STAR_CAP; i++) {
        stars.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 0.6 + Math.random() * 1.6,
          vx: (Math.random() - 0.5) * 0.08,
          vy: (Math.random() - 0.5) * 0.08,
          hue: 220 + Math.random() * 70,
          alpha: 0.4 + Math.random() * 0.5,
          twinkle: Math.random() * Math.PI * 2,
        });
      }
      return { stars };
    },
    (ctx, w, h, t, { stars }) => {
      ctx.clearRect(0, 0, w, h);
      // nebula radial wash A
      const cx1 = w * (0.3 + Math.sin(t * 0.00005) * 0.04);
      const cy1 = h * (0.4 + Math.cos(t * 0.00007) * 0.04);
      const g1 = ctx.createRadialGradient(cx1, cy1, 0, cx1, cy1, Math.max(w, h) * 0.7);
      g1.addColorStop(0, "rgba(120,80,220,0.20)");
      g1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      // nebula radial wash B
      const cx2 = w * (0.75 + Math.cos(t * 0.00006) * 0.04);
      const cy2 = h * (0.7 + Math.sin(t * 0.00005) * 0.04);
      const g2 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, Math.max(w, h) * 0.65);
      g2.addColorStop(0, "rgba(34,211,238,0.16)");
      g2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);
      // stars
      for (const s of stars) {
        s.x += s.vx; s.y += s.vy;
        if (s.x < -2) s.x = w + 2; else if (s.x > w + 2) s.x = -2;
        if (s.y < -2) s.y = h + 2; else if (s.y > h + 2) s.y = -2;
        s.twinkle += 0.02;
        const a = s.alpha * (0.7 + Math.sin(s.twinkle) * 0.3);
        ctx.beginPath();
        ctx.fillStyle = `hsla(${s.hue}, 100%, 82%, ${a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    {
      drawStaticFn: (ctx, w, h, { stars }) => {
        ctx.clearRect(0, 0, w, h);
        const g1 = ctx.createRadialGradient(w * 0.3, h * 0.4, 0, w * 0.3, h * 0.4, Math.max(w, h) * 0.7);
        g1.addColorStop(0, "rgba(120,80,220,0.18)");
        g1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g1; ctx.fillRect(0, 0, w, h);
        const g2 = ctx.createRadialGradient(w * 0.75, h * 0.7, 0, w * 0.75, h * 0.7, Math.max(w, h) * 0.65);
        g2.addColorStop(0, "rgba(34,211,238,0.14)");
        g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
        for (const s of stars) {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${s.alpha})`;
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }
      },
    }
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}
