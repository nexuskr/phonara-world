import { Users, TrendingUp, Crown, UsersRound, Star } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import type { LiveKpi } from "@/hooks/use-auth-live-data";

interface Props { kpi: LiveKpi }

function Cell({
  icon, label, value, accent, suffix = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  suffix?: string;
}) {
  const v = useCountUp(value, 900);
  return (
    <div className="snap-start shrink-0 w-[44vw] max-w-[180px] sm:w-auto sm:max-w-none flex flex-col items-center gap-1 px-2 py-1 text-center">
      <span className="text-foreground/70">{icon}</span>
      <div className="text-[10px] sm:text-[11px] text-muted-foreground tracking-wider">{label}</div>
      <div className={`text-base sm:text-xl font-black tabular-nums ${accent}`}>
        {Math.round(v).toLocaleString()}{suffix}
      </div>
    </div>
  );
}

export default function AuthLiveNowBar({ kpi }: Props) {
  return (
    <div className="relative w-full">
      <div
        className="
          relative rounded-2xl border border-gold/35 bg-background/75 backdrop-blur-md
          px-3 py-3 sm:px-5 sm:py-4
          shadow-[0_0_40px_-12px_hsl(var(--gold)/0.45)]
        "
      >
        {/* LIVE NOW chip */}
        <div className="absolute -top-3 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-background border border-gold/50 text-[9px] font-black tracking-[0.28em] text-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          LIVE NOW
        </div>

        <div className="
          flex sm:grid sm:grid-cols-5
          gap-1 sm:gap-3
          overflow-x-auto sm:overflow-visible
          snap-x snap-mandatory sm:snap-none
          -mx-1 px-1
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        ">
          <Cell icon={<Users className="w-4 h-4" />}      label="현재접속 황제"  value={kpi.active_users}     accent="text-foreground" suffix="명" />
          <Cell icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} label="24시간 거래액" value={kpi.gmv_24h} accent="text-emerald-400" suffix="" />
          <Cell icon={<Crown className="w-4 h-4 text-gold" />} label="오늘 Crown 폭발" value={kpi.crown_explosion} accent="text-gold" suffix="" />
          <Cell icon={<UsersRound className="w-4 h-4 text-sky-400" />} label="활성 황제" value={kpi.active_emperors} accent="text-sky-400" suffix="명" />
          <Cell icon={<Star className="w-4 h-4 text-rose-400" />} label="신규 황제 오늘" value={kpi.new_today} accent="text-rose-400" suffix="명" />
        </div>
      </div>
    </div>
  );
}
