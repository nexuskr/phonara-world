/**
 * Phase 4 Sprint 4 PR-1 — Imperial Header Hero (v2)
 * --------------------------------------------------
 * Imperial Duel Lobby 의 헤더 히어로.
 * - transform + opacity only (aurora 는 CSS keyframes 의 transform/opacity)
 * - framer-motion 신규 import 0
 * - glassmorphism: `.glass-card-imperial-strong` 재사용
 * - aurora 스윕: `.imperial-aurora` (저사양 / reduced-motion 자동 OFF)
 * - 카드 탭 시 light haptic
 *
 * Props 는 기존 ImperialDuelLobby 헤더가 쓰던 값과 동일하게.
 */
import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { triggerHaptic } from "@/packages/native";

type Props = {
  totalSpectators: number;
  avgJackpotPct: number;
  heatBadge: ReactNode;
};

export function ImperialHeaderHero({ totalSpectators, avgJackpotPct, heatBadge }: Props) {
  return (
    <header
      className="relative overflow-hidden rounded-3xl glass-card-imperial-strong px-4 py-4 md:px-6 md:py-5"
      style={{ contain: "paint" }}
    >
      {/* Aurora sweep — transform + opacity only */}
      <div aria-hidden className="imperial-aurora pointer-events-none absolute inset-0 -z-0" />

      <div className="relative z-10 flex items-center justify-between gap-3">
        <Link
          to="/home"
          onClick={() => triggerHaptic("light")}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300/80 hover:text-amber-200 transition-colors active:scale-[0.96] will-change-transform"
          style={{ transition: "transform 120ms cubic-bezier(.2,.8,.2,1), color 160ms ease" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" /> 황궁으로
        </Link>

        <div className="text-center min-w-0">
          <div className="text-[10px] tracking-[0.36em] font-black uppercase text-amber-400/90">
            Imperial Duel Lobby
          </div>
          <h1
            className="font-imperial text-2xl md:text-4xl text-amber-100 leading-tight truncate"
            style={{
              textShadow:
                "0 0 18px hsl(38 92% 60% / 0.6), 0 0 32px hsl(330 90% 60% / 0.3)",
            }}
          >
            황제의 대관전
          </h1>
          <p className="text-[11px] text-amber-200/80 mt-1 tabular-nums">
            관전 {totalSpectators.toLocaleString()}명 · 평균 잭팟 {Math.round(avgJackpotPct)}%
          </p>
        </div>

        <div className="shrink-0">{heatBadge}</div>
      </div>
    </header>
  );
}

export default ImperialHeaderHero;
