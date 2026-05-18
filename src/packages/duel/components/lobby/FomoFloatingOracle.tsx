/**
 * FomoFloatingOracle — Personalized FOMO 떠다니는 오라클.
 * Sprint 4 PR-4: swipe-up Oracle expansion + duel-card-glass + mini imperial-aurora
 *                + haptic + DynamicIsland. framer-motion import removed (-1).
 * - transform + opacity only (CSS animate-fade-in keyframe reused)
 * - reduced-motion / reduced-transparency / low-end fallback inherits from index.css
 * - 0 money-flow, 0 imperial_* RPC, 0 useFomoOracle logic touched
 */
import { Sparkles } from "lucide-react";
import type { FomoSignals } from "@pkg/duel";
import { triggerHaptic, useSwipeGesture } from "@/packages/native";
import { dynamicIsland } from "@/packages/native/useDynamicIsland";

const TRIGGER_LABEL: Record<string, string> = {
  near_miss_streak: "황제의 운이 가까이",
  win_drought: "승리가 그리워질 때",
  royal_pass_milestone: "황실 패스 임박",
  session_resurrection: "다시 강림하신 폐하",
  heat_surge: "황실이 끓어오릅니다",
};

export function FomoFloatingOracle({
  signals,
  onOpenOracle,
}: {
  signals: FomoSignals;
  onOpenOracle: () => void;
}) {
  const top = signals.triggers[0];

  const openWith = (kind: "tap" | "swipe") => {
    triggerHaptic(kind === "swipe" ? "medium" : "light");
    if (kind === "swipe") {
      dynamicIsland.show({ kind: "info", text: "오라클 확장 중…", ttl: 1200 });
    }
    onOpenOracle();
  };

  const swipeRef = useSwipeGesture<HTMLDivElement>({
    threshold: 40,
    velocity: 0.25,
    onSwipe: (dir) => {
      if (dir === "up") openWith("swipe");
    },
  });

  return (
    <div
      ref={swipeRef}
      className="fixed z-40 right-3 bottom-20 md:bottom-6 max-w-[260px] animate-fade-in"
      style={{ contain: "paint" }}
    >
      <button
        type="button"
        onClick={() => openWith("tap")}
        className={[
          "duel-card-glass relative overflow-hidden text-left rounded-2xl p-3 w-full",
          "border border-amber-400/40",
          "transition-transform duration-[140ms] ease-[cubic-bezier(.2,.8,.2,1)]",
          "hover:scale-[1.01] active:scale-[0.985] outline-none",
          "focus-visible:ring-2 focus-visible:ring-amber-300/60 will-change-transform",
        ].join(" ")}
        style={{
          transform: "translateZ(0)",
          boxShadow: "0 18px 42px -12px hsl(330 90% 50% / 0.45)",
        }}
        aria-label="황실 검증 오라클 열기 — 위로 스와이프 또는 탭"
      >
        <span
          aria-hidden
          className="imperial-aurora pointer-events-none absolute inset-0 rounded-2xl opacity-30"
        />
        <div className="relative flex items-center gap-2">
          <span className="inline-flex w-7 h-7 rounded-xl grid place-items-center bg-gradient-to-br from-amber-400 to-pink-500 text-[#1a0a05]">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-[0.24em] font-black uppercase text-amber-300/85">
              Personal Oracle
            </div>
            <div className="text-[12px] font-bold text-amber-100 truncate">
              FOMO {signals.personalScore}
            </div>
          </div>
          <span className="text-[9px] tracking-[0.18em] font-black text-amber-300/70 opacity-70 shrink-0">
            ↑ SWIPE
          </span>
        </div>
        <p className="relative mt-2 text-[11px] text-amber-100/90 break-keep leading-snug">
          {top ? TRIGGER_LABEL[top] : "황제 폐하의 순간이 다가옵니다"}
        </p>
        <div className="relative mt-2 h-1.5 rounded-full bg-black/55 overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${signals.personalScore}%`,
              background: "linear-gradient(90deg,#F5C518,#F472B6)",
              boxShadow: "0 0 10px hsl(330 90% 60% / 0.5)",
            }}
          />
        </div>
        <div className="relative mt-2 text-[10px] text-pink-300/80 tracking-[0.18em] font-black uppercase">
          황실의 검증 오라클 열기 →
        </div>
      </button>
    </div>
  );
}

export default FomoFloatingOracle;
