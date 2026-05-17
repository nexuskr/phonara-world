/**
 * NearMissBurst — 황실 슬로우다운 + 골드/핑크 입자 폭풍.
 */
import { AnimatePresence, motion } from "framer-motion";

export function NearMissBurst({ show, onDone }: { show: boolean; onDone: () => void }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onAnimationComplete={(def) => { if (def === "exit") onDone(); }}
          className="absolute inset-0 z-30 grid place-items-center pointer-events-none"
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(40% 40% at 50% 50%, hsl(38 92% 60% / 0.45), transparent 70%)",
            }}
          />
          {Array.from({ length: 28 }).map((_, i) => {
            const a = (i / 28) * Math.PI * 2;
            const dist = 40 + (i % 5) * 8;
            return (
              <motion.span
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos(a) * dist + "%",
                  y: Math.sin(a) * dist + "%",
                  opacity: [1, 1, 0],
                  scale: [0, 1.2, 0],
                }}
                transition={{ duration: 1.6, ease: "easeOut", delay: i * 0.012 }}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: i % 2 === 0 ? "#FDE68A" : "#F472B6",
                  boxShadow: i % 2 === 0 ? "0 0 10px #FDE68A" : "0 0 10px #F472B6",
                  willChange: "transform, opacity",
                }}
              />
            );
          })}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="relative font-imperial text-xl md:text-3xl text-amber-100 text-center px-6"
            style={{ textShadow: "0 0 18px hsl(330 90% 60% / 0.85), 0 0 36px hsl(38 92% 60% / 0.6)" }}
          >
            황제의 운이 스치고 지나갔습니다…
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NearMissBurst;
