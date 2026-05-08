import { ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, CartesianGrid } from "recharts";

type HistoryRow = {
  taken_at: string;
  total_paid: number;
  cron_uptime_7d: number;
  audit_pass_30d: number;
  policy_pass_7d: number;
};

const fmtKRW = (n: number) => `₩ ${Number(n || 0).toLocaleString()}`;

export default function TrustChartsInner({ history }: { history: HistoryRow[]; days: 7 | 30 }) {
  return (
    <>
      <div className="glass rounded-2xl p-3">
        <div className="text-[11px] text-muted-foreground mb-2 font-bold">누적 정산 지급액 (₩)</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={history}>
            <defs>
              <linearGradient id="gPaid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="taken_at" tick={{ fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`} />
            <RTooltip
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
              formatter={(v: any) => fmtKRW(Number(v))}
              labelFormatter={(t) => new Date(t).toLocaleDateString("ko-KR")}
            />
            <Area type="monotone" dataKey="total_paid" stroke="hsl(var(--primary))" fill="url(#gPaid)" strokeWidth={2} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[11px] text-muted-foreground mb-2 font-bold">가동률·감사 PASS (%)</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis dataKey="taken_at" tick={{ fontSize: 9 }} tickFormatter={(t) => new Date(t).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })} />
            <YAxis tick={{ fontSize: 9 }} domain={[90, 100]} />
            <RTooltip
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
              formatter={(v: any) => `${Number(v).toFixed(2)}%`}
              labelFormatter={(t) => new Date(t).toLocaleDateString("ko-KR")}
            />
            <Line type="monotone" dataKey="cron_uptime_7d" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="가동률" isAnimationActive={false} />
            <Line type="monotone" dataKey="audit_pass_30d" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} name="감사 PASS" isAnimationActive={false} />
            <Line type="monotone" dataKey="policy_pass_7d" stroke="hsl(var(--gold))" strokeWidth={2} dot={false} name="정책 단언" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
