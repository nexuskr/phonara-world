// NeonMaxWinOverlay — System Hacked + Matrix rain cinematic on BaseMaxWinOverlay.
import { useEffect, useRef } from "react";
import { Zap } from "lucide-react";
import BaseMaxWinOverlay from "@/components/celebration/BaseMaxWinOverlay";

const MATRIX_CHARS = "アカサタナハマヤラワ0123456789@#$%";

/** Matrix rain canvas — 슬롯별 cinematic. data 변경마다 마운트 → 자동 cleanup. */
function MatrixRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.floor(r.width);
      canvas.height = Math.floor(r.height);
    };
    resize();

    const fontSize = 16;
    const cols = Math.floor(canvas.width / fontSize);
    const ys: number[] = Array.from({ length: cols }, () => Math.random() * canvas.height);
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "rgba(57,255,20,0.85)";
      for (let i = 0; i < cols; i++) {
        const ch = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
        ctx.fillText(ch, i * fontSize, ys[i]);
        ys[i] += fontSize;
        if (ys[i] > canvas.height && Math.random() > 0.975) ys[i] = 0;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 w-full h-full"
      style={{ transform: "translate3d(0,0,0)", willChange: "transform" }}
    />
  );
}

interface Props {
  triggerAt?: number;
  durationMs?: number;
}

export default function NeonMaxWinOverlay({ triggerAt = 8888, durationMs = 3200 }: Props) {
  return (
    <BaseMaxWinOverlay
      triggerAt={triggerAt}
      durationMs={durationMs}
      ariaLabel="Neon Max Win"
      soundKeys={{ primary: "legendary_win" }}
      titleText="SYSTEM HACKED"
      icon={
        <Zap
          className="h-20 w-20 sm:h-28 sm:w-28 text-lime-300 mb-3"
          style={{
            filter:
              "drop-shadow(0 0 30px rgba(57,255,20,0.95)) drop-shadow(0 0 60px rgba(255,0,255,0.7))",
          }}
        />
      }
      cinematic={() => <MatrixRain />}
      palette={{
        backdrop:
          "radial-gradient(circle at 50% 50%, rgba(255,0,255,0.40) 0%, rgba(0,240,255,0.18) 40%, rgba(0,0,0,0.82) 100%)",
        flareLeft: "linear-gradient(90deg, rgba(255,0,255,0.7) 0%, rgba(255,0,255,0) 100%)",
        flareRight: "linear-gradient(270deg, rgba(0,240,255,0.7) 0%, rgba(0,240,255,0) 100%)",
        confettiColors: ["#ff00ff", "#00f0ff", "#39ff14", "#f472b6", "#22d3ee"],
        titleGradientClass: "bg-gradient-to-r from-fuchsia-300 via-lime-300 to-cyan-300",
        titleGlow: "drop-shadow(0 0 24px rgba(255,0,255,0.9))",
        multiplierTextClass: "text-cyan-100",
        multiplierTextShadow: "0 0 14px rgba(0,240,255,0.85)",
        subTextClass: "text-lime-200",
      }}
      confettiBursts={[
        { delay: 0, originY: 0.5, scalar: 1.4, spread: 120, startVelocity: 65 },
        { delay: 400, originY: 0.3, scalar: 1.4, spread: 120, startVelocity: 65 },
        { delay: 900, originY: 0.62, scalar: 1.4, spread: 120, startVelocity: 65 },
      ]}
    />
  );
}
