import { useOnline, useTodayPayout } from "@/components/LiveStats";
import { Sparkles, Users, TrendingUp } from "lucide-react";

/**
 * Empire Population Pulse — compact live strip
 * - 현재 활성 시뮬레이션 인구
 * - 오늘 누적 시뮬 지급
 * - "SIM" 미세 배지 (법적 안전)
 */
export default function EmpirePopulationPulse() {
  const online = useOnline();
  const today = useTodayPayout();

  return (
    <div className="w-full px-3 sm:px-4 py-1.5 bg-gradient-to-r from-gold/10 via-transparent to-gold/10 border-y border-gold/20 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center gap-3 text-[11px] sm:text-xs">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider text-muted-foreground border border-border/60 shrink-0">
          SIM
        </span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
          <Users className="w-3 h-3 text-gold shrink-0" />
          <span className="font-bold text-foreground tabular-nums">{online.toLocaleString()}</span>
          <span className="text-muted-foreground truncate">활성 시뮬레이션 인구</span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 ml-auto">
          <TrendingUp className="w-3 h-3 text-gold" />
          <span className="font-bold text-money-strong tabular-nums">₩{Math.round(today / 10_000).toLocaleString()}만</span>
          <span className="text-muted-foreground">오늘 시뮬 지급</span>
        </div>
        <div className="flex sm:hidden items-center gap-1 ml-auto">
          <Sparkles className="w-3 h-3 text-gold" />
          <span className="text-muted-foreground">실시간</span>
        </div>
      </div>
    </div>
  );
}
