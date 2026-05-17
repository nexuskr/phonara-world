/**
 * ImperialPresenceBar — v19 Round 3 FOMO core.
 * "현재 N명이 제국에서 실시간으로 황제의 거래에 참여하고 있습니다"
 *
 * - 시드: 시간 기반 의사난수 (110k~145k)
 * - 4~12s 마다 자연스러운 drift (±수십~수백), 6% 확률로 ±수천 점프
 * - useCountUp tween + Warm Gold glow + 호흡 펄스
 * - 머니플로/RPC/DB 0줄. document.hidden 가드.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Crown } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";

function seed(): number {
  // 시간 기반 시드: 같은 분 단위에서는 거의 동일한 시작점.
  const t = Math.floor(Date.now() / 60_000);
  const r = Math.sin(t) * 10_000;
  const frac = r - Math.floor(r);
  return Math.round(110_000 + frac * 35_000); // 110k ~ 145k
}

function nextValue(prev: number): number {
  const jump = Math.random() < 0.06;
  const sign = Math.random() < 0.55 ? 1 : -1;
  const delta = jump
    ? sign * (1500 + Math.floor(Math.random() * 4500))
    : sign * (20 + Math.floor(Math.random() * 380));
  const next = prev + delta;
  // soft clamp 95k~165k
  if (next < 95_000) return prev + Math.abs(delta);
  if (next > 165_000) return prev - Math.abs(delta);
  return next;
}

export default function ImperialPresenceBar() {
  const [target, setTarget] = useState<number>(() => seed());
  const animated = useCountUp(target, 1100);
  const visibleRef = useRef(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => { visibleRef.current = !document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const tick = () => {
      if (!alive) return;
      if (visibleRef.current) setTarget((p) => nextValue(p));
      const delay = 4000 + Math.random() * 8000; // 4~12s
      timer = window.setTimeout(tick, delay);
    };
    timer = window.setTimeout(tick, 3500);
    return () => { alive = false; if (timer) window.clearTimeout(timer); };
  }, []);

  const formatted = useMemo(
    () => new Intl.NumberFormat("ko-KR").format(Math.round(animated)),
    [animated]
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl border border-[hsl(var(--gold)/0.38)] bg-gradient-to-r from-amber-950/40 via-stone-950/60 to-rose-950/35 px-4 sm:px-5 py-3 sm:py-3.5"
      style={{ contain: "layout paint" }}
    >
      {/* ambient breathing glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(40% 120% at 10% 50%, hsl(var(--gold)/0.22), transparent 70%), radial-gradient(40% 120% at 90% 50%, hsl(var(--pink)/0.18), transparent 70%)",
          animation: "presence-breath 4.6s ease-in-out infinite",
        }}
      />
      {/* moving shimmer */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -inset-x-1/2 -z-10 opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--gold)/0.25) 50%, transparent 100%)",
          animation: "presence-shimmer 6s linear infinite",
        }}
      />

      <div className="flex items-center gap-3">
        <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_0_22px_hsl(var(--gold)/0.7)] shrink-0">
          <Crown className="w-4.5 h-4.5" />
          <span aria-hidden className="absolute inset-0 rounded-xl ring-2 ring-[hsl(var(--gold)/0.4)] animate-pulse" />
        </span>

        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-[10px] tracking-[0.32em] font-black text-[hsl(var(--gold))] uppercase">
            Imperial Presence · Live
          </div>
          <div className="mt-0.5 text-[13px] sm:text-[14px] text-foreground/90 font-semibold break-keep">
            현재{" "}
            <span className="font-mono font-black text-[hsl(var(--gold))] text-base sm:text-lg tabular-nums drop-shadow-[0_0_14px_hsl(var(--gold)/0.8)]">
              {formatted}
            </span>
            명이 제국에서 실시간으로 황제의 거래에 참여하고 있습니다
          </div>
        </div>
      </div>

      <style>{`
        @keyframes presence-breath {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.95; }
        }
        @keyframes presence-shimmer {
          0%   { transform: translateX(-30%); }
          100% { transform: translateX(60%); }
        }
      `}</style>
    </div>
  );
}
