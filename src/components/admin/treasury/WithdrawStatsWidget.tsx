/**
 * WithdrawStatsWidget — admin 출금 큐 4-카드 요약
 * 데이터는 useWithdrawQueue 훅이 단독으로 가져온다.
 */
import { memo } from "react";
import { Clock, Crown, Timer, AlertTriangle, RefreshCw } from "lucide-react";
import { useWithdrawQueue } from "@/lib/withdrawal/useWithdrawQueue";
import { Button } from "@/components/ui/button";

interface CardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warn" | "danger" | "gold";
  loading?: boolean;
}

const TONE: Record<NonNullable<CardProps["tone"]>, string> = {
  default: "border-border/50 text-foreground",
  warn:    "border-yellow-500/40 text-yellow-300",
  danger:  "border-destructive/50 text-destructive",
  gold:    "border-gold/40 text-gold",
};

const StatCard = memo(function StatCard({ label, value, icon: Icon, tone = "default", loading }: CardProps) {
  return (
    <div className={`glass rounded-xl border ${TONE[tone]} p-4 flex flex-col gap-2 min-h-[88px]`}>
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <div className="font-display font-black text-2xl tabular-nums">
        {loading ? <span className="inline-block h-6 w-16 bg-muted/40 rounded animate-pulse" /> : value}
      </div>
    </div>
  );
});

function WithdrawStatsWidget() {
  const { stats, isLoading, error, refetch } = useWithdrawQueue();

  if (error) {
    return (
      <div className="glass rounded-xl border border-destructive/40 p-4 flex items-center justify-between gap-3">
        <div className="text-xs text-destructive break-keep">출금 큐 통계 로드 실패: {error}</div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> 재시도
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="대기 중"      value={stats.pending_count.toLocaleString()}                    icon={Clock}          loading={isLoading} />
      <StatCard label="우선 처리"    value={stats.priority_count.toLocaleString()}                   icon={Crown}          tone="gold"   loading={isLoading} />
      <StatCard label="평균 처리(분)" value={stats.avg_processing_minutes.toLocaleString()}           icon={Timer}                        loading={isLoading} />
      <StatCard label="지연"         value={stats.delayed_count.toLocaleString()}                    icon={AlertTriangle}  tone={stats.delayed_count > 0 ? "danger" : "default"} loading={isLoading} />
    </div>
  );
}

export default memo(WithdrawStatsWidget);
