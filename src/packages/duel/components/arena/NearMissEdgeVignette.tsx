/**
 * NearMissEdgeVignette — 화면 가장자리 핑크 비네트.
 * Strong near-miss intensity 0.4+ 에서 페이드 인. transform/opacity only, pointer-events-none.
 */
import { motion, AnimatePresence } from "framer-motion";

export function NearMissEdgeVignette({ intensity }: { intensity: number }) {
  const show = intensity > 0.35;
  const alpha = Math.min(0.65, intensity * 0.72);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="nm-vignette"
          aria-hidden
          className="fixed inset-0 z-[70] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          style={{
            background: `radial-gradient(120% 90% at 50% 50%, transparent 55%, hsl(330 90% 55% / ${alpha}) 100%)`,
            willChange: "opacity",
          }}
        />
      )}
    </AnimatePresence>
  );
}

export default NearMissEdgeVignette;
