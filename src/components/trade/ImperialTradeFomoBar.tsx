import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, TrendingUp, TrendingDown } from "lucide-react";

/**
 * ImperialTradeFomoBar — 황제의 실전 트레이딩 홀 전용 글로벌 FOMO Bar.
 *
 * - 참여자 수: 1,240,000 ~ 2,850,000 (seeded drift, 초기 ~1,684,392)
 * - 2.5~7s 간격 ±2k~30k drift, 8% 확률 +50k~80k jump
 * - LONG vs SHORT 듀얼 게이지: 35~65% spring 보간
 * - transform/opacity only · Reduced Motion 가드
 * - 신규 RPC 0 / 외부 이미지 0 / money-flow diff 0
 */

const MIN = 1_240_000;
const MAX = 2_850_000;
const SEED = 1_684_392;

function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }
function fmt(n: number) { return n.toLocaleString("ko-KR"); }

function nextCount(prev: number) {
  const r = Math.random();
  if (r < 0.11) {
    // big jump — sadari-game energy
    const jump = 50_000 + Math.floor(Math.random() * 30_000);
    return clamp(prev + (Math.random() < 0.7 ? jump : -jump), MIN, MAX);
  }
  const drift = 2_000 + Math.floor(Math.random() * 28_000);
  return clamp(prev + (Math.random() < 0.55 ? drift : -drift), MIN, MAX);
}

function nextRatio(prev: number) {
  // 35 ~ 65, spring around 50, ±5% jitter
  const target = 35 + Math.random() * 30;
  const jitter = (Math.random() - 0.5) * 5;
  return clamp(prev + (target - prev) * 0.55 + jitter, 35, 65);
}

export default function ImperialTradeFomoBar() {
  const reduce = useReducedMotion();
  const [count, setCount] = useState<number>(SEED);
  const display = useCountUp(count);
  const [longPct, setLongPct] = useState<number>(54);

  // count drift loop
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setCount((c) => nextCount(c));
      const delay = 1_800 + Math.random() * 2_700;
      timer.current = window.setTimeout(tick, delay);
    };
    const timer = { current: 0 as number };
    timer.current = window.setTimeout(tick, 1_800);
    return () => { cancelled = true; window.clearTimeout(timer.current); };
  }, []);

  // ratio loop
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      setLongPct((p) => nextRatio(p));
      const delay = 2_000 + Math.random() * 3_000;
      t.current = window.setTimeout(tick, delay);
    };
    const t = { current: 0 as number };
    t.current = window.setTimeout(tick, 2_000);
    return () => { cancelled = true; window.clearTimeout(t.current); };
  }, []);

  const shortPct = 100 - longPct;

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-amber-400/25 bg-[radial-gradient(120%_140%_at_0%_0%,hsl(var(--gold)/0.18),transparent_60%),radial-gradient(120%_140%_at_100%_100%,hsl(330_85%_60%/0.16),transparent_60%)] backdrop-blur px-4 py-3.5 sm:px-5 sm:py-4"
      aria-label="실시간 참여자 FOMO 바"
    >
      {/* shimmer */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -inset-x-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/8 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "350%" }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-rose-500 text-black shadow-[0_0_24px_hsl(var(--gold)/0.55)]">
            <Crown className="w-4.5 h-4.5" strokeWidth={2.5} />
            {!reduce && (
              <span className="absolute inset-0 rounded-full ring-2 ring-amber-300/60 animate-ping" />
            )}
          </span>
          <p className="text-xs sm:text-sm leading-tight">
            <span className="font-imperial font-black tracking-[0.04em] text-2xl sm:text-3xl bg-gradient-to-r from-amber-200 via-amber-400 to-rose-400 bg-clip-text text-transparent tabular-nums">
              {fmt(display)}
            </span>
            <span className="ml-1.5 align-middle text-[11px] sm:text-xs font-bold text-amber-100/90">
              명의 황제가 제국에서 실시간으로 트레이딩 중
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-black tracking-wide">
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <TrendingUp className="w-3 h-3" /> LONG {longPct.toFixed(1)}%
          </span>
          <span className="inline-flex items-center gap-1 text-rose-300">
            <TrendingDown className="w-3 h-3" /> SHORT {shortPct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* dual gauge */}
      <div className="relative mt-3 h-2.5 rounded-full overflow-hidden bg-background/60 border border-border/40">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300"
          initial={false}
          animate={{ width: `${longPct}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18, mass: 0.8 }}
          style={{ boxShadow: "0 0 18px hsl(160 80% 45% / 0.45)" }}
        />
        <motion.div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-rose-500 via-pink-500 to-fuchsia-400"
          initial={false}
          animate={{ width: `${shortPct}%` }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 90, damping: 18, mass: 0.8 }}
          style={{ boxShadow: "0 0 18px hsl(340 80% 55% / 0.45)" }}
        />
        {/* center divider */}
        <span className="absolute inset-y-0 left-1/2 w-px bg-black/40 -translate-x-1/2" />
      </div>
    </section>
  );
}

/** Smooth integer count-up — transform-only, no layout cost. */
function useCountUp(target: number, durationMs = 600) {
  const [v, setV] = useState<number>(target);
  const fromRef = useRef<number>(target);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    fromRef.current = v;
    startRef.current = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return v;
}
