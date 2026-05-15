import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * Pragmatic-style scatter announcement. Fires when 3+ scatters land.
 * Auto-dismisses after ~2s, then BonusIntro takes over.
 */
export default function ScatterTriggerOverlay({
  show,
  count,
}: {
  show: boolean;
  count: number;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-amber-300/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.2, 0.6, 0] }}
            transition={{ duration: 1.6, times: [0, 0.15, 0.45, 0.7, 1] }}
          />
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotateZ: -10 }}
            animate={{ scale: [0.4, 1.25, 1], opacity: 1, rotateZ: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 12 }}
            className="relative text-center"
          >
            <div className="absolute -inset-16 rounded-full bg-amber-400/30 blur-3xl" />
            <Sparkles className="w-10 h-10 mx-auto text-amber-200 drop-shadow-[0_0_20px_rgba(255,210,80,0.9)]" />
            <div className="font-imperial text-5xl sm:text-7xl font-black text-amber-100 tracking-[0.18em] drop-shadow-[0_0_24px_rgba(255,200,80,1)]">
              SCATTER!
            </div>
            <div className="text-xs sm:text-sm text-amber-200/90 tracking-[0.4em] font-bold mt-2">
              {count}× FREE BONUS UNLOCKED
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
