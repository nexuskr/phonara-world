// WizardMagicCanvas — Mystic 마법진 + 부유 룬 + 미스트 + 마법탑 글로우.
// useAnimatedCanvas로 RAF/dpr/visibility/RO/cleanup 자동화 (60fps cap).
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

const VIOLET = "139,92,246";
const GOLD = "251,191,36";
const BLUE = "34,211,238";

const RUNE_GLYPHS = ["ᚠ", "ᚢ", "ᚦ", "ᚨ", "ᚱ", "ᚲ", "ᚷ", "ᚹ", "ᚺ", "ᛁ", "ᛃ", "ᛇ"];
const RUNE_CAP = 12;
const MIST_CAP = 40;

interface Rune {
  x: number; y: number; tx: number; ty: number;
  hue: number; glyph: string;
  rot: number; vrot: number; alpha: number;
}
interface Mist { x: number; y: number; vx: number; vy: number; r: number; alpha: number; }
interface State { runes: Rune[]; mists: Mist[]; }

export default function WizardMagicCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const runes: Rune[] = [];
      for (let i = 0; i < RUNE_CAP; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h * 0.85;
        runes.push({
          x, y, tx: x, ty: y, hue: i % 3,
          glyph: RUNE_GLYPHS[i % RUNE_GLYPHS.length],
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.005,
          alpha: 0.45 + Math.random() * 0.35,
        });
      }
      const mists: Mist[] = [];
      for (let i = 0; i < MIST_CAP; i++) {
        mists.push({
          x: Math.random() * w,
          y: h * 0.5 + Math.random() * h * 0.5,
          vx: (Math.random() - 0.5) * 0.25,
          vy: -0.1 - Math.random() * 0.25,
          r: 18 + Math.random() * 36,
          alpha: 0.04 + Math.random() * 0.08,
        });
      }
      return { runes, mists };
    },
    (ctx, w, h, t, { runes, mists }) => {
      // 페이드 클리어 (잔상 mist 살리기)
      ctx.fillStyle = "rgba(8,4,18,0.22)";
      ctx.fillRect(0, 0, w, h);
      // 배경 nebula glow
      const ng = ctx.createRadialGradient(w * 0.5, h * 0.55, 30, w * 0.5, h * 0.55, Math.max(w, h) * 0.6);
      ng.addColorStop(0, `rgba(${VIOLET}, 0.10)`);
      ng.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ng;
      ctx.fillRect(0, 0, w, h);
      // Mist
      for (const m of mists) {
        m.x += m.vx; m.y += m.vy;
        if (m.y < -m.r) { m.x = Math.random() * w; m.y = h + m.r; }
        if (m.x < -m.r) m.x = w + m.r; else if (m.x > w + m.r) m.x = -m.r;
        const mg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
        mg.addColorStop(0, `rgba(${BLUE}, ${m.alpha})`);
        mg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = mg;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
      // 마법진 2겹 (역방향)
      const cx = w * 0.5, cy = h * 0.55;
      const radius = Math.min(w, h) * 0.28;
      drawCircle(ctx, cx, cy, radius, t, 1);
      drawCircle(ctx, cx, cy, radius * 0.62, t, -1);
      // Runes — smoothed lerp + 회전
      for (const r of runes) {
        if (Math.random() < 0.004) {
          r.tx = Math.random() * w;
          r.ty = Math.random() * h * 0.85;
        }
        r.x += (r.tx - r.x) * 0.012;
        r.y += (r.ty - r.y) * 0.012;
        r.rot += r.vrot;
        const color = r.hue === 0 ? VIOLET : r.hue === 1 ? GOLD : BLUE;
        ctx.save();
        ctx.translate(r.x, r.y);
        ctx.rotate(r.rot);
        ctx.font = "20px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = `rgba(${color}, ${r.alpha})`;
        ctx.shadowColor = `rgba(${color}, 0.85)`;
        ctx.shadowBlur = 12;
        ctx.fillText(r.glyph, 0, 0);
        ctx.restore();
      }
      drawTowerGlow(ctx, w, h, t);
    },
    {
      drawStaticFn: (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const g = ctx.createRadialGradient(w * 0.5, h * 0.62, 20, w * 0.5, h * 0.62, Math.max(w, h) * 0.7);
        g.addColorStop(0, `rgba(${VIOLET}, 0.30)`);
        g.addColorStop(0.5, `rgba(${BLUE}, 0.10)`);
        g.addColorStop(1, "rgba(0,0,0,0.85)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        drawTowerGlow(ctx, w, h, 0);
      },
    }
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  t: number, dir: 1 | -1
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.0003 * dir);
  ctx.strokeStyle = `rgba(${GOLD}, 0.55)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = `rgba(${VIOLET}, 0.55)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = Math.cos(a) * radius * 0.92;
    const y = Math.sin(a) * radius * 0.92;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath(); ctx.stroke();
  ctx.fillStyle = `rgba(${BLUE}, 0.75)`;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * radius * 1.05;
    const y = Math.sin(a) * radius * 1.05;
    ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawTowerGlow(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  const cx = w * 0.5;
  const cy = h * 0.95;
  const pulse = 0.55 + 0.25 * Math.sin(t * 0.001);
  ctx.save();
  ctx.fillStyle = "rgba(20,10,40,0.55)";
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy);
  ctx.lineTo(cx - 22, cy - h * 0.18);
  ctx.lineTo(cx, cy - h * 0.30);
  ctx.lineTo(cx + 22, cy - h * 0.18);
  ctx.lineTo(cx + 22, cy);
  ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(cx, cy - h * 0.30, 2, cx, cy - h * 0.30, 110);
  g.addColorStop(0, `rgba(${GOLD}, ${pulse})`);
  g.addColorStop(0.5, `rgba(${VIOLET}, ${pulse * 0.5})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(cx - 130, cy - h * 0.30 - 130, 260, 260);
  ctx.restore();
}
