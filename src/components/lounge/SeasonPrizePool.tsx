import { Trophy } from "lucide-react";
import { AnimatedCounter, SimBadge } from "@/components/guide/EmpireFX";

/**
 * 길드전 시즌 상금 풀 라이브 카운터 — /lounge?tab=guild 상단 노출용.
 * 백엔드 0변경 (시각 데모). 향후 RPC 추가 시 props로 실데이터 주입 가능.
 */
export default function SeasonPrizePool({ amount = 142_800_000, jitter = 15_000 }: { amount?: number; jitter?: number }) {
  return (
    <div className="glass-strong rounded-2xl border border-gold/50 px-4 py-4 text-center shadow-[0_0_24px_hsl(var(--gold)/0.25)]">
      <div className="text-[10px] tracking-[0.3em] font-black text-gold/80 mb-1 flex items-center justify-center gap-1.5">
        <Trophy className="w-3 h-3" /> 시즌 상금 풀 LIVE <SimBadge />
      </div>
      <div className="font-imperial text-3xl text-gradient-gold">
        ₩<AnimatedCounter to={amount} duration={2.2} jitter={jitter} />
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 break-keep">
        시즌 종료 시 우승 길드 멤버에게 기여도 비례 자동 분배
      </div>
    </div>
  );
}
