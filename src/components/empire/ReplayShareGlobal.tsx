import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Crown } from "lucide-react";
import { ShareReplayButton } from "./ShareReplayButton";
import { replayLanding } from "@/lib/crownReplay";

/**
 * PR-F — Global listener that opens a share dialog when any code dispatches
 * `phonara:share-replay` (e.g. the awardCrown wrapper after a >2.0x variance event).
 */
export function ReplayShareGlobal() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    function onShare(e: Event) {
      const t = (e as CustomEvent<{ token: string }>).detail?.token;
      if (t) setToken(t);
    }
    window.addEventListener("phonara:share-replay", onShare as EventListener);
    return () => window.removeEventListener("phonara:share-replay", onShare as EventListener);
  }, []);

  return (
    <AnimatePresence>
      {token && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setToken(null)}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 16 }}
            className="relative w-full max-w-sm glass-strong rounded-3xl border border-gold/40 p-6 text-center shadow-[0_0_60px_-10px_hsl(var(--gold)/0.7)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setToken(null)}
              className="absolute top-3 right-3 p-1 rounded-full bg-white/5 hover:bg-white/10"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-7xl">👑</div>
            <div className="mt-2 text-[10px] tracking-[0.3em] font-black text-gold">CROWN REVEAL</div>
            <div className="mt-2 font-display font-black text-2xl">제국 전체에 자랑하세요</div>
            <p className="mt-2 text-sm text-muted-foreground">
              지금 공유한 사람들은 다음 라운드에서 더 큰 변동성을 만나고 있습니다.
            </p>

            <div className="mt-5 flex items-center justify-center">
              <ShareReplayButton token={token} variant="full" />
            </div>

            <div className="mt-4 text-[10px] text-muted-foreground/80 break-all">
              {replayLanding(token, "modal")}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ReplayShareGlobal;
