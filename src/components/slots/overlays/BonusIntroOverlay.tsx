import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap } from "lucide-react";

/**
 * 3-second cinematic between scatter trigger and the bonus wheel.
 * Black fade → gold sweep → "BONUS UNLOCKED" → countdown.
 */
export default function BonusIntroOverlay({
  show,
  onComplete,
}: {
  show: boolean;
  onComplete: () => void;
}) {
  return (
    <AnimatePresence onExitComplete={() => {}}>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onAnimationComplete={() => {
            // Trigger after the intro plays
            setTimeout(onComplete, 2400);
          }}
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

          {/* Sweeping gold beams */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="absolute top-0 left-0 w-[200%] h-full"
              style={{
                background:
                  "linear-gradient(110deg, transparent 30%, rgba(255,200,80,0.35) 50%, transparent 70%)",
              }}
              initial={{ x: "-50%" }}
              animate={{ x: "0%" }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
          </motion.div>

          {/* Pillars */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none opacity-30 bg-gradient-to-t from-amber-900/40 to-transparent" />

          <motion.div
            initial={{ scale: 0.6, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 180, damping: 14 }}
            className="relative text-center px-6"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Crown className="w-6 h-6 text-amber-300" />
              <Zap className="w-5 h-5 text-amber-200" />
              <Crown className="w-6 h-6 text-amber-300" />
            </div>
            <div className="font-imperial text-3xl sm:text-5xl text-gradient-imperial tracking-[0.22em] font-black">
              BONUS UNLOCKED
            </div>
            <div className="text-xs sm:text-sm text-amber-200/80 tracking-[0.4em] mt-2 font-bold">
              SPIN THE WHEEL OF OLYMPUS
            </div>
            <motion.div
              className="mt-6 mx-auto h-1 max-w-[180px] rounded-full bg-amber-300/30 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-amber-300 to-orange-500"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.6, delay: 0.6, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
