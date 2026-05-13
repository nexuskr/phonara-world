import { AreaMini, LineMini } from "@/components/ui/mini-chart";

type HistoryRow = {
  taken_at: string;
  total_paid: number;
  cron_uptime_7d: number;
  audit_pass_30d: number;
  policy_pass_7d: number;
};

const fmtKRW = (n: number) => `₩ ${Number(n || 0).toLocaleString()}`;
const fmtDate = (t: any) => new Date(String(t)).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
const fmtMoneyTick = (v: number) => `${(v / 1_000_000).toFixed(0)}M`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default function TrustChartsInner({ history }: { history: HistoryRow[]; days: 7 | 30 }) {
  return (
    <>
      <div className="glass rounded-2xl p-3">
        <div className="text-[11px] text-muted-foreground mb-2 font-bold">누적 정산 지급액 (₩)</div>
        <AreaMini
          data={history as any}
          xKey="taken_at"
          height={180}
          xFormatter={fmtDate}
          yFormatter={fmtMoneyTick}
          series={[{ key: "total_paid", name: "지급액", color: "hsl(var(--primary))" }]}
        />
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[11px] text-muted-foreground mb-2 font-bold">가동률·감사 PASS (%)</div>
        <LineMini
          data={history as any}
          xKey="taken_at"
          height={180}
          xFormatter={fmtDate}
          yFormatter={fmtPct}
          yDomain={[90, 100]}
          series={[
            { key: "cron_uptime_7d", name: "가동률", color: "hsl(var(--primary))" },
            { key: "audit_pass_30d", name: "감사 PASS", color: "hsl(var(--secondary))" },
            { key: "policy_pass_7d", name: "정책 단언", color: "hsl(var(--gold))" },
          ]}
        />
      </div>
    </>
  );
}

// (formatter helpers retained for tooltip use)
export { fmtKRW };
