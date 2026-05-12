import { useEffect, useState } from "react";
import { KeyRound, Users, TrendingUp, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";

type Stats = {
  invites_issued: number;
  seats_total: number;
  seats_used: number;
  redemptions_total: number;
  unique_redeemers: number;
  redeemers_7d: number;
  depositors_7d: number;
  depositors_30d: number;
  generated_at: string;
};

export default function BetaFunnelPanel() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase.rpc("get_beta_funnel_stats");
      if (!alive) return;
      if (!error && data) setS(data as unknown as Stats);
      setLoading(false);
    }
    void load();
    const id = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const seatPct = s && s.seats_total > 0 ? (s.seats_used / s.seats_total) * 100 : 0;
  const dep7Pct = s && s.redeemers_7d > 0 ? (s.depositors_7d / s.redeemers_7d) * 100 : 0;

  return (
    <section className="glass-strong rounded-2xl p-4 border border-border/40">
      <div className="flex items-center gap-2 mb-3">
        <KeyRound className="w-4 h-4 text-secondary" />
        <h3 className="font-imperial font-bold text-sm tracking-[0.04em]">Closed Beta 퍼널</h3>
        {s && (
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
            {new Date(s.generated_at).toLocaleTimeString("ko-KR")}
          </span>
        )}
      </div>

      {loading || !s ? (
        <LoadingList rows={2} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Cell icon={Ticket} label="발급 코드" value={s.invites_issued.toLocaleString("ko-KR")} />
            <Cell
              icon={Users}
              label="좌석 점유"
              value={`${s.seats_used.toLocaleString("ko-KR")} / ${s.seats_total.toLocaleString("ko-KR")}`}
              hint={`${seatPct.toFixed(1)}%`}
            />
            <Cell icon={Users} label="고유 합류자" value={s.unique_redeemers.toLocaleString("ko-KR")} hint={`총 ${s.redemptions_total} 사용`} />
            <Cell
              icon={TrendingUp}
              label="합류→입금 (7d)"
              value={`${s.depositors_7d.toLocaleString("ko-KR")} / ${s.redeemers_7d.toLocaleString("ko-KR")}`}
              hint={`${dep7Pct.toFixed(1)}%`}
              tone="text-money-strong"
            />
          </div>
          <div className="mt-3 text-[10px] text-muted-foreground">
            30일 누적 입금 전환: {s.depositors_30d.toLocaleString("ko-KR")}명
          </div>
        </>
      )}
    </section>
  );
}

function Cell({
  icon: Icon, label, value, hint, tone,
}: { icon: typeof Users; label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className={`font-display font-black text-lg tabular-nums ${tone ?? ""}`}>{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">{hint}</div>}
    </div>
  );
}
