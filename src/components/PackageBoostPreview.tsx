import { formatKRW } from "@/lib/store";
import { Flame } from "lucide-react";

/**
 * Packages 페이지 카드 하단에 노출되는 "오늘 시작 시" 블록.
 * 사전 공지 확정 스케줄 — 변동 없음.
 */
export default function PackageBoostPreview({
  dailyReturn,
  multiplier,
  isEmpire,
}: {
  dailyReturn: number;
  multiplier: number;
  isEmpire?: boolean;
}) {
  if (!multiplier || multiplier <= 1.0 || dailyReturn <= 0) return null;
  const boosted = Math.floor(dailyReturn * multiplier);
  return (
    <div className={`mt-4 rounded-xl p-3 border ${isEmpire ? "border-gold/40 bg-gold/5" : "border-primary/30 bg-primary/5"}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold mb-2">
        <Flame className={`w-3.5 h-3.5 ${isEmpire ? "text-gold" : "text-primary"}`} />
        <span className={isEmpire ? "text-gold" : "text-primary"}>
          {isEmpire ? "👑 Empire 전용 · 첫 3일 최대 가속 구간" : "오늘 시작 시 · 첫 3일 보너스 구간"}
        </span>
      </div>
      <div className="space-y-1">
        {[1, 2, 3].map((d) => (
          <div key={d} className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Day {d}</span>
            <span className="font-display font-black tabular-nums text-money-strong">{formatKRW(boosted)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/40 text-muted-foreground">
          <span>Day 4~30</span>
          <span className="tabular-nums">{formatKRW(dailyReturn)}/일</span>
        </div>
      </div>
      <p className="text-[9px] text-muted-foreground mt-2 leading-tight">
        ※ 사전 공지된 확정 적립 스케줄 · 30일 한정, 만기 자동 종료
      </p>
    </div>
  );
}
