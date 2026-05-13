import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Banknote, CheckCircle2 } from "lucide-react";

type Row = {
  masked_nick: string;
  amount_krw: number;
  completed_at: string;
  minutes_to_complete: number;
  tier: string;
};

const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

const relTime = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}초 전`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
};

export default function LiveWithdrawalsTable() {
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = async () => {
    const { data } = await supabase.rpc("get_recent_payouts_100");
    setRows((data as Row[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("trust_live_withdrawals_" + Math.random().toString(36).slice(2))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "withdrawal_requests", filter: "status=eq.completed" },
        () => load(),
      )
      .subscribe();
    const id = setInterval(load, 30_000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(id);
    };
  }, []);

  if (rows === null) return <LoadingList rows={5} />;
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Banknote}
        title="아직 완료된 출금이 없습니다"
        description="첫 출금이 완료되는 순간 이곳에 실시간으로 표시됩니다."
      />
    );
  }

  const total = rows.reduce((s, r) => s + Number(r.amount_krw || 0), 0);
  const avgMin = Math.round(rows.reduce((s, r) => s + r.minutes_to_complete, 0) / rows.length);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground">최근 30일 완료</div>
          <div className="font-imperial font-black text-base text-money-strong tabular-nums">{rows.length}건</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground">총 지급</div>
          <div className="font-imperial font-black text-base text-money-strong tabular-nums">{fmtKRW(total)}</div>
        </div>
        <div className="glass rounded-xl p-3">
          <div className="text-[10px] text-muted-foreground">평균 처리</div>
          <div className="font-imperial font-black text-base text-foreground tabular-nums">{avgMin}분</div>
        </div>
      </div>

      <div className="glass rounded-2xl divide-y divide-border/40 max-h-[420px] overflow-y-auto">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-money-strong shrink-0" />
              <span className="font-medium truncate">{r.masked_nick}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 uppercase">{r.tier}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-imperial font-bold text-money-strong tabular-nums">{fmtKRW(r.amount_krw)}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right">{relTime(r.completed_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
