// OlympusLegacyCanvas — "Warm Olympus Luxury" cinematic background.
// Deep night blue + warm amber gold. 2-layer parallax warm clouds (slow drift),
// low-opacity marble pillar silhouettes, procedurally generated golden amber
// lightning bolts every 8–14s.
//
// Performance contract (Musk mode):
//  - single RAF loop via useAnimatedCanvas (dpr=1 / 60fps cap / pause on hidden)
//  - bolt path generated ONCE per strike and cached (offscreen path cache);
//    every subsequent frame only re-strokes the cached Path2D → ≤16ms even mid-burst
//  - prefers-reduced-motion → static warm gradient via drawStaticFn
//  - zero allocations inside the hot per-frame path

import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

// ── Warm Olympus palette (only place these colors live) ──────────────────────
const COLOR_NIGHT_TOP    = "rgba(7,12,28,1)";     // deep night blue (top)
const COLOR_NIGHT_BOT    = "rgba(14,22,46,1)";    // deep night blue (bottom)
const COLOR_AMBER_GLOW   = "rgba(255,196,90,0.22)";
const COLOR_AMBER_DEEP   = "rgba(180,120,40,0.18)";
const COLOR_MARBLE       = "rgba(245,232,205,0.06)"; // soft marble white
const COLOR_MARBLE_EDGE  = "rgba(245,232,205,0.10)";
const COLOR_BOLT_CORE    = "rgba(255,236,170,0.95)";
const COLOR_BOLT_GLOW    = "rgba(255,170,60,0.55)";

// ── Tunables ─────────────────────────────────────────────────────────────────
const CLOUD_LAYER_FAR = { count: 4, vx: 0.012, blur: 38, alpha: 0.18 };
const CLOUD_LAYER_NEAR = { count: 3, vx: 0.028, blur: 24, alpha: 0.26 };
const STRIKE_MIN_MS = 8_000;
const STRIKE_MAX_MS = 14_000;
const BOLT_LIFETIME_MS = 520;     // total visible window
const BOLT_FLASH_MS = 80;          // bright core flash
const BOLT_BRANCHES = 2;           // small branches per bolt

// ── State ────────────────────────────────────────────────────────────────────
interface Cloud {
  x: number;
  y: number;
  rx: number;
  ry: number;
  vx: number;
  alpha: number;
}
interface Pillar { cx: number; w: number; }
interface Bolt {
  /** cached path — built once on spawn, re-stroked every frame */
  path: Path2D;
  startedAt: number;
  flashX: number;
  flashY: number;
}
interface State {
  far: Cloud[];
  near: Cloud[];
  pillars: Pillar[];
  bolt: Bolt | null;
  nextStrikeAt: number;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Procedurally build a jagged bolt + small branches. Built ONCE per strike. */
function buildBoltPath(w: number, h: number): { path: Path2D; flashX: number; flashY: number } {
  const path = new Path2D();
  const startX = rand(w * 0.18, w * 0.82);
  const startY = 0;
  const endY = rand(h * 0.55, h * 0.85);
  const segments = 14;
  const dy = endY / segments;
  let x = startX;
  let y = startY;
  path.moveTo(x, y);
  const points: Array<[number, number]> = [[x, y]];
  for (let i = 1; i <= segments; i++) {
    const jitter = rand(-22, 22) * (1 - i / (segments + 4));
    x += jitter;
    y += dy + rand(-6, 6);
    path.lineTo(x, y);
    points.push([x, y]);
  }
  // small branches
  for (let b = 0; b < BOLT_BRANCHES; b++) {
    const anchor = points[Math.floor(rand(3, segments - 2))];
    let bx = anchor[0];
    let by = anchor[1];
    path.moveTo(bx, by);
    const len = Math.floor(rand(3, 6));
    for (let i = 0; i < len; i++) {
      bx += rand(-14, 14);
      by += rand(8, 22);
      path.lineTo(bx, by);
    }
  }
  return { path, flashX: startX, flashY: endY };
}

export default function OlympusLegacyCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const seedClouds = (cfg: typeof CLOUD_LAYER_FAR): Cloud[] => {
        const arr: Cloud[] = [];
        for (let i = 0; i < cfg.count; i++) {
          arr.push({
            x: Math.random() * w,
            y: rand(h * 0.05, h * 0.55),
            rx: rand(w * 0.22, w * 0.42),
            ry: rand(h * 0.08, h * 0.18),
            vx: cfg.vx * (0.85 + Math.random() * 0.3),
            alpha: cfg.alpha * (0.85 + Math.random() * 0.3),
          });
        }
        return arr;
      };
      // 4 marble pillars, evenly spaced silhouette
      const pillars: Pillar[] = [];
      const pillarCount = 4;
      const pw = Math.max(46, w * 0.06);
      for (let i = 0; i < pillarCount; i++) {
        pillars.push({
          cx: w * (0.12 + (0.76 * i) / (pillarCount - 1)),
          w: pw,
        });
      }
      return {
        far: seedClouds(CLOUD_LAYER_FAR),
        near: seedClouds(CLOUD_LAYER_NEAR),
        pillars,
        bolt: null,
        nextStrikeAt: performance.now() + rand(STRIKE_MIN_MS, STRIKE_MAX_MS),
      };
    },
    (ctx, w, h, t, state) => {
      // 1) base night-blue gradient (no alloc beyond gradient handle)
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, COLOR_NIGHT_TOP);
      sky.addColorStop(1, COLOR_NIGHT_BOT);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // 2) warm amber atmospheric wash (bottom-up halo)
      const halo = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h * 1.05, Math.max(w, h) * 0.85);
      halo.addColorStop(0, COLOR_AMBER_GLOW);
      halo.addColorStop(0.55, COLOR_AMBER_DEEP);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // 3) marble pillar silhouettes (low opacity, behind clouds)
      ctx.fillStyle = COLOR_MARBLE;
      ctx.strokeStyle = COLOR_MARBLE_EDGE;
      ctx.lineWidth = 1;
      for (const p of state.pillars) {
        const top = h * 0.18;
        const bot = h;
        const x0 = p.cx - p.w / 2;
        // shaft
        ctx.fillRect(x0, top, p.w, bot - top);
        // capital
        ctx.fillRect(x0 - 6, top - 10, p.w + 12, 10);
        // edge highlight
        ctx.beginPath();
        ctx.moveTo(x0, top);
        ctx.lineTo(x0, bot);
        ctx.stroke();
      }

      // 4) warm clouds — far layer (slow drift, blurred)
      const drawClouds = (clouds: Cloud[], blurPx: number) => {
        ctx.save();
        ctx.filter = `blur(${blurPx}px)`;
        for (const c of clouds) {
          c.x += c.vx;
          if (c.x - c.rx > w) c.x = -c.rx;
          else if (c.x + c.rx < 0) c.x = w + c.rx;
          const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.rx);
          g.addColorStop(0, `rgba(255,196,90,${c.alpha})`);
          g.addColorStop(0.6, `rgba(180,120,40,${c.alpha * 0.5})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.rx, c.ry, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      drawClouds(state.far, CLOUD_LAYER_FAR.blur);
      drawClouds(state.near, CLOUD_LAYER_NEAR.blur);

      // 5) lightning — spawn on schedule, re-stroke cached Path2D each frame
      if (!state.bolt && t >= state.nextStrikeAt) {
        const built = buildBoltPath(w, h);
        state.bolt = { path: built.path, startedAt: t, flashX: built.flashX, flashY: built.flashY };
      }
      if (state.bolt) {
        const age = t - state.bolt.startedAt;
        if (age > BOLT_LIFETIME_MS) {
          state.bolt = null;
          state.nextStrikeAt = t + rand(STRIKE_MIN_MS, STRIKE_MAX_MS);
        } else {
          // alpha curve: flash → quick decay → soft glow tail
          const flash = age < BOLT_FLASH_MS ? 1 : Math.max(0, 1 - (age - BOLT_FLASH_MS) / (BOLT_LIFETIME_MS - BOLT_FLASH_MS));
          // ambient sky flash
          if (age < BOLT_FLASH_MS * 2) {
            ctx.fillStyle = `rgba(255,200,100,${0.08 * flash})`;
            ctx.fillRect(0, 0, w, h);
          }
          // outer warm glow stroke
          ctx.save();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = COLOR_BOLT_GLOW;
          ctx.globalAlpha = 0.65 * flash;
          ctx.lineWidth = 9;
          ctx.shadowColor = COLOR_BOLT_GLOW;
          ctx.shadowBlur = 22;
          ctx.stroke(state.bolt.path);
          // inner bright core
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 0.95 * flash;
          ctx.strokeStyle = COLOR_BOLT_CORE;
          ctx.lineWidth = 2.4;
          ctx.stroke(state.bolt.path);
          // touchdown halo
          const ho = ctx.createRadialGradient(state.bolt.flashX, state.bolt.flashY, 0, state.bolt.flashX, state.bolt.flashY, 80);
          ho.addColorStop(0, `rgba(255,210,120,${0.55 * flash})`);
          ho.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalAlpha = 1;
          ctx.fillStyle = ho;
          ctx.beginPath();
          ctx.arc(state.bolt.flashX, state.bolt.flashY, 80, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    },
    {
      // prefers-reduced-motion → single warm static gradient
      drawStaticFn: (ctx, w, h) => {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, COLOR_NIGHT_TOP);
        sky.addColorStop(1, COLOR_NIGHT_BOT);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        const halo = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h * 1.05, Math.max(w, h) * 0.85);
        halo.addColorStop(0, COLOR_AMBER_GLOW);
        halo.addColorStop(0.55, COLOR_AMBER_DEEP);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);
      },
    },
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}
