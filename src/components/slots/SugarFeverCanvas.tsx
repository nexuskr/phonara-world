// SugarFeverCanvas — "Warm Sugar Luxury" cinematic background.
// Pastel pink + warm gold + mint + strawberry red. Sweet, comforting, never
// childish. 2-layer parallax sugar clouds, floating candy dots, and a slow
// sparkle particle field with a warm radial vignette.
//
// Performance contract (Musk mode):
//  - Single RAF loop via useAnimatedCanvas (DPR cap / 60fps / pause on hidden)
//  - Particle count auto-throttled on small viewports (≤640px halves all counts)
//  - prefers-reduced-motion → static warm gradient via drawStaticFn
//  - Zero allocations inside the hot per-frame path (only gradient handles)

import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

// ── Warm Sugar Luxury palette ────────────────────────────────────────────────
const COLOR_CREAM_TOP   = "rgba(28,14,24,1)";   // deep warm cocoa (top)
const COLOR_CREAM_BOT   = "rgba(40,18,32,1)";   // deep berry (bottom)
const COLOR_PINK_GLOW   = "rgba(255,182,206,0.28)";
const COLOR_GOLD_GLOW   = "rgba(255,206,120,0.22)";
const COLOR_MINT_GLOW   = "rgba(170,232,210,0.16)";
const COLOR_STRAWBERRY  = "rgba(255,120,135,0.32)";

// Candy palette (each floating candy picks one)
const CANDY_COLORS = [
  "rgba(255,180,205,0.85)", // soft pink
  "rgba(255,210,130,0.85)", // warm gold
  "rgba(170,232,210,0.80)", // mint
  "rgba(255,128,140,0.85)", // strawberry red
  "rgba(245,225,245,0.85)", // marshmallow
];

// ── Tunables ─────────────────────────────────────────────────────────────────
const CLOUD_FAR  = { count: 4, vx: 0.010, blur: 42, alpha: 0.22 };
const CLOUD_NEAR = { count: 3, vx: 0.024, blur: 26, alpha: 0.28 };
const SPARKLE_COUNT_DESKTOP = 60;
const SPARKLE_COUNT_MOBILE  = 28;
const CANDY_COUNT_DESKTOP   = 14;
const CANDY_COUNT_MOBILE    = 7;

interface Cloud {
  x: number; y: number;
  rx: number; ry: number;
  vx: number; alpha: number;
  hueA: string; hueB: string;
}
interface Sparkle {
  x: number; y: number;
  r: number; phase: number; speed: number;
}
interface Candy {
  x: number; y: number;
  r: number; vy: number; vx: number;
  spin: number; spinV: number;
  color: string;
}
interface State {
  far: Cloud[]; near: Cloud[];
  sparkles: Sparkle[]; candies: Candy[];
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function SugarFeverCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const isMobile = w < 640;
      const sparkleCount = isMobile ? SPARKLE_COUNT_MOBILE : SPARKLE_COUNT_DESKTOP;
      const candyCount   = isMobile ? CANDY_COUNT_MOBILE   : CANDY_COUNT_DESKTOP;

      const seedClouds = (cfg: typeof CLOUD_FAR): Cloud[] => {
        const arr: Cloud[] = [];
        for (let i = 0; i < cfg.count; i++) {
          // pastel pink/gold cloud blend per cloud
          const warmPair = Math.random() < 0.5
            ? { a: COLOR_PINK_GLOW,  b: COLOR_STRAWBERRY }
            : { a: COLOR_GOLD_GLOW,  b: COLOR_MINT_GLOW };
          arr.push({
            x: Math.random() * w,
            y: rand(h * 0.05, h * 0.55),
            rx: rand(w * 0.22, w * 0.42),
            ry: rand(h * 0.08, h * 0.18),
            vx: cfg.vx * (0.85 + Math.random() * 0.3),
            alpha: cfg.alpha * (0.85 + Math.random() * 0.3),
            hueA: warmPair.a, hueB: warmPair.b,
          });
        }
        return arr;
      };

      const sparkles: Sparkle[] = [];
      for (let i = 0; i < sparkleCount; i++) {
        sparkles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(0.6, 1.8),
          phase: Math.random() * Math.PI * 2,
          speed: rand(0.0008, 0.0022),
        });
      }

      const candies: Candy[] = [];
      for (let i = 0; i < candyCount; i++) {
        candies.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: rand(5, 11),
          vy: rand(-0.08, -0.22),  // float upward slowly
          vx: rand(-0.03, 0.03),
          spin: Math.random() * Math.PI * 2,
          spinV: rand(-0.004, 0.004),
          color: pick(CANDY_COLORS),
        });
      }

      return {
        far: seedClouds(CLOUD_FAR),
        near: seedClouds(CLOUD_NEAR),
        sparkles, candies,
      };
    },
    (ctx, w, h, t, state) => {
      // 1) deep warm berry/cocoa base
      const base = ctx.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, COLOR_CREAM_TOP);
      base.addColorStop(1, COLOR_CREAM_BOT);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // 2) warm pink halo from bottom + soft gold from top-center
      const haloBot = ctx.createRadialGradient(
        w * 0.5, h * 1.02, 0,
        w * 0.5, h * 1.02, Math.max(w, h) * 0.85,
      );
      haloBot.addColorStop(0, COLOR_PINK_GLOW);
      haloBot.addColorStop(0.55, COLOR_STRAWBERRY);
      haloBot.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloBot;
      ctx.fillRect(0, 0, w, h);

      const haloTop = ctx.createRadialGradient(
        w * 0.5, h * -0.05, 0,
        w * 0.5, h * -0.05, Math.max(w, h) * 0.7,
      );
      haloTop.addColorStop(0, COLOR_GOLD_GLOW);
      haloTop.addColorStop(0.6, COLOR_MINT_GLOW);
      haloTop.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = haloTop;
      ctx.fillRect(0, 0, w, h);

      // 3) sugar clouds — far + near
      const drawClouds = (clouds: Cloud[], blurPx: number) => {
        ctx.save();
        ctx.filter = `blur(${blurPx}px)`;
        for (const c of clouds) {
          c.x += c.vx;
          if (c.x - c.rx > w) c.x = -c.rx;
          else if (c.x + c.rx < 0) c.x = w + c.rx;
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
          g.addColorStop(0, c.hueA);
          g.addColorStop(0.6, c.hueB);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      drawClouds(state.far,  CLOUD_FAR.blur);
      drawClouds(state.near, CLOUD_NEAR.blur);

      // 4) floating candies — small filled circles with inner highlight
      for (const c of state.candies) {
        c.x += c.vx;
        c.y += c.vy;
        c.spin += c.spinV;
        if (c.y + c.r < 0) { c.y = h + c.r; c.x = Math.random() * w; }
        if (c.x < -c.r) c.x = w + c.r;
        else if (c.x > w + c.r) c.x = -c.r;

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.spin);
        // body
        const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r);
        cg.addColorStop(0, c.color);
        cg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(0, 0, c.r, 0, Math.PI * 2);
        ctx.fill();
        // highlight dot
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.beginPath();
        ctx.arc(-c.r * 0.35, -c.r * 0.35, c.r * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5) sparkle field — twinkles via sin(phase)
      ctx.fillStyle = "rgba(255,236,210,1)";
      for (const s of state.sparkles) {
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    {
      // prefers-reduced-motion → single warm static composition
      drawStaticFn: (ctx, w, h) => {
        const base = ctx.createLinearGradient(0, 0, 0, h);
        base.addColorStop(0, COLOR_CREAM_TOP);
        base.addColorStop(1, COLOR_CREAM_BOT);
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        const halo = ctx.createRadialGradient(
          w * 0.5, h * 1.02, 0,
          w * 0.5, h * 1.02, Math.max(w, h) * 0.85,
        );
        halo.addColorStop(0, COLOR_PINK_GLOW);
        halo.addColorStop(0.55, COLOR_STRAWBERRY);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);
      },
    },
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}
