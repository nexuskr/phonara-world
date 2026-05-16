/**
 * PowerHeader — fixed top-right HUD.
 * Shows: 👑 LEVEL · 💰 PHON · ⚡ +X% (cap 100%) · 🚀 maxLev
 * Pulses when power state changes. Clicking opens /empire/collection.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Coins, Zap, Rocket } from "lucide-react";
import { useMyPower, topNftLevel } from "@/hooks/use-my-power";
import CrownAura from "@/components/empire/CrownAura";
import NftAvatar from "@/components/profile/NftAvatar";
import { FloatingSlot } from "@/components/ui/floating-dock";
import VipPassBadge from "@/components/empire/VipPassBadge";
import EquippedAvatarChip from "@/components/avatar/EquippedAvatarChip";

const LEVEL_TIER: Record<string, number> = { bronze: 5, gold: 7, diamond: 10 };
const LEVEL_LABEL: Record<string, string> = { bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND" };

export default function PowerHeader() {
  const { phon, nfts, boostPct, maxLeverage, loading } = useMyPower();
  const [pulseKey, setPulseKey] = useState(0);

  useEffect(() => { setPulseKey((k) => k + 1); }, [phon, boostPct, maxLeverage]);

  if (loading) return null;
  // 미로그인이거나 활동 없음(0 PHON, 0 NFT)에는 노출하지 않음
  if (phon <= 0 && nfts.length === 0) return null;

  const lv = topNftLevel(nfts);
  const auraLevel = lv ? LEVEL_TIER[lv] : 1;

  return (
    <FloatingSlot slot="topRight" order={2}>
      <Link
        to="/empire/collection"
        className="hidden md:block"
        aria-label="내 NFT 컬렉션"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pulseKey}
            initial={{ scale: 0.96, opacity: 0.85 }}
            animate={{ scale: [1, 1.04, 1], opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="rounded-full border border-primary/40 bg-card/85 backdrop-blur-xl px-3 py-1.5 flex items-center gap-2 shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] hover:border-primary"
          >
            <NftAvatar size="xs" />
            <EquippedAvatarChip />
            <VipPassBadge compact />
            <span className="relative inline-flex items-center justify-center w-6 h-6">
              {lv ? <CrownAura level={auraLevel} size={24} /> : <Crown className="w-4 h-4 text-primary" />}
            </span>
            <span className="text-[10px] font-imperial tracking-widest text-primary">
              {lv ? LEVEL_LABEL[lv] : "ROOKIE"}
            </span>
            <span className="text-border/50">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums">
              <Coins className="w-3 h-3 text-primary" />
              {phon.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
            <span className="text-border/50">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-bold tabular-nums text-amber-300">
              <Zap className="w-3 h-3" />+{boostPct}%
              <span className="text-[9px] text-muted-foreground ml-0.5">/100</span>
            </span>
            <span className="text-border/50">·</span>
            <span className="inline-flex items-center gap-1 text-xs font-black tabular-nums text-primary">
              <Rocket className="w-3 h-3" />{maxLeverage}x
            </span>
          </motion.div>
        </AnimatePresence>
      </Link>
    </FloatingSlot>
  );
}
