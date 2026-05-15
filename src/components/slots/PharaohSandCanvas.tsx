// PharaohSandCanvas — 미세 모래 바람 + 부유 hieroglyph + 피라미드 실루엣 glow + scarab 비행.
// useAnimatedCanvas로 RAF/dpr/visibility/RO/cleanup 자동화 (60fps cap).
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

const GOLD = "234,179,8";      // amber-500
const INDIGO = "99,102,241";   // indigo-500
const EMERALD = "16,185,129";  // emerald-500
const SAND = "217,119,6";      // amber-600

interface SandParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number;
}
interface Hieroglyph {
  x: number; y: number; char: string; size: number;
  speed: number; alpha: number; phase: number;
}
interface Scarab {
  x: number; y: number; angle: number; speed: number; r: number;
}
interface State {
  sand: SandParticle[];
  glyphs: Hieroglyph[];
  scarabs: Scarab[];
}

const SAND_CAP = 40;
const GLYPH_CAP = 9;
const SCARAB_CAP = 3;
const GLYPH_CHARS = ["𓂀", "𓃭", "𓆣", "𓇳", "𓈖", "𓉐", "𓊝", "𓋹", "𓌂"];

export default function PharaohSandCanvas({ className = "" }: { className?: string }) {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const sand: SandParticle[] = [];
      for (let i = 0; i < SAND_CAP; i++) {
        sand.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: 0.3 + Math.random() * 0.6,
          vy: (Math.random() - 0.5) * 0.15,
          size: 0.6 + Math.random() * 1.8,
          alpha: 0.15 + Math.random() * 0.35,
        });
      }
      const glyphs: Hieroglyph[] = [];
      for (let i = 0; i < GLYPH_CAP; i++) {
        glyphs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          char: GLYPH_CHARS[i % GLYPH_CHARS.length],
          size: 14 + Math.random() * 22,
          speed: 0.15 + Math.random() * 0.25,
          alpha: 0.08 + Math.random() * 0.18,
          phase: Math.random() * Math.PI * 2,
        });
      }
      const scarabs: Scarab[] = [];
      for (let i = 0; i < SCARAB_CAP; i++) {
        scarabs.push({
          x: Math.random() * w,
          y: 0.15 * h + Math.random() * h * 0.7,
          angle: Math.random() * Math.PI * 2,
          speed: 0.003 + Math.random() * 0.004,
          r: 40 + Math.random() * 80,
        });
      }
      return { sand, glyphs, scarabs };
    },
    (ctx, w, h, t, { sand, glyphs, scarabs }) => {
      // 페이드 클리어 (모래 잔상)
      ctx.fillStyle = "rgba(12,10,28,0.28)";
      ctx.fillRect(0, 0, w, h);

      // 피라미드 실루엣 glow — 하단 중앙
      const pulse = 0.6 + 0.2 * Math.sin(t * 0.0007);
      const pyramidGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
      pyramidGrad.addColorStop(0, `rgba(${GOLD}, 0)`);
      pyramidGrad.addColorStop(0.5, `rgba(${GOLD}, ${0.06 * pulse})`);
      pyramidGrad.addColorStop(1, `rgba(${SAND}, ${0.14 * pulse})`);
      ctx.fillStyle = pyramidGrad;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);

      // 피라미드 코어 글로우
      const coreGlow = ctx.createRadialGradient(w * 0.5, h * 0.92, 6, w * 0.5, h * 0.92, Math.max(w, h) * 0.45);
      coreGlow.addColorStop(0, `rgba(${GOLD}, ${0.35 * pulse})`);
      coreGlow.addColorStop(0.35, `rgba(${INDIGO}, ${0.12 * pulse})`);
      coreGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(0, h * 0.45, w, h * 0.55);

      // 모래 입자 — 미세 바람 흐름
      for (const p of sand) {
        p.x += p.vx + Math.sin((t + p.y) * 0.0012) * 0.08;
        p.y += p.vy;
        if (p.x > w + 4) { p.x = -4; p.y = Math.random() * h; }
        if (p.y < -2) p.y = h + 2;
        if (p.y > h + 2) p.y = -2;
        ctx.fillStyle = `rgba(${SAND}, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hieroglyph — 부유 + 페이드 펄스
      ctx.font = "24px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const g of glyphs) {
        g.y -= g.speed;
        if (g.y < -30) { g.y = h + 30; g.x = Math.random() * w; }
        const glyphPulse = 0.5 + 0.5 * Math.sin(t * 0.0012 + g.phase);
        ctx.font = `${g.size}px serif`;
        ctx.fillStyle = `rgba(${GOLD}, ${g.alpha * glyphPulse})`;
        ctx.shadowColor = `rgba(${GOLD}, 0.5)`;
        ctx.shadowBlur = 8;
        ctx.fillText(g.char, g.x, g.y);
      }
      ctx.shadowBlur = 0;

      // Scarab beetle — 타원 궤도 비행
      for (const s of scarabs) {
        s.angle += s.speed;
        const cx = w * 0.5 + Math.cos(s.angle) * s.r * (w / 400);
        const cy = h * 0.5 + Math.sin(s.angle * 0.7) * s.r * 0.4 * (h / 400);
        const beetlePulse = 0.4 + 0.2 * Math.sin(t * 0.002 + s.angle);
        ctx.fillStyle = `rgba(${EMERALD}, ${beetlePulse})`;
        ctx.shadowColor = `rgba(${EMERALD}, 0.9)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 5, 3, s.angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    },
    {
      drawStaticFn: (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        // 정적 피라미드 베이스
        const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
        baseGrad.addColorStop(0, "rgba(15,12,35,0.90)");
        baseGrad.addColorStop(0.55, "rgba(25,18,50,0.70)");
        baseGrad.addColorStop(1, `rgba(${SAND}, 0.35)`);
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, w, h);
        // 정적 피라미드 실루엣
        const pGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
        pGrad.addColorStop(0, `rgba(${GOLD}, 0.04)`);
        pGrad.addColorStop(1, `rgba(${SAND}, 0.12)`);
        ctx.fillStyle = pGrad;
        ctx.fillRect(0, h * 0.6, w, h * 0.4);
      },
    }
  );

  return <canvas ref={ref} aria-hidden className={className} style={ANIMATED_CANVAS_STYLE} />;
}
