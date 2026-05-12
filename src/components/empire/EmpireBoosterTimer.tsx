// PR-12: Floating Empire Booster countdown chip — visible only while a 24h Baron booster is active.
import { Crown, Zap, Timer } from "lucide-react";
import { motion } from "framer-motion";
import { useEmpireBooster, formatHMS } from "@/hooks/use-empire-booster";

export default function EmpireBoosterTimer() {
  const { active, booster, remainingMs } = useEmpireBooster();
  if (!active || !booster) return null;

  // Heat the UI as time runs out: <2h = critical
  const totalMs = 24 * 3600 * 1000;
  const ratio = remainingMs / totalMs;
  const critical = remainingMs < 2 * 3600 * 1000;
  const fee = Math.round(booster.fee_discount * 100);
  const mult = booster.crown_multiplier;

  return (
    <motion.div
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-2 right-2 z-50 select-none"
      aria-label="Empire Booster active"
    >
      <div className="relative">
        {/* Pulse halo */}
        <motion.div
          className="absolute -inset-1 rounded-xl"
          style={{
            background: critical
              ? "radial-gradient(closest-side, rgba(244,63,94,0.55), transparent)"
              : "radial-gradient(closest-side, rgba(251,191,36,0.45), transparent)",
            filter: "blur(10px)",
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: critical ? 1.0 : 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-md
            ${critical
              ? "border-rose-400/60 bg-gradient-to-r from-rose-950/70 to-rose-900/40"
              : "border-sim-gold/60 bg-gradient-to-r from-amber-950/70 to-amber-900/40"}`}
        >
          <Crown className={`w-3.5 h-3.5 ${critical ? "text-rose-300" : "text-sim-gold"}`} />
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Empire Booster
            </span>
            <span className={`font-display font-black text-sm tabular-nums ${critical ? "text-rose-200" : "text-sim-gold"}`}>
              {formatHMS(remainingMs)}
            </span>
          </div>
          <div className="hidden sm:flex flex-col items-end leading-tight pl-2 border-l border-white/10">
            <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
              <Zap className="w-3 h-3" /> -{fee}% 수수료
            </span>
            <span className="text-[10px] flex items-center gap-1 text-emerald-300">
              <Timer className="w-3 h-3" /> Crown ×{mult}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="absolute -bottom-1 left-1 right-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full ${critical ? "bg-rose-400" : "bg-sim-gold"}`}
            style={{ width: `${Math.max(2, Math.min(100, ratio * 100))}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
