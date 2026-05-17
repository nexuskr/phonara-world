/**
 * RewardTierBanner — 5단계 tier별 카피 + 색상.
 */
import { motion } from "framer-motion";
import type { RewardTier } from "../../types";
import { REWARD_LABEL } from "../../engine/fomo";

const TIER_COLOR: Record<RewardTier, { from: string; to: string; border: string; glow: string }> = {
  base: { from: "#1a0f05", to: "#0A0503", border: "border-amber-400/30", glow: "hsl(38 92% 60% / 0.35)" },
  surge: { from: "#2a1408", to: "#160a05", border: "border-amber-400/55", glow: "hsl(38 92% 60% / 0.55)" },
  crown: { from: "#3a1a0c", to: "#1a0a05", border: "border-amber-300/70", glow: "hsl(45 95% 65% / 0.7)" },
  empyrean: { from: "#3a0a24", to: "#1a0510", border: "border-pink-400/70", glow: "hsl(330 90% 65% / 0.7)" },
  divine: { from: "#4a0a30", to: "#1a0010", border: "border-pink-300/90", glow: "hsl(330 95% 70% / 0.95)" },
};

export function RewardTierBanner({ tier, winnerNick }: { tier: RewardTier; winnerNick: string }) {
  const c = TIER_COLOR[tier];
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={`rounded-2xl px-4 py-3 border ${c.border} text-center`}
      style={{
        background: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        boxShadow: `0 0 28px ${c.glow}`,
      }}
    >
      <div className="text-[10px] tracking-[0.32em] font-black uppercase text-amber-300/85">대관전 결과</div>
      <div className="font-imperial text-lg md:text-2xl text-amber-100 leading-tight mt-0.5"
           style={{ textShadow: `0 0 14px ${c.glow}` }}>
        {REWARD_LABEL[tier]}
      </div>
      <div className="text-[11px] text-amber-200/85 mt-0.5">{winnerNick} 승리</div>
    </motion.div>
  );
}

export default RewardTierBanner;
