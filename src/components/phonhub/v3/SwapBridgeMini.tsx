import { lazy, Suspense } from "react";
import { ArrowLeftRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PhonHubSummary } from "@/hooks/use-phon-hub-summary";

const PhonSwapDialog = lazy(() => import("@/components/phon/PhonSwapDialog"));

export default function SwapBridgeMini({ data }: { data: PhonHubSummary }) {
  const pct = Math.min(100, (data.swap_used_today / Math.max(1, data.swap_daily_cap)) * 100);
  const remaining = Math.max(0, data.swap_daily_cap - data.swap_used_today);
  return (
    <Card className="rounded-2xl border-primary/30 bg-card/60 p-4">
      <div className="text-[11px] tracking-[0.3em] font-black text-primary uppercase mb-2 flex items-center gap-1.5">
        <ArrowLeftRight className="w-3.5 h-3.5" /> PHON ↔ KRW 스왑
      </div>
      <div className="flex items-baseline justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">오늘 사용량</span>
        <span className="font-bold text-foreground tabular-nums">
          {Math.floor(data.swap_used_today).toLocaleString("ko-KR")} / {Math.floor(data.swap_daily_cap).toLocaleString("ko-KR")}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full bg-gradient-to-r from-primary to-pink transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-[11px] text-muted-foreground mt-2">
        남은 한도 {Math.floor(remaining).toLocaleString("ko-KR")} PHON
      </div>
      <div className="mt-3">
        <Suspense fallback={<Button size="sm" className="w-full" disabled>스왑 실행</Button>}>
          <PhonSwapDialog
            trigger={
              <Button size="sm" className="w-full bg-gradient-imperial text-primary-foreground">
                스왑 실행
              </Button>
            }
          />
        </Suspense>
      </div>
    </Card>
  );
}
