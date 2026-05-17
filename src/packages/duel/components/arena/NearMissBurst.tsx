/**
 * NearMissBurst — intensity 기반 슬로우다운 + 골드/핑크 입자 폭풍 + 진동 시뮬레이션.
 */
import { AnimatePresence, motion } from "framer-motion";

export function NearMissBurst({
  show,
  intensity = 1,
  onDone,
}: {
  show: boolean;
  intensity?: number;
  onDone: () => void;
}) {
  const i = Math.max(0, Math.min(1, intensity));
  const particleCount = Math.round(28 + i * 36); // 28..64
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: i > 0.5 ? [0, -2, 2, -2, 0] : 0 }}
          exit={{ opacity: 0 }}
          transition={{ y: { duration: 0.5, repeat: 1, ease: "easeInOut" } }}
          onAnimationComplete={(def) => { if (def === "exit") onDone(); }}
          className="absolute inset-0 z-30 grid place-items-center pointer-events-none"
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(40% 40% at 50% 50%, hsl(38 92% 60% / ${0.35 + i * 0.35}), transparent 70%)`,
            }}
          />
          {Array.from({ length: particleCount }).map((_, n) => {
            const a = (n / particleCount) * Math.PI * 2;
            const dist = 40 + (n % 5) * 8 + i * 18;
            return (
              <motion.span
                key={n}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                animate={{
                  x: Math.cos(a) * dist + "%",
                  y: Math.sin(a) * dist + "%",
                  opacity: [1, 1, 0],
                  scale: [0, 1.2 + i * 0.6, 0],
                }}
                transition={{ duration: 1.4 + i * 0.6, ease: "easeOut", delay: n * 0.010 }}
                className="absolute w-1.5 h-1.5 rounded-full"
                style={{
                  background: n % 2 === 0 ? "#FDE68A" : "#F472B6",
                  boxShadow: n % 2 === 0 ? "0 0 10px #FDE68A" : "0 0 10px #F472B6",
                  willChange: "transform, opacity",
                }}
              />
            );
          })}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1 + i * 0.05, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="relative font-imperial text-xl md:text-3xl text-amber-100 text-center px-6"
            style={{ textShadow: `0 0 ${18 + i * 22}px hsl(330 90% 60% / 0.85), 0 0 ${36 + i * 30}px hsl(38 92% 60% / 0.6)` }}
          >
            아슬아슬하게 빗나갔습니다 — 폐하의 운이 스치고 지나갔습니다.
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NearMissBurst;
