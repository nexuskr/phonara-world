// PirateOceanCanvas — 파도 3겹 + 안개 + 해적선 실루엣 2척(패럴렉스) + 보물 glow.
// useAnimatedCanvas 로 RAF / dpr / visibility / RO / cleanup 자동화 (60fps cap).
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

const DEEP = "12,26,43";       // #0c1a2b 심해
const TEAL = "13,148,136";     // teal-600 파도 하이라이트
const FOG = "203,213,225";     // slate-300 안개
const WOOD = "124,45,18";      // #7c2d12 우드
const GOLD = "234,179,8";      // amber-500 보물
const BLOOD = "185,28,28";     // red-700

interface State {
  // 패럴렉스 보존을 위한 시간 오프셋 (resize 시 리셋되지 않게 ref state는 RAF 시간 t 만 사용)
  _: 0;
}

export default function PirateOceanCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    () => ({ _: 0 }),
    (ctx, w, h, t) => {
      // 1) Deep ocean fade backdrop
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "rgba(8,16,28,0.95)");
      bg.addColorStop(0.55, `rgba(${DEEP}, 0.95)`);
      bg.addColorStop(1, "rgba(4,8,16,0.98)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // 2) Fog band (상단 그라디언트, 느리게 좌→우 드리프트)
      const fogShift = (t * 0.012) % w;
      const fg = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      fg.addColorStop(0, `rgba(${FOG}, 0.10)`);
      fg.addColorStop(1, `rgba(${FOG}, 0)`);
      ctx.fillStyle = fg;
      ctx.fillRect(-fogShift, 0, w * 2, h * 0.45);

      // 3) Pirate ships — 2척, 다른 깊이/방향으로 패럴렉스
      drawShip(ctx, w, h, t, /*depth*/ 0.62, /*dir*/ 1, /*speed*/ 0.018, /*scale*/ 0.85, 0.55);
      drawShip(ctx, w, h, t, /*depth*/ 0.7, /*dir*/ -1, /*speed*/ 0.013, /*scale*/ 1.0, 0.4);

      // 4) Waves — 3겹 (뒤→앞), 다른 진폭/속도/투명도
      drawWave(ctx, w, h, t, /*y*/ h * 0.72, /*amp*/ 8, /*freq*/ 0.012, /*speed*/ 0.0011, `rgba(${TEAL}, 0.18)`);
      drawWave(ctx, w, h, t, /*y*/ h * 0.82, /*amp*/ 14, /*freq*/ 0.010, /*speed*/ 0.0016, `rgba(${TEAL}, 0.28)`);
      drawWave(ctx, w, h, t, /*y*/ h * 0.92, /*amp*/ 22, /*freq*/ 0.008, /*speed*/ 0.0022, `rgba(${TEAL}, 0.42)`);

      // 5) Treasure glow — 하단 중앙 펄스
      const pulse = 0.55 + 0.25 * Math.sin(t * 0.0014);
      const cg = ctx.createRadialGradient(w * 0.5, h * 0.96, 4, w * 0.5, h * 0.96, Math.max(w, h) * 0.45);
      cg.addColorStop(0, `rgba(${GOLD}, ${0.45 * pulse})`);
      cg.addColorStop(0.45, `rgba(${BLOOD}, ${0.18 * pulse})`);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    },
    {
      drawStaticFn: (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "rgba(8,16,28,0.95)");
        bg.addColorStop(0.55, `rgba(${DEEP}, 0.95)`);
        bg.addColorStop(1, `rgba(${WOOD}, 0.55)`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        drawShip(ctx, w, h, 0, 0.65, 1, 0, 1, 0.5);
      },
    }
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}

/** 사인파 파도 1줄 — 채워진 곡선 */
function drawWave(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  y0: number,
  amp: number,
  freq: number,
  speed: number,
  fill: string,
) {
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const yy = y0 + Math.sin(x * freq + t * speed) * amp;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** 해적선 실루엣 — 본체(사다리꼴) + 돛 2개 + 깃발. depth = y 비율, dir = 진행 방향, speed = 가로 px/ms */
function drawShip(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  depth: number,
  dir: 1 | -1,
  speed: number,
  scale: number,
  alpha: number,
) {
  const period = w + 240;
  const raw = ((t * speed) % period + period) % period;
  const x = dir > 0 ? raw - 120 : w - raw + 120;
  const y = h * depth + Math.sin(t * 0.0009 + depth * 7) * 4; // 위아래 흔들림
  const s = scale * Math.min(1, w / 720);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(dir * s, s);
  ctx.fillStyle = `rgba(${WOOD}, 0.95)`;
  // 선체
  ctx.beginPath();
  ctx.moveTo(-50, 0);
  ctx.lineTo(50, 0);
  ctx.lineTo(40, 14);
  ctx.lineTo(-40, 14);
  ctx.closePath();
  ctx.fill();
  // 마스트
  ctx.fillStyle = "rgba(40,30,20,0.95)";
  ctx.fillRect(-2, -42, 4, 42);
  ctx.fillRect(-22, -36, 3, 36);
  ctx.fillRect(20, -36, 3, 36);
  // 돛 (어두운 회색)
  ctx.fillStyle = "rgba(70,60,55,0.95)";
  ctx.fillRect(-22, -38, 18, 30);
  ctx.fillRect(4, -38, 18, 30);
  ctx.fillRect(-12, -22, 22, 22);
  // 깃발 (혈홍)
  ctx.fillStyle = `rgba(${BLOOD}, 0.95)`;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(14, -38);
  ctx.lineTo(0, -34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
