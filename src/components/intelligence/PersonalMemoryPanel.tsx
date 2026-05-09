import { format } from "date-fns";
import { Brain } from "lucide-react";
import { usePaperStore } from "@/lib/paper-trading/store";
import { EmptyState } from "@/components/ui/empty-state";

export default function PersonalMemoryPanel() {
  const history = usePaperStore((s) => s.history);
  const recent = history.slice(0, 8);

  return (
    <section className="glass rounded-3xl border border-border/40 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-primary" />
        <h2 className="font-display font-bold text-base">Personal Memory</h2>
        <span className="ml-auto text-[10px] tracking-widest text-muted-foreground">최근 결정</span>
      </div>
      {recent.length === 0 ? (
        <EmptyState size="sm" variant="muted" title="아직 학습된 결정이 없습니다" description="트레이드를 시작하면 패턴이 자동 기록됩니다." />
      ) : (
        <ul className="space-y-1.5">
          {recent.map((p) => {
            const pnl = p.closed?.pnl ?? 0;
            const positive = pnl >= 0;
            return (
              <li key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg hover:bg-muted/20">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-muted-foreground tabular-nums">{format(p.closed?.at ?? p.openedAt, "MM/dd HH:mm")}</span>
                  <span className="font-bold">{p.symbol}</span>
                  <span className={p.side === "long" ? "text-emerald-400" : "text-rose-400"}>{p.side.toUpperCase()}</span>
                  <span className="text-muted-foreground">{p.leverage}×</span>
                </div>
                <span className={`font-mono tabular-nums font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                  {positive ? "+" : ""}{pnl.toFixed(2)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
