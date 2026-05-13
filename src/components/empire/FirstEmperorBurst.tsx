/**
 * FirstEmperorBurst — 입금 직후 단발성 폭발 모달.
 * NFT 등급/PHON/+boost/max leverage를 보여주고 [지금 베팅하기] CTA로 이탈을 차단.
 *
 * 사용:
 *   const burst = useFirstEmperorBurst();
 *   burst.fire({ nft_level, boost_pct, max_leverage, phon_bonus, first_bonus });
 *   <FirstEmperorBurst onCta={() => betRef.current?.focusAmount()} />
 */
import { create } from "zustand";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Sparkles, Zap, Rocket, X } from "lucide-react";
import { useEffect } from "react";
import CrownAura from "@/components/empire/CrownAura";
import { Button } from "@/components/ui/button";

interface BurstPayload {
  nft_level?: "bronze" | "gold" | "diamond" | null;
  boost_pct?: number;
  max_leverage?: number;
  phon_bonus?: number;
  first_bonus?: boolean;
}
interface BurstStore {
  open: boolean;
  payload: BurstPayload | null;
  fire: (p: BurstPayload) => void;
  close: () => void;
}

export const useFirstEmperorBurst = create<BurstStore>((set) => ({
  open: false,
  payload: null,
  fire: (p) => set({ open: true, payload: p }),
  close: () => set({ open: false }),
}));

const LEVEL_LABEL: Record<string, string> = {
  bronze: "BRONZE CROWN",
  gold: "GOLD CROWN",
  diamond: "DIAMOND CROWN",
};
const LEVEL_TIER: Record<string, number> = { bronze: 5, gold: 7, diamond: 10 };

interface Props {
  onCta?: () => void;
}

export default function FirstEmperorBurst({ onCta }: Props) {
  const { open, payload, close } = useFirstEmperorBurst();

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <AnimatePresence>
      {open && payload && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 30 }}
            animate={{ scale: [0.7, 1.08, 1], opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ duration: 0.6, times: [0, 0.6, 1] }}
            className="relative w-full max-w-md rounded-3xl border-2 border-primary/60 bg-gradient-to-b from-card via-card/90 to-background p-6 shadow-[0_0_120px_-10px_hsl(var(--primary)/0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              aria-label="닫기"
              className="absolute top-3 right-3 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              <X className="w-4 h-4" />
            </button>

            {payload.first_bonus && (
              <div className="mb-3 flex items-center justify-center gap-1.5 text-[10px] font-imperial tracking-[0.3em] text-amber-300">
                <Sparkles className="w-3 h-3" /> FIRST EMPEROR BONUS +10%
              </div>
            )}

            <div className="flex items-center justify-center mb-4">
              <CrownAura level={LEVEL_TIER[payload.nft_level || "bronze"] ?? 5} size={88} />
            </div>

            <h2 className="text-center font-imperial text-3xl text-gradient-imperial tracking-wider">
              💥 {LEVEL_LABEL[payload.nft_level || "bronze"] || "CROWN"} 획득!
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-border/40 bg-background/40 p-3">
                <div className="text-[9px] tracking-widest text-muted-foreground">PHON 보너스</div>
                <div className="font-black tabular-nums text-base mt-1">
                  +{(payload.phon_bonus || 0).toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="text-[9px] tracking-widest text-amber-300">부스트</div>
                <div className="font-black tabular-nums text-base mt-1 text-amber-300 inline-flex items-center gap-1">
                  <Zap className="w-3 h-3" />+{payload.boost_pct ?? 0}%
                </div>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
                <div className="text-[9px] tracking-widest text-primary">최대 레버리지</div>
                <div className="font-black tabular-nums text-base mt-1 text-primary inline-flex items-center gap-1">
                  <Rocket className="w-3 h-3" />{payload.max_leverage ?? 10}x
                </div>
              </div>
            </div>

            <Button
              onClick={() => { close(); onCta?.(); }}
              className="mt-5 w-full h-14 text-base font-black bg-gradient-imperial text-primary-foreground glow-imperial press"
            >
              🚀 지금 베팅하러 가기
            </Button>
            <button
              onClick={close}
              className="mt-2 w-full text-[11px] text-muted-foreground hover:text-foreground"
            >
              나중에 보기
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
