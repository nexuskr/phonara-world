// SakuraPetalCanvas — Cherry Sakura Signature 배경.
// 따뜻하고 우아한 한/일 퓨전 사쿠라. Low volatility 슬롯에 맞춘 느린 낙화 + lantern glow.
// useAnimatedCanvas (dpr=1, 60fps cap, visibility/RO/cleanup 자동).
import { useAnimatedCanvas, ANIMATED_CANVAS_STYLE } from "@/hooks/useAnimatedCanvas";

interface Petal {
  x: number;
  y: number;
  vy: number;     // 0.25 ~ 0.55 — 다른 슬롯의 절반
  vxAmp: number;  // 바람 진동 폭
  phase: number;
  rot: number;
  rotSpd: number;
  size: number;
  hueIdx: number; // 0/1/2 → COLORS
}

interface State {
  petals: Petal[];
  bg: HTMLCanvasElement | null;
}

const COLORS = ["#fbcfe8", "#fda4af", "#fff1f5"];   // soft pink / blush / cream
const PETAL_COUNT = 45;

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function makePetal(w: number, h: number, seedTop = false): Petal {
  return {
    x: Math.random() * w,
    y: seedTop ? Math.random() * h : -rand(20, 80),
    vy: rand(0.25, 0.55),
    vxAmp: rand(0.4, 1.1),
    phase: Math.random() * Math.PI * 2,
    rot: Math.random() * Math.PI * 2,
    rotSpd: rand(-0.012, 0.012),
    size: rand(6, 12),
    hueIdx: (Math.random() * 3) | 0,
  };
}

// 한 장의 페탈을 그리는 함수 — 쿼드러틱 베지어 2개로 자연스러운 잎 모양.
function drawPetal(ctx: CanvasRenderingContext2D, p: Petal) {
  const s = p.size;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = COLORS[p.hueIdx];
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.85, -s * 0.2, 0, s);
  ctx.quadraticCurveTo(-s * 0.85, -s * 0.2, 0, -s);
  ctx.fill();
  // 가운데 미세한 골드 라인 — 고급감
  ctx.strokeStyle = "rgba(253, 230, 138, 0.35)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.7);
  ctx.lineTo(0, s * 0.7);
  ctx.stroke();
  ctx.restore();
}

// 원경 — 산 실루엣 + 사쿠라 나무. setup 시 1회만 그려서 offscreen 캔버스에 캐시.
function paintBackdrop(bg: HTMLCanvasElement, w: number, h: number) {
  bg.width = w;
  bg.height = h;
  const c = bg.getContext("2d");
  if (!c) return;

  // 따뜻한 새벽 하늘 그라디언트
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#3d2540");        // deep plum
  sky.addColorStop(0.45, "#7d3a55");     // warm wine
  sky.addColorStop(0.85, "#d49aa6");     // sakura sunset
  sky.addColorStop(1, "#f4d0c2");        // peach horizon
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  // 멀리 산 — 두 겹
  c.fillStyle = "rgba(60, 30, 60, 0.55)";
  c.beginPath();
  c.moveTo(0, h * 0.78);
  c.lineTo(w * 0.18, h * 0.62);
  c.lineTo(w * 0.32, h * 0.72);
  c.lineTo(w * 0.5, h * 0.55);
  c.lineTo(w * 0.7, h * 0.7);
  c.lineTo(w * 0.85, h * 0.6);
  c.lineTo(w, h * 0.74);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fill();

  c.fillStyle = "rgba(40, 20, 45, 0.7)";
  c.beginPath();
  c.moveTo(0, h * 0.88);
  c.lineTo(w * 0.22, h * 0.78);
  c.lineTo(w * 0.45, h * 0.86);
  c.lineTo(w * 0.6, h * 0.76);
  c.lineTo(w * 0.82, h * 0.84);
  c.lineTo(w, h * 0.8);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.closePath();
  c.fill();

  // 우측 하단 사쿠라 나무 실루엣 + 분홍 캐노피
  const tx = w * 0.82;
  const ty = h * 0.92;
  c.strokeStyle = "rgba(20, 10, 20, 0.85)";
  c.lineWidth = Math.max(2, w * 0.004);
  c.beginPath();
  c.moveTo(tx, ty);
  c.lineTo(tx - w * 0.02, ty - h * 0.18);
  c.moveTo(tx - w * 0.02, ty - h * 0.18);
  c.lineTo(tx - w * 0.06, ty - h * 0.22);
  c.moveTo(tx - w * 0.02, ty - h * 0.18);
  c.lineTo(tx + w * 0.02, ty - h * 0.24);
  c.stroke();

  // 캐노피 — 부드러운 핑크 클러스터
  const canopy = c.createRadialGradient(
    tx - w * 0.02, ty - h * 0.22, 0,
    tx - w * 0.02, ty - h * 0.22, Math.max(40, w * 0.08)
  );
  canopy.addColorStop(0, "rgba(252, 207, 232, 0.75)");
  canopy.addColorStop(1, "rgba(252, 207, 232, 0)");
  c.fillStyle = canopy;
  c.beginPath();
  c.arc(tx - w * 0.02, ty - h * 0.22, Math.max(40, w * 0.08), 0, Math.PI * 2);
  c.fill();

  // 좌측에 작은 나무 한 그루 더 — 균형
  const tx2 = w * 0.12;
  const ty2 = h * 0.88;
  c.strokeStyle = "rgba(20, 10, 20, 0.7)";
  c.lineWidth = Math.max(1.5, w * 0.003);
  c.beginPath();
  c.moveTo(tx2, ty2);
  c.lineTo(tx2 + w * 0.015, ty2 - h * 0.12);
  c.stroke();
  const c2 = c.createRadialGradient(
    tx2 + w * 0.015, ty2 - h * 0.14, 0,
    tx2 + w * 0.015, ty2 - h * 0.14, Math.max(28, w * 0.05)
  );
  c2.addColorStop(0, "rgba(253, 164, 175, 0.55)");
  c2.addColorStop(1, "rgba(253, 164, 175, 0)");
  c.fillStyle = c2;
  c.beginPath();
  c.arc(tx2 + w * 0.015, ty2 - h * 0.14, Math.max(28, w * 0.05), 0, Math.PI * 2);
  c.fill();
}

export default function SakuraPetalCanvas() {
  const ref = useAnimatedCanvas<State>(
    (_ctx, w, h) => {
      const bg = typeof document !== "undefined" ? document.createElement("canvas") : null;
      if (bg) paintBackdrop(bg, w, h);
      const petals: Petal[] = [];
      for (let i = 0; i < PETAL_COUNT; i++) petals.push(makePetal(w, h, true));
      return { petals, bg };
    },
    (ctx, w, h, t, state) => {
      // 1) 원경 (정적 캐시)
      if (state.bg) ctx.drawImage(state.bg, 0, 0, w, h);
      else ctx.clearRect(0, 0, w, h);

      // 2) 부드러운 안개 — 1 path, 매우 옅은 alpha
      const fogShift = Math.sin(t / 4200) * w * 0.05;
      const fog = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.85);
      fog.addColorStop(0, "rgba(255, 240, 245, 0)");
      fog.addColorStop(0.5, "rgba(255, 240, 245, 0.10)");
      fog.addColorStop(1, "rgba(255, 240, 245, 0)");
      ctx.fillStyle = fog;
      ctx.fillRect(fogShift, h * 0.55, w, h * 0.3);

      // 3) lantern glow 펄스 — 중앙 살짝 위, 따뜻한 골드
      const breathe = 0.55 + Math.sin(t / 1200) * 0.18;
      const lx = w * 0.5;
      const ly = h * 0.42;
      const lr = Math.max(80, w * 0.18);
      const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, lr);
      glow.addColorStop(0, `rgba(253, 230, 138, ${0.42 * breathe})`);
      glow.addColorStop(0.45, `rgba(251, 191, 36, ${0.18 * breathe})`);
      glow.addColorStop(1, "rgba(251, 191, 36, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly, lr, 0, Math.PI * 2);
      ctx.fill();

      // 4) 벚꽃 페탈 — 느린 낙화 + sin 바람
      ctx.globalAlpha = 1;
      for (const p of state.petals) {
        p.y += p.vy;
        p.x += Math.sin(t / 1800 + p.phase) * p.vxAmp * 0.6;
        p.rot += p.rotSpd;
        if (p.y > h + 24) {
          p.y = -rand(20, 80);
          p.x = Math.random() * w;
        }
        drawPetal(ctx, p);
      }
    },
    {
      fpsCap: 60,
      dpr: 1,
      pauseOnHidden: true,
      drawStaticFn: (ctx, w, h, state) => {
        if (state.bg) ctx.drawImage(state.bg, 0, 0, w, h);
        for (const p of state.petals) drawPetal(ctx, p);
      },
    }
  );

  return <canvas ref={ref} style={ANIMATED_CANVAS_STYLE} aria-hidden />;
}
