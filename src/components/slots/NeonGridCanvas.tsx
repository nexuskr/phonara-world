// NeonGridCanvas — Cyberpunk neon grid + 비스듬히 떨어지는 rain + 미니 flying car.
// useAnimatedCanvas로 RAF/dpr/visibility/RO/cleanup 자동화 (60fps cap).
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

interface RainDrop { x: number; y: number; vy: number; len: number; hue: number; alpha: number; }
interface FlyingCar { x: number; y: number; vx: number; hue: number; size: number; }
interface State { drops: RainDrop[]; cars: FlyingCar[]; }

const RAIN_CAP = 50;
const CAR_CAP = 3;

export default function NeonGridCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const drops: RainDrop[] = [];
      for (let i = 0; i < RAIN_CAP; i++) {
        drops.push({
          x: Math.random() * w, y: Math.random() * h,
          vy: 2 + Math.random() * 3,
          len: 8 + Math.random() * 18,
          hue: Math.random() < 0.5 ? 320 : 195,
          alpha: 0.25 + Math.random() * 0.45,
        });
      }
      const cars: FlyingCar[] = [];
      for (let i = 0; i < CAR_CAP; i++) {
        cars.push({
          x: Math.random() * w,
          y: 30 + Math.random() * (h * 0.5),
          vx: 0.6 + Math.random() * 0.8,
          hue: [115, 320, 195][i % 3],
          size: 2 + Math.random() * 1.5,
        });
      }
      return { drops, cars };
    },
    (ctx, w, h, t, { drops, cars }) => {
      ctx.clearRect(0, 0, w, h);
      drawGrid(ctx, w, h, Math.sin(t * 0.0001) * 8);
      // Rain
      for (const d of drops) {
        d.y += d.vy; d.x -= d.vy * 0.15;
        if (d.y - d.len > h || d.x < -10) {
          d.x = Math.random() * (w + 40);
          d.y = -d.len;
        }
        ctx.strokeStyle = `hsla(${d.hue}, 100%, 65%, ${d.alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vy * 0.15 * d.len * 0.3, d.y - d.len);
        ctx.stroke();
      }
      // Flying cars
      for (const c of cars) {
        c.x += c.vx; if (c.x > w + 20) c.x = -20;
        ctx.fillStyle = `hsla(${c.hue}, 100%, 70%, 0.95)`;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `hsla(${c.hue}, 100%, 70%, 0.55)`;
        ctx.lineWidth = c.size * 0.8;
        ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x - 22, c.y); ctx.stroke();
      }
    },
    {
      drawStaticFn: (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        drawGrid(ctx, w, h, 0);
      },
    }
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number) {
  ctx.save();
  ctx.lineWidth = 1;
  const horizon = h * 0.45;
  for (let i = 0; i < 14; i++) {
    const k = i / 14;
    const y = horizon + (h - horizon) * (k * k);
    const a = 0.10 + k * 0.30;
    ctx.strokeStyle = `hsla(320, 100%, 60%, ${a})`;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  const vpx = w * 0.5;
  const vpy = horizon;
  const cols = 14;
  for (let i = -cols; i <= cols; i++) {
    const x = vpx + (w / cols) * i + offset;
    ctx.strokeStyle = `hsla(195, 100%, 55%, 0.18)`;
    ctx.beginPath(); ctx.moveTo(vpx, vpy); ctx.lineTo(x, h); ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, "rgba(120,0,80,0.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
  ctx.restore();
}
