// DragonEmberCanvas — 떠오르는 ember + 비늘 패턴 + 하단 lava glow.
// useAnimatedCanvas로 RAF/dpr/visibility/RO/cleanup 자동화 (60fps cap).
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

const RED = "239,68,68";    // tailwind red-500
const ORANGE = "249,115,22"; // orange-500
const GOLD = "251,191,36";   // amber-400

interface Ember {
  x: number; y: number; vx: number; vy: number;
  r: number; alpha: number; hue: 0 | 1 | 2;
}
interface State { embers: Ember[]; }

const EMBER_CAP = 55;

export default function DragonEmberCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const embers: Ember[] = [];
      for (let i = 0; i < EMBER_CAP; i++) {
        embers.push({
          x: Math.random() * w,
          y: h + Math.random() * h * 0.3,
          vx: (Math.random() - 0.5) * 0.35,
          vy: -0.4 - Math.random() * 0.9,
          r: 1.2 + Math.random() * 2.4,
          alpha: 0.45 + Math.random() * 0.45,
          hue: (i % 3) as 0 | 1 | 2,
        });
      }
      return { embers };
    },
    (ctx, w, h, t, { embers }) => {
      // 페이드 클리어 (잔상 ember 살리기)
      ctx.fillStyle = "rgba(20,4,4,0.22)";
      ctx.fillRect(0, 0, w, h);

      // 비늘 패턴 — 호 두 줄 (반복, 저강도)
      drawScales(ctx, w, h, t);

      // Lava glow — 하단 가로 그라디언트 + 펄스
      const pulse = 0.55 + 0.25 * Math.sin(t * 0.0009);
      const lg = ctx.createLinearGradient(0, h * 0.7, 0, h);
      lg.addColorStop(0, `rgba(${RED}, 0)`);
      lg.addColorStop(0.55, `rgba(${RED}, ${0.18 * pulse})`);
      lg.addColorStop(1, `rgba(${ORANGE}, ${0.55 * pulse})`);
      ctx.fillStyle = lg;
      ctx.fillRect(0, h * 0.7, w, h * 0.3);

      // 중앙 lava 코어 글로우
      const cg = ctx.createRadialGradient(w * 0.5, h * 0.98, 4, w * 0.5, h * 0.98, Math.max(w, h) * 0.55);
      cg.addColorStop(0, `rgba(${GOLD}, ${0.45 * pulse})`);
      cg.addColorStop(0.4, `rgba(${ORANGE}, ${0.20 * pulse})`);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, h * 0.5, w, h * 0.5);

      // Embers — 위로 떠오르며 흔들림
      for (const e of embers) {
        e.x += e.vx + Math.sin((t + e.y) * 0.003) * 0.18;
        e.y += e.vy;
        if (e.y < -6) {
          e.x = Math.random() * w;
          e.y = h + 8;
        }
        const color = e.hue === 0 ? RED : e.hue === 1 ? ORANGE : GOLD;
        ctx.fillStyle = `rgba(${color}, ${e.alpha})`;
        ctx.shadowColor = `rgba(${color}, 0.95)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
    {
      drawStaticFn: (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const lg = ctx.createLinearGradient(0, 0, 0, h);
        lg.addColorStop(0, "rgba(40,8,4,0.85)");
        lg.addColorStop(0.6, "rgba(80,20,8,0.55)");
        lg.addColorStop(1, `rgba(${ORANGE}, 0.45)`);
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, w, h);
        drawScales(ctx, w, h, 0);
      },
    }
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}

function drawScales(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.save();
  ctx.lineWidth = 1;
  const drift = Math.sin(t * 0.0003) * 6;
  // 두 줄 비늘 (gold + red) — 반복 호
  for (let row = 0; row < 2; row++) {
    const baseY = h * (0.18 + row * 0.18);
    const radius = 18 + row * 6;
    const step = radius * 1.6;
    const color = row === 0 ? GOLD : RED;
    ctx.strokeStyle = `rgba(${color}, 0.18)`;
    for (let x = -step; x < w + step; x += step) {
      ctx.beginPath();
      ctx.arc(x + drift, baseY, radius, Math.PI, 0, false);
      ctx.stroke();
    }
  }
  ctx.restore();
}
