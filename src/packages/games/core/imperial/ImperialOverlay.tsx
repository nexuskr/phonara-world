/** ImperialOverlay — large center reveal label over a canvas. */
import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  label: string;
  tone?: "gold" | "pink" | "violet" | "red" | "default";
  sub?: string;
}

const TONE = {
  gold: "text-[hsl(var(--gold))]",
  pink: "text-[hsl(var(--pink))]",
  violet: "text-violet-300",
  red: "text-destructive",
  default: "text-foreground",
} as const;

function ImperialOverlayImpl({ label, tone = "gold", sub }: Props) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <AnimatePresence mode="wait">
        <motion.div
          key={label}
          initial={{ scale: 0.92, opacity: 0.5 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.22 }}
          className={`text-5xl md:text-7xl font-black tabular-nums drop-shadow-[0_0_28px_currentColor] ${TONE[tone]}`}
        >
          {label}
        </motion.div>
      </AnimatePresence>
      {sub && (
        <div className="mt-2 text-xs text-muted-foreground font-bold tracking-wide uppercase">
          {sub}
        </div>
      )}
    </div>
  );
}

export const ImperialOverlay = memo(ImperialOverlayImpl);
export default ImperialOverlay;
