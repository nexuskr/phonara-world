import { useOnline, useTodayPayout } from "@/components/LiveStats";
import { Sparkles, Users, TrendingUp } from "lucide-react";
import { SimChip } from "@/components/sim/SimChip";

/**
 * Empire Population Pulse — compact live strip
 * PR-1: KRW(₩) → Empire Coin (₡), 인원 수 → 추상 표현. SimChip 통일.
 */
export default function EmpirePopulationPulse() {
  const online = useOnline();
  const today = useTodayPayout();
  // Convert legacy KRW seed to abstract ₡ display (1₡ ≈ 1,000원 시뮬 기준 — 표시 전용)
  const todayCoin = Math.round(today / 1_000);

  return (
    <div className="w-full px-3 sm:px-4 py-1.5 bg-gradient-to-r from-sim-gold/10 via-transparent to-sim-gold/10 border-y border-sim-gold/20 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center gap-3 text-[11px] sm:text-xs">
        <SimChip />
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
          <Users className="w-3 h-3 text-sim-gold shrink-0" />
          <span className="font-bold text-foreground tabular-nums">{online.toLocaleString()}</span>
          <span className="text-muted-foreground truncate">활성 제국민 (시뮬)</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 ml-auto">
          <TrendingUp className="w-3 h-3 text-sim-gold" />
          <span className="font-bold text-sim-gold tabular-nums">{todayCoin.toLocaleString()} ₡</span>
          <span className="text-muted-foreground">오늘 시뮬 지급</span>
        </div>
        <div className="flex sm:hidden items-center gap-1 ml-auto">
          <Sparkles className="w-3 h-3 text-sim-gold" />
          <span className="text-muted-foreground">실시간</span>
        </div>
      </div>
    </div>
  );
}
