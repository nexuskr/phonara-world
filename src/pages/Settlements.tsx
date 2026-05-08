import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { Receipt, Clock, CheckCircle2, XCircle, Crown, TrendingUp } from "lucide-react";

type Purchase = {
  id: string;
  package_name: string;
  amount: number;
  daily_return: number;
  duration_days: number;
  total_return: number;
  settled_count: number;
  total_settled: number;
  next_settle_at: string | null;
  status: "pending" | "active" | "completed" | "rejected" | string;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
  rejected_reason: string | null;
  is_empire_founding_member: boolean;
  founding_seat_no: number | null;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  pending: { label: "승인 대기", tone: "text-gold bg-gold/15", icon: Clock },
  active: { label: "정산 중", tone: "text-secondary bg-secondary/15", icon: TrendingUp },
  completed: { label: "정산 완료", tone: "text-muted-foreground bg-muted/30", icon: CheckCircle2 },
  rejected: { label: "거절됨", tone: "text-destructive bg-destructive/15", icon: XCircle },
};

export default function Settlements() {
  const user = useRequireAuth();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    async function load() {
      const { data } = await supabase
        .from("package_purchases")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (mounted) {
        setRows((data ?? []) as Purchase[]);
        setLoading(false);
      }
    }
    void load();
    const ch = supabase
      .channel("user:settlements")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "package_purchases", filter: `user_id=eq.${user.id}` },
        () => void load()
      )
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  if (!user) return null;

  const totalEarned = rows.reduce((s, r) => s + (r.total_settled ?? 0), 0);
  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <Layout>
      <HubTabs hub="treasury" />
      <div className="container pt-2 pb-10 space-y-4 animate-liquid-in">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-strong rounded-2xl p-4 neon-border">
            <div className="text-[10px] text-muted-foreground">누적 정산 수령</div>
            <div className="font-display font-black text-lg text-gradient-gold mt-1">{formatKRW(totalEarned)}</div>
          </div>
          <div className="glass-strong rounded-2xl p-4 neon-border">
            <div className="text-[10px] text-muted-foreground">정산 중 패키지</div>
            <div className="font-display font-black text-lg mt-1">{activeCount}개</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Receipt className="w-4 h-4 text-gold" />
          <h2 className="font-display font-black text-sm">패키지 정산 내역</h2>
        </div>

        {loading && <div className="glass rounded-2xl p-10 text-center text-xs text-muted-foreground">불러오는 중…</div>}
        {!loading && rows.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
            아직 구매한 패키지가 없습니다
          </div>
        )}

        <div className="space-y-3">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? STATUS_META.pending;
            const Icon = meta.icon;
            const pct = r.duration_days > 0 ? Math.min(100, (r.settled_count / r.duration_days) * 100) : 0;
            return (
              <div key={r.id} className="glass-strong rounded-2xl p-4 neon-border">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display font-black text-sm truncate">{r.package_name}</span>
                      {r.is_empire_founding_member && (
                        <span className="text-[10px] text-gold flex items-center gap-0.5">
                          <Crown className="w-3 h-3" /> #{r.founding_seat_no}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString("ko-KR")}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold flex items-center gap-1 ${meta.tone}`}>
                    <Icon className="w-3 h-3" /> {meta.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                  <Cell label="투자" value={formatKRW(r.amount)} />
                  <Cell label="일정산" value={formatKRW(r.daily_return)} />
                  <Cell label="누적" value={formatKRW(r.total_settled)} />
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>{r.settled_count} / {r.duration_days}일 정산</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full bg-gradient-imperial transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {r.status === "active" && r.next_settle_at && (
                  <div className="mt-2 text-[10px] text-secondary">
                    다음 정산: {new Date(r.next_settle_at).toLocaleString("ko-KR")}
                  </div>
                )}
                {r.status === "rejected" && r.rejected_reason && (
                  <div className="mt-2 text-[10px] text-destructive">사유: {r.rejected_reason}</div>
                )}
                {r.status === "completed" && r.completed_at && (
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    완료: {new Date(r.completed_at).toLocaleString("ko-KR")} · 총 수령 {formatKRW(r.total_settled)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="font-bold mt-0.5 text-[11px]">{value}</div>
    </div>
  );
}
