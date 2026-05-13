import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { LineMini, BarsMini, AreaMini } from "@/components/ui/mini-chart";
import { TrendingUp, Users, Target, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import { LoadingPage } from "@/components/ui/loading-state";

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

  const fmtMoney = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v);

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

      {loading && <LoadingPage />}

      {!loading && rows.length > 0 && (
        <>
          <ChartCard title="일별 충전 / 출금">
            <LineMini
              data={rows}
              xKey="day"
              height={220}
              yFormatter={fmtMoney}
              series={[
                { key: "deposits_total", name: "충전", color: "hsl(var(--secondary))" },
                { key: "withdrawals_total", name: "출금", color: "hsl(var(--destructive))" },
              ]}
            />
          </ChartCard>

          <ChartCard title="일별 신규 가입">
            <BarsMini
              data={rows}
              xKey="day"
              height={180}
              series={[{ key: "new_users", name: "신규 가입", color: "hsl(var(--primary))" }]}
            />
          </ChartCard>

          <ChartCard title="일별 미션 보상 누적">
            <AreaMini
              data={rows}
              xKey="day"
              height={180}
              yFormatter={fmtMoney}
              series={[{ key: "missions_reward", name: "미션 보상", color: "hsl(var(--gold))" }]}
            />
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
