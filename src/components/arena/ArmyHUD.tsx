import { memo } from "react";
import { motion } from "framer-motion";
import { Heart, Swords, Flame, Activity } from "lucide-react";
import type { ArmyState, Side } from "@/lib/trading/armyMapping";

type Props = { side: Side; state: ArmyState; pnlPct: number; phase: "idle" | "fighting" | "result" | "armed" };

function Bar({ value, color, label, icon }: { value: number; color: string; label: string; icon: React.ReactNode }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div className="flex-1">
      <div className="flex items-center gap-1 text-[9px] font-bold tracking-widest text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
        <span className="ml-auto tabular-nums">{Math.round(pct * 100)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <motion.div
          className={`h-full ${color}`}
          initial={false}
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}

function ArmyHUDInner({ side, state, pnlPct, phase }: Props) {
  const isLong = side === "long";
  const advantage = state.frontline; // 0~1, 1 means ally fully advancing
  return (
    <div className="glass rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Bar
        value={advantage}
        color={isLong ? "bg-gradient-to-r from-emerald-500 to-emerald-300" : "bg-gradient-to-r from-rose-500 to-rose-300"}
        label="전선"
        icon={<Swords className="w-2.5 h-2.5" />}
      />
      <Bar
        value={state.morale}
        color="bg-gradient-to-r from-gold to-amber-300"
        label="사기"
        icon={<Heart className="w-2.5 h-2.5" />}
      />
      <Bar
        value={state.marchSpeed}
        color="bg-gradient-to-r from-sky-500 to-cyan-300"
        label="진군"
        icon={<Activity className="w-2.5 h-2.5" />}
      />
      <Bar
        value={state.particle}
        color="bg-gradient-to-r from-orange-500 to-yellow-300"
        label="교전"
        icon={<Flame className="w-2.5 h-2.5" />}
      />
      <div className="col-span-2 sm:col-span-4 flex items-center justify-between text-[10px] mt-0.5">
        <span className="text-muted-foreground font-bold tracking-widest">PnL</span>
        <span className={`font-mono tabular-nums font-black text-sm ${pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
          {pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(3)}%
        </span>
        <span className="text-muted-foreground font-bold tracking-widest uppercase">
          {phase === "fighting" ? "교전중" : phase === "result" ? "결과" : "대기"}
        </span>
      </div>
    </div>
  );
}

export default memo(ArmyHUDInner);
