import { NavLink } from "react-router-dom";
import { Sparkles, Crown } from "lucide-react";
import { useMyPower } from "@/hooks/use-my-power";

/**
 * PhonAdvantageRibbon — PHON 차별화 강조 리본.
 * Gold + Hot Pink 그라디언트로 시선 집중.
 */
export default function PhonAdvantageRibbon() {
  const { phon, maxLeverage } = useMyPower();
  const hasPhon = phon > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-400/15 via-rose-500/15 to-pink-500/15 px-4 py-3">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at left, hsla(45,95%,60%,0.35), transparent 60%), radial-gradient(ellipse at right, hsla(330,85%,60%,0.35), transparent 60%)",
        }}
      />
      <div className="relative flex items-center gap-3 flex-wrap">
        <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-300 to-pink-500 text-white shadow-lg shadow-pink-500/30">
          <Crown className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-black tracking-[0.18em] text-amber-300/95">
            PHON 황제 전용 혜택
          </div>
          <div className="text-sm sm:text-base font-extrabold leading-tight mt-0.5">
            <span className="text-amber-200">하우스 에지 -20% 할인</span>
            <span className="text-foreground/80"> · </span>
            <span className="text-pink-200">레버리지 최대 100x</span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {hasPhon
              ? `폐하의 현재 최대 레버리지 ${maxLeverage}x · PHON 보유 ${Math.floor(phon).toLocaleString()} P`
              : "폐하, PHON을 보유하시면 수수료가 즉시 20% 할인됩니다"}
          </div>
        </div>
        <NavLink
          to="/wallet?tab=deposit"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-pink-500 text-white text-xs font-black tracking-wide shadow-md shadow-pink-500/30 hover:opacity-95 min-h-12 sm:min-h-0"
        >
          <Sparkles className="w-3.5 h-3.5" /> PHON 채우기
        </NavLink>
      </div>
    </div>
  );
}
