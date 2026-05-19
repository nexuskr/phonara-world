/**
 * ImperialRouletteWheel — luxury wheel with gold rim, pocket gradients,
 * ball spiral-in, easeOut + micro-bounce.
 */
import { memo, forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useViewportPause } from "@pkg/games/core";
import { useGoldParticles } from "@pkg/games/core/imperial";
import {
  makeWheelSpin, ballSpiral, ROULETTE_DURATION_MS,
} from "../engine/rouletteEngine";
import { WHEEL_ORDER, colorOf } from "../types";

export interface RouletteWheelHandle {
  spin: (target: number) => Promise<number>;
}

function ImperialRouletteWheelImpl(_: {}, ref: React.Ref<RouletteWheelHandle>) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(1);
  const wheelAngleRef = useRef(0);
  const spinStateRef = useRef<{
    fn: (t: number) => number;
    startedAt: number;
    target: number;
    resolve: (n: number) => void;
  } | null>(null);
  const [highlight, setHighlight] = useState<number | null>(null);
  const { spawn, step: stepP } = useGoldParticles(64);
  const { ref: pauseRef, paused } = useViewportPause<HTMLDivElement>();
  const visible = !paused;

  useImperativeHandle(ref, () => ({
    spin: (target: number) =>
      new Promise<number>((resolve) => {
        setHighlight(null);
        spinStateRef.current = {
          fn: makeWheelSpin(target, ROULETTE_DURATION_MS, wheelAngleRef.current),
          startedAt: performance.now(),
          target,
          resolve,
        };
      }),
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = wrap;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Background wash
      const bg = ctx.createRadialGradient(W / 2, H / 2, W * 0.05, W / 2, H / 2, W * 0.7);
      bg.addColorStop(0, "hsla(260, 50%, 10%, 1)");
      bg.addColorStop(1, "hsla(340, 60%, 4%, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.46;

      // Gold rim (outer)
      const rimGrad = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.06);
      rimGrad.addColorStop(0, "hsla(45, 95%, 55%, 0.0)");
      rimGrad.addColorStop(0.55, "hsla(45, 95%, 60%, 0.95)");
      rimGrad.addColorStop(1, "hsla(35, 85%, 35%, 1)");
      ctx.fillStyle = rimGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2, true);
      ctx.fill();

      // Spin state
      let wheelAngle = wheelAngleRef.current;
      let ballRadius = 0;
      let ballAngle = 0;
      let isSpinning = false;
      if (spinStateRef.current) {
        isSpinning = true;
        const elapsed = performance.now() - spinStateRef.current.startedAt;
        wheelAngle = spinStateRef.current.fn(elapsed);
        wheelAngleRef.current = wheelAngle;
        const ball = ballSpiral(elapsed, ROULETTE_DURATION_MS);
        ballRadius = ball.radius;
        ballAngle = ball.angle;
        if (ball.settled && elapsed >= ROULETTE_DURATION_MS) {
          const { target, resolve } = spinStateRef.current;
          spinStateRef.current = null;
          setHighlight(target);
          // gold burst at result pocket
          const idx = WHEEL_ORDER.indexOf(target);
          const pocketA = idx * ((Math.PI * 2) / WHEEL_ORDER.length) + wheelAngleRef.current;
          const px = cx + Math.cos(pocketA - Math.PI / 2) * R * 0.82;
          const py = cy + Math.sin(pocketA - Math.PI / 2) * R * 0.82;
          for (let i = 0; i < 22; i++) {
            spawn(px, py, {
              vx: (Math.random() - 0.5) * 4,
              vy: -1 - Math.random() * 3,
              hue: colorOf(target) === "red" ? 0 : colorOf(target) === "green" ? 150 : 45,
              maxLife: 55,
              size: 2 + Math.random() * 2,
              alpha: 0.9,
            });
          }
          resolve(target);
        }
      }

      // Pockets
      const pocketCount = WHEEL_ORDER.length;
      const segA = (Math.PI * 2) / pocketCount;
      for (let i = 0; i < pocketCount; i++) {
        const n = WHEEL_ORDER[i];
        const a0 = wheelAngle + i * segA - Math.PI / 2 - segA / 2;
        const a1 = a0 + segA;
        const col = colorOf(n);
        const fill = col === "red" ? "hsl(0, 75%, 38%)" : col === "green" ? "hsl(150, 65%, 30%)" : "hsl(220, 25%, 10%)";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R * 0.9, a0, a1);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        // Gold pocket divider
        ctx.strokeStyle = "hsla(45, 95%, 60%, 0.5)";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        // Number
        const labelA = a0 + segA / 2;
        const lx = cx + Math.cos(labelA) * R * 0.78;
        const ly = cy + Math.sin(labelA) * R * 0.78;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(labelA + Math.PI / 2);
        ctx.fillStyle = "white";
        ctx.font = `bold ${10 * dpr}px system-ui`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(n), 0, 0);
        ctx.restore();
      }

      // Inner hub
      const hubGrad = ctx.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 0.22);
      hubGrad.addColorStop(0, "hsla(50, 100%, 80%, 1)");
      hubGrad.addColorStop(1, "hsla(35, 85%, 35%, 1)");
      ctx.fillStyle = hubGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "hsla(45, 95%, 60%, 0.9)";
      ctx.lineWidth = 2 * dpr;
      ctx.stroke();

      // Ball (spiral in during spin)
      if (isSpinning) {
        const br = R * ballRadius;
        const bx = cx + Math.cos(ballAngle - Math.PI / 2) * br;
        const by = cy + Math.sin(ballAngle - Math.PI / 2) * br;
        const bGrad = ctx.createRadialGradient(bx - 2, by - 2, 0, bx, by, 7 * dpr);
        bGrad.addColorStop(0, "white");
        bGrad.addColorStop(1, "hsla(45, 50%, 80%, 1)");
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(bx, by, 6 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = "hsla(45, 95%, 70%, 0.7)";
        ctx.shadowBlur = 10 * dpr;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (highlight != null) {
        // Settled marker
        const idx = WHEEL_ORDER.indexOf(highlight);
        const pocketA = idx * segA + wheelAngle;
        const px = cx + Math.cos(pocketA - Math.PI / 2) * R * 0.82;
        const py = cy + Math.sin(pocketA - Math.PI / 2) * R * 0.82;
        ctx.fillStyle = "white";
        ctx.shadowColor = "hsla(45, 95%, 70%, 0.95)";
        ctx.shadowBlur = 18 * dpr;
        ctx.beginPath();
        ctx.arc(px, py, 7 * dpr, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Top marker arrow
      ctx.fillStyle = "hsla(45, 95%, 60%, 0.95)";
      ctx.beginPath();
      ctx.moveTo(cx - 8 * dpr, cy - R * 1.05);
      ctx.lineTo(cx + 8 * dpr, cy - R * 1.05);
      ctx.lineTo(cx, cy - R * 0.92);
      ctx.closePath();
      ctx.fill();

      stepP(ctx, dpr);
      raf = requestAnimationFrame(draw);
    };
    if (visible) raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [visible, highlight, spawn, stepP]);

  return (
    <div
      ref={(el) => {
        wrapRef.current = el;
        pauseRef.current = el;
      }}
      className="relative w-full aspect-square max-w-md mx-auto rounded-2xl overflow-hidden border border-[hsl(var(--gold))]/30 bg-[hsl(260,50%,6%)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}

export const ImperialRouletteWheel = memo(forwardRef(ImperialRouletteWheelImpl));
export default ImperialRouletteWheel;
