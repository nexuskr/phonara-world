// V17 /admin/revenue — daily KPI roll-up of revenue_events (admin only).
import { useEffect, useState } from "react";
import { useVisibleInterval } from "@/lib/util/visible-interval";
import { TrendingUp, RefreshCw, BadgeDollarSign, Megaphone, Coins, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRequireAdmin } from "@/hooks/use-require-auth";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type RevenueRow = {
  source: "subscription" | "ad" | "fee" | "other";
  amount_krw: number;
  created_at: string;
  user_id: string | null;
  attribution_video_id: string | null;
};

const SOURCE_META: Record<RevenueRow["source"], { label: string; icon: typeof BadgeDollarSign; tone: string }> = {
  subscription: { label: "구독", icon: BadgeDollarSign, tone: "text-gold" },
  ad: { label: "광고", icon: Megaphone, tone: "text-secondary" },
  fee: { label: "수수료", icon: Coins, tone: "text-primary" },
  other: { label: "기타", icon: Sparkles, tone: "text-muted-foreground" },
};

function fmtKRW(n: number) {
  return `₩${Math.round(n).toLocaleString()}`;
}

export default function AdminRevenue() {
  const user = useRequireAdmin();
  const [rows, setRows] = useState<RevenueRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("revenue_events" as any)
      .select("source, amount_krw, created_at, user_id, attribution_video_id")
      .gt("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    setRows(((data as unknown) as RevenueRow[] | null) ?? []);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user?.isAdmin) return;
    void load();
  }, [user?.isAdmin]);
  useVisibleInterval(() => { if (user?.isAdmin) void load(); }, 60_000, !!user?.isAdmin);

  if (!user) return null;
  if (!user.isAdmin) {
    return (
      <>
        <div className="container py-12">
          <EmptyState title="권한 없음" description="관리자 전용 화면입니다." variant="error" />
        </div>
      </>
    );
  }

  const totals = (["subscription", "ad", "fee", "other"] as const).map((src) => ({
    source: src,
    sum: (rows ?? []).filter((r) => r.source === src).reduce((a, b) => a + Number(b.amount_krw), 0),
  }));
  const total7d = totals.reduce((a, b) => a + b.sum, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const total24h = (rows ?? [])
    .filter((r) => new Date(r.created_at) >= today)
    .reduce((a, b) => a + Number(b.amount_krw), 0);

  return (
    <>
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display font-black text-2xl sm:text-3xl flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-gold" /> Revenue (V17)
            </h1>
            <p className="text-xs text-muted-foreground mt-1">최근 7일 매출 이벤트 집계 · 60초 자동 새로고침</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="glass-strong rounded-xl px-3 py-2 text-xs font-bold border border-border/60 hover:border-primary/60 transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> 새로고침
          </button>
        </div>

        {rows == null ? (
          <LoadingList rows={2} />
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Kpi label="7일 합계" value={fmtKRW(total7d)} tone="gold" />
              <Kpi label="오늘" value={fmtKRW(total24h)} tone="primary" />
              <Kpi label="이벤트 수" value={(rows.length).toLocaleString()} tone="secondary" />
            </section>

            <section>
              <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">
                소스별 7일
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {totals.map(({ source, sum }) => {
                  const meta = SOURCE_META[source];
                  const Icon = meta.icon;
                  return (
                    <div key={source} className="glass-strong rounded-2xl p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] tracking-[0.2em] font-black uppercase text-muted-foreground">
                          {meta.label}
                        </span>
                        <Icon className={`w-4 h-4 ${meta.tone}`} />
                      </div>
                      <div className={`font-display font-black text-xl tabular-nums ${meta.tone}`}>
                        {fmtKRW(sum)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="text-[10px] tracking-[0.3em] font-black text-muted-foreground uppercase mb-2">
                최근 이벤트
              </h2>
              {rows.length === 0 ? (
                <EmptyState
                  title="매출 이벤트가 아직 없습니다"
                  description="record_revenue_event RPC로 적재되면 이곳에 나타납니다."
                  variant="muted"
                  size="sm"
                />
              ) : (
                <div className="glass-strong rounded-2xl border border-border/50 divide-y divide-border/40">
                  {rows.slice(0, 30).map((r, i) => {
                    const meta = SOURCE_META[r.source];
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                        <span className={`font-bold ${meta.tone} w-16`}>{meta.label}</span>
                        <span className="flex-1 text-muted-foreground truncate">
                          {r.attribution_video_id ? `via ${r.attribution_video_id.slice(0, 10)}…` : "—"}
                        </span>
                        <span className="font-display font-black tabular-nums">
                          {fmtKRW(Number(r.amount_krw))}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums w-32 text-right">
                          {new Date(r.created_at).toLocaleString("ko-KR")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: "gold" | "primary" | "secondary" }) {
  const toneClass =
    tone === "gold" ? "text-gold border-gold/30" : tone === "primary" ? "text-primary border-primary/30" : "text-secondary border-secondary/30";
  return (
    <div className={`glass-strong rounded-2xl p-4 border ${toneClass}`}>
      <div className="text-[10px] tracking-[0.2em] font-black uppercase text-muted-foreground mb-2">{label}</div>
      <div className={`font-display font-black text-2xl tabular-nums ${toneClass.split(" ")[0]}`}>{value}</div>
    </div>
  );
}
