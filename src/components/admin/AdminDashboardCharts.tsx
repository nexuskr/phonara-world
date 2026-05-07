import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { TrendingUp, Users, Target, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";

type Row = {
  day: string;
  new_users: number;
  deposits_total: number;
  withdrawals_total: number;
  missions_count: number;
  missions_reward: number;
};

const RANGES = [
  { label: "7일", days: 7 },
  { label: "30일", days: 30 },
  { label: "90일", days: 90 },
];

export default function AdminDashboardCharts() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    supabase.rpc("get_admin_metrics", { _days: days }).then(({ data, error }) => {
      if (!alive) return;
      if (error) { console.error(error); setRows([]); }
      else setRows((data as any[] || []).map(r => ({
        ...r,
        day: new Date(r.day).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
        new_users: Number(r.new_users),
        deposits_total: Number(r.deposits_total),
        withdrawals_total: Number(r.withdrawals_total),
        missions_count: Number(r.missions_count),
        missions_reward: Number(r.missions_reward),
      })));
      setLoading(false);
    });
    return () => { alive = false; };
  }, [days]);

  const sum = (k: keyof Row) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
  const totals = {
    users: sum("new_users"),
    dep: sum("deposits_total"),
    wd: sum("withdrawals_total"),
    mc: sum("missions_count"),
    mr: sum("missions_reward"),
  };

  return (
    <div className="space-y-4">
      {/* 기간 선택 */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" /> 운영 대시보드
        </h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${
                days === r.days ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"
              }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* 합계 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Mini icon={Users} label="신규 가입" v={totals.users.toLocaleString()} />
        <Mini icon={ArrowUpFromLine} label="충전 합계" v={formatKRW(totals.dep)} />
        <Mini icon={ArrowDownToLine} label="출금 합계" v={formatKRW(totals.wd)} />
        <Mini icon={Target} label="미션 완료" v={totals.mc.toLocaleString()} />
        <Mini icon={TrendingUp} label="미션 보상" v={formatKRW(totals.mr)} />
      </div>

      {loading && <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">로딩 중...</div>}

      {!loading && rows.length > 0 && (
        <>
          {/* 충전/출금 라인 */}
          <ChartCard title="일별 충전 / 출금">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTip currency />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="deposits_total" name="충전" stroke="hsl(var(--secondary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="withdrawals_total" name="출금" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 신규 가입 바 */}
          <ChartCard title="일별 신규 가입">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip content={<CustomTip />} />
                <Bar dataKey="new_users" name="신규 가입" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 미션 보상 영역 */}
          <ChartCard title="일별 미션 보상 누적">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={rows}>
                <defs>
                  <linearGradient id="grad-mr" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                <Tooltip content={<CustomTip currency />} />
                <Area type="monotone" dataKey="missions_reward" name="미션 보상" stroke="hsl(var(--gold))" strokeWidth={2} fill="url(#grad-mr)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function Mini({ icon: Icon, label, v }: any) {
  return (
    <div className="glass-strong rounded-2xl p-3">
      <Icon className="w-3.5 h-3.5 text-gold" />
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      <div className="font-display font-black text-sm mt-0.5 truncate">{v}</div>
    </div>
  );
}

function ChartCard({ title, children }: any) {
  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <div className="text-[11px] font-bold text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function CustomTip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg p-2 text-[10px] border border-border">
      <div className="font-bold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold">{currency ? formatKRW(p.value) : p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
