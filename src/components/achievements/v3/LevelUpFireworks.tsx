// Pass 2 — 폭죽 + 펄스 오버레이. canvas-confetti lazy import. 3.5s 후 자동 닫힘.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
};

export default function LevelUpFireworks({ open, title, subtitle, onClose }: Props) {
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    let cancelled = false;
    // Lazy import — keeps canvas-confetti (~6KB gz) out of critical path.
    (async () => {
      try {
        const mod = await import("canvas-confetti");
        if (cancelled) return;
        const confetti = mod.default;
        const end = Date.now() + 1200;
        const colors = ["#f5c44a", "#ffd86b", "#ff7a59", "#ffe9a8"];
        (function frame() {
          confetti({ particleCount: 6, angle: 60, spread: 55, startVelocity: 55, origin: { x: 0, y: 0.7 }, colors });
          confetti({ particleCount: 6, angle: 120, spread: 55, startVelocity: 55, origin: { x: 1, y: 0.7 }, colors });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
        // Final burst.
        setTimeout(() => {
          if (cancelled) return;
          confetti({ particleCount: 120, spread: 100, origin: { y: 0.55 }, colors });
        }, 250);
      } catch {
        /* noop — confetti is decorative */
      }
    })();

    const t = setTimeout(() => onClose(), 3500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!mounted) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
          aria-live="polite"
        >
          <motion.div
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="pointer-events-auto rounded-3xl bg-gradient-to-br from-amber-500/20 via-yellow-400/10 to-orange-500/20 border border-amber-400/40 backdrop-blur-md px-8 py-6 shadow-[0_20px_60px_-10px_rgba(245,196,74,0.45)]"
          >
            <div className="text-center space-y-1">
              <div className="text-4xl">👑</div>
              <div className="font-imperial text-xl font-black tracking-tight text-amber-200 break-keep">
                {title}
              </div>
              {subtitle && (
                <div className="text-sm text-amber-100/80 break-keep">{subtitle}</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
