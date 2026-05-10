import { memo, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { sfx } from "@/lib/trading/sounds";

type FxKind = "win" | "legendary" | "liquidate" | "loss" | null;
interface Fx { kind: FxKind; pnl: number; roi: number; symbol?: string }

const queue: Fx[] = [];
let pushExternal: ((fx: Fx) => void) | null = null;

export function triggerFx(fx: Fx) {
  if (!fx.kind) return;
  if (pushExternal) pushExternal(fx);
  else queue.push(fx);
}

const RM_KEY = "phonara_reduced_motion";
function readReducedMotion(): boolean {
  try {
    const stored = localStorage.getItem(RM_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
  } catch {}
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function DopamineLayerImpl() {
  const [fx, setFx] = useState<Fx | null>(null);
  const busyRef = useRef(false);
  const localQueueRef = useRef<Fx[]>([]);
  const reducedRef = useRef<boolean>(readReducedMotion());

  useEffect(() => {
    try { localStorage.setItem(RM_KEY, reducedRef.current ? "1" : "0"); } catch {}
  }, []);

  useEffect(() => {
    const handle = (f: Fx) => {
      if (busyRef.current) { localQueueRef.current.push(f); return; }
      busyRef.current = true;
      setFx(f);
    };
    pushExternal = handle;
    // Drain any pre-mount queue
    while (queue.length) handle(queue.shift()!);
    return () => { pushExternal = null; };
  }, []);

  useEffect(() => {
    if (!fx?.kind) return;
    const reduced = reducedRef.current;

    if (!reduced && (fx.kind === "win" || fx.kind === "legendary")) {
      const big = fx.kind === "legendary";
      confetti({
        particleCount: big ? 240 : 120,
        spread: 100,
        origin: { y: 0.4 },
        scalar: big ? 1.4 : 1,
        colors: ["#f4b437","#fde68a","#a7f3d0","#34d399","#fbbf24"],
      });
      if (big) {
        setTimeout(() => confetti({ particleCount: 200, angle: 60, spread: 70, origin: { x: 0, y: 0.5 } }), 200);
        setTimeout(() => confetti({ particleCount: 200, angle: 120, spread: 70, origin: { x: 1, y: 0.5 } }), 400);
        sfx.legendary();
      } else { sfx.win(); }
    } else if (fx.kind === "win" || fx.kind === "legendary") {
      // reduced-motion: sound only
      if (fx.kind === "legendary") sfx.legendary(); else sfx.win();
    } else if (fx.kind === "liquidate") {
      sfx.liquidate();
      if (!reduced) {
        document.body.classList.add("phonara-shake");
        setTimeout(() => document.body.classList.remove("phonara-shake"), 520);
      }
    } else if (fx.kind === "loss") {
      sfx.loss();
    }

    const dur = fx.kind === "legendary" ? 3500 : fx.kind === "win" ? 2200 : 2400;
    const t = setTimeout(() => {
      setFx(null);
      busyRef.current = false;
      const next = localQueueRef.current.shift();
      if (next) {
        busyRef.current = true;
        setFx(next);
      }
    }, dur);
    return () => clearTimeout(t);
  }, [fx]);

  return (
    <>
      {/* CSS for transform-only shake (no layout thrash) */}
      <style>{`
        @keyframes phonara-shake-kf {
          0%   { transform: translate3d(0,0,0); }
          20%  { transform: translate3d(-8px,4px,0); }
          40%  { transform: translate3d(8px,-4px,0); }
          60%  { transform: translate3d(-4px,2px,0); }
          80%  { transform: translate3d(4px,-2px,0); }
          100% { transform: translate3d(0,0,0); }
        }
        body.phonara-shake { animation: phonara-shake-kf 0.5s ease-out 1; will-change: transform; }
      `}</style>

      {import.meta.env.DEV && <FpsHud />}

      {fx?.kind && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          {fx.kind === "liquidate" && (
            <div className="absolute inset-0 bg-gradient-radial from-red-600/40 via-red-900/30 to-black/0 animate-[fade_0.6s_ease-out]" />
          )}
          <div className={`relative px-8 py-6 rounded-3xl backdrop-blur-md border-2 ${
            fx.kind === "legendary" ? "border-amber-300/80 bg-amber-500/10 shadow-[0_0_120px_rgba(244,180,55,0.6)]"
            : fx.kind === "win" ? "border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_80px_rgba(52,211,153,0.5)]"
            : fx.kind === "liquidate" ? "border-red-500/80 bg-red-900/30 shadow-[0_0_120px_rgba(220,38,38,0.7)]"
            : "border-rose-400/60 bg-rose-500/10"
          }`}>
            <div className="text-center">
              <div className={`font-black tracking-[0.2em] text-xs sm:text-sm mb-1 ${
                fx.kind === "legendary" ? "text-amber-200" :
                fx.kind === "win" ? "text-emerald-200" :
                fx.kind === "liquidate" ? "text-red-200" : "text-rose-200"
              }`}>
                {fx.kind === "legendary" ? "🔥 LEGENDARY WIN 🔥"
                  : fx.kind === "win" ? "✨ WIN ✨"
                  : fx.kind === "liquidate" ? "💥 LIQUIDATED 💥"
                  : "LOSS"}
              </div>
              <div className={`font-display font-black text-3xl sm:text-5xl tabular-nums ${
                fx.kind === "legendary" ? "text-amber-100"
                  : fx.kind === "win" ? "text-emerald-100"
                  : "text-red-100"
              }`}>
                {fx.pnl >= 0 ? "+" : ""}{fx.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT
              </div>
              <div className="mt-1 text-xs font-mono tabular-nums opacity-80">
                ROI {(fx.roi * 100).toFixed(1)}% {fx.symbol ? `· ${fx.symbol}` : ""}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Lightweight FPS counter (DEV only). transform/opacity only, off main thread of paint. */
function FpsHud() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let frames = 0;
    const tick = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0; last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const color = fps >= 55 ? "text-emerald-300" : fps >= 40 ? "text-amber-300" : "text-rose-300";
  return (
    <div className={`pointer-events-none fixed top-2 right-2 z-[70] font-mono tabular-nums text-[10px] px-2 py-0.5 rounded bg-black/60 border border-white/10 ${color}`}>
      {fps} fps
    </div>
  );
}

export default memo(DopamineLayerImpl);
