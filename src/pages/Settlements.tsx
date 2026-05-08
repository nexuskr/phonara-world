import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { Receipt, Clock, CheckCircle2, XCircle, Crown, TrendingUp, ChevronRight, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Money } from "@/components/ui/lux";

type Purchase = {
  id: string;
  package_id: string;
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
  receipt_url: string | null;
};

type Tx = {
  id: string;
  kind: string;
  direction: string;
  amount: number;
  created_at: string;
  ref_id: string | null;
  metadata: any;
};

const STATUS_TONE: Record<string, { tone: string; icon: any; key: string }> = {
  pending: { tone: "text-gold bg-gold/15 border-gold/30", icon: Clock, key: "stPending" },
  active: { tone: "text-secondary bg-secondary/15 border-secondary/30", icon: TrendingUp, key: "stActive" },
  completed: { tone: "text-muted-foreground bg-muted/30 border-muted", icon: CheckCircle2, key: "stCompleted" },
  rejected: { tone: "text-destructive bg-destructive/15 border-destructive/30", icon: XCircle, key: "stRejected" },
  failed: { tone: "text-destructive bg-destructive/15 border-destructive/30", icon: XCircle, key: "stFailed" },
};

export default function Settlements() {
  const { t, i18n } = useTranslation("settlements");
  const dtLocale = i18n.language?.startsWith("en") ? "en-US" : "ko-KR";
  const user = useRequireAuth();
  const [rows, setRows] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [detailTx, setDetailTx] = useState<Tx[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

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

  async function openDetail(p: Purchase) {
    setDetail(p);
    setDetailTx([]);
    setDetailLoading(true);
    const { data } = await supabase
      .from("transactions")
      .select("id,kind,direction,amount,created_at,ref_id,metadata")
      .eq("user_id", user!.id)
      .eq("ref_id", p.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setDetailTx((data ?? []) as Tx[]);
    setDetailLoading(false);
  }

  function badge(status: string) {
    const meta = STATUS_TONE[status] ?? STATUS_TONE.pending;
    return { ...meta, label: t(meta.key) };
  }

  if (!user) return null;

  const totalEarned = rows.reduce((s, r) => s + (r.total_settled ?? 0), 0);
  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <Layout>
      <HubTabs hub="treasury" />
      <div className="container pt-2 pb-10 space-y-4 animate-liquid-in">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-strong rounded-2xl p-4 neon-border min-h-[88px]">
            <div className="text-[10px] text-muted-foreground break-keep">{t("summaryTotal")}</div>
            <div className="font-display font-black text-lg sm:text-xl mt-1">
              <Money strong>{formatKRW(totalEarned)}</Money>
            </div>
          </div>
          <div className="glass-strong rounded-2xl p-4 neon-border min-h-[88px]">
            <div className="text-[10px] text-muted-foreground break-keep">{t("summaryActive")}</div>
            <div className="font-display font-black text-lg sm:text-xl mt-1 tabular-nums text-money-strong">
              {activeCount}{t("countSuffix")}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Receipt className="w-4 h-4 text-gold" />
          <h2 className="font-display font-black text-sm break-keep">{t("title")}</h2>
        </div>

        {loading && <div className="glass rounded-2xl p-10 text-center text-xs text-muted-foreground">{t("loading")}</div>}
        {!loading && rows.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground break-keep">
            {t("empty")}
          </div>
        )}

        <div className="space-y-3">
          {rows.map((r) => {
            const meta = badge(r.status);
            const Icon = meta.icon;
            const pct = r.duration_days > 0 ? Math.min(100, (r.settled_count / r.duration_days) * 100) : 0;
            return (
              <button
                key={r.id}
                onClick={() => openDetail(r)}
                className="w-full text-left glass-strong rounded-2xl p-4 neon-border hover:bg-accent/5 press transition min-h-[120px]"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-display font-black text-sm truncate break-keep">{r.package_name}</span>
                      {r.is_empire_founding_member && (
                        <span className="text-[10px] text-gold flex items-center gap-0.5 tabular-nums">
                          <Crown className="w-3 h-3" /> #{r.founding_seat_no}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">{new Date(r.created_at).toLocaleString(dtLocale)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border flex items-center gap-1 break-keep ${meta.tone}`}>
                      <Icon className="w-3 h-3" /> {meta.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                  <Cell label={t("cellInvest")} value={formatKRW(r.amount)} />
                  <Cell label={t("cellDaily")} value={formatKRW(r.daily_return)} />
                  <Cell label={t("cellTotal")} value={formatKRW(r.total_settled)} strong />
                </div>

                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1 tabular-nums">
                    <span>{t("progress", { c: r.settled_count, d: r.duration_days })}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                    <div className="h-full bg-gradient-imperial transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {detail && (
                <>
                  <span className="break-keep">{detail.package_name}</span>
                  {(() => {
                    const m = badge(detail.status);
                    const I = m.icon;
                    return (
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold border flex items-center gap-1 ${m.tone}`}>
                        <I className="w-3 h-3" /> {m.label}
                      </span>
                    );
                  })()}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <DetailBody p={detail} txs={detailTx} loading={detailLoading} t={t} dtLocale={dtLocale} badge={badge} />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function DetailBody({ p, txs, loading, t, dtLocale }: { p: Purchase; txs: Tx[]; loading: boolean; t: any; dtLocale: string; badge: (s: string) => any }) {
  const pct = p.duration_days > 0 ? Math.min(100, (p.settled_count / p.duration_days) * 100) : 0;
  const settleTx = useMemo(() => txs.filter((x) => x.kind === "package_settle" || (x.metadata?.event === "settle")), [txs]);
  const totalSettled = settleTx.reduce((s, x) => s + (x.amount ?? 0), 0);

  return (
    <div className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-2">
        <Cell label={t("detailInvest")} value={formatKRW(p.amount)} />
        <Cell label={t("detailReturn")} value={formatKRW(p.total_return)} strong />
        <Cell label={t("detailDaily")} value={formatKRW(p.daily_return)} />
        <Cell label={t("detailDuration")} value={`${p.duration_days}${t("daySuffix")}`} />
        <Cell label={t("detailSettled")} value={formatKRW(p.total_settled)} strong />
        <Cell label={t("detailProgress")} value={`${p.settled_count}/${p.duration_days} (${pct.toFixed(0)}%)`} />
      </div>

      {p.status === "rejected" && p.rejected_reason && (
        <div className="glass rounded-lg p-2 text-destructive text-[11px] break-keep">{t("reason", { val: p.rejected_reason })}</div>
      )}
      {p.receipt_url && (
        <a href={p.receipt_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary underline block min-h-[36px] inline-flex items-center">
          {t("receipt")}
        </a>
      )}

      <div>
        <div className="font-bold flex items-center gap-1 mb-2 break-keep">
          <Calendar className="w-3.5 h-3.5 text-gold" /> {t("timelineTitle")}
        </div>
        <ul className="space-y-1.5">
          <TimelineItem when={p.created_at} label={t("tlReceived")} tone="muted" dtLocale={dtLocale} />
          {p.approved_at && <TimelineItem when={p.approved_at} label={t("tlApproved")} tone="ok" dtLocale={dtLocale} />}
          {p.next_settle_at && p.status === "active" && (
            <TimelineItem when={p.next_settle_at} label={t("tlNext")} tone="info" dtLocale={dtLocale} />
          )}
          {p.completed_at && <TimelineItem when={p.completed_at} label={t("tlCompleted")} tone="ok" dtLocale={dtLocale} />}
          {p.status === "rejected" && <TimelineItem when={p.created_at} label={t("tlRejected")} tone="fail" dtLocale={dtLocale} />}
        </ul>
      </div>

      <div>
        <div className="font-bold flex items-center justify-between mb-2 gap-2 flex-wrap">
          <span className="break-keep">{t("relatedTx")} {txs.length > 0 && <span className="tabular-nums">({txs.length})</span>}</span>
          {settleTx.length > 0 && <span className="text-[10px] text-muted-foreground font-normal break-keep tabular-nums">{t("settleSum", { val: formatKRW(totalSettled) })}</span>}
        </div>
        {loading && <div className="glass rounded-lg p-3 text-center text-[11px] text-muted-foreground">{t("loading")}</div>}
        {!loading && txs.length === 0 && (
          <div className="glass rounded-lg p-3 text-center text-[11px] text-muted-foreground break-keep">{t("noRelated")}</div>
        )}
        <ul className="space-y-1 max-h-60 overflow-y-auto">
          {txs.map((x) => (
            <li key={x.id} className="glass rounded-lg p-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{x.kind}</div>
                <div className="text-[9px] text-muted-foreground tabular-nums">{new Date(x.created_at).toLocaleString(dtLocale)}</div>
              </div>
              <div className={`text-[11px] font-bold tabular-nums ${x.direction === "credit" ? "text-secondary" : "text-destructive"}`}>
                {x.direction === "credit" ? "+" : "-"}{formatKRW(x.amount)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TimelineItem({ when, label, tone, dtLocale }: { when: string; label: string; tone: "ok" | "fail" | "info" | "muted"; dtLocale: string }) {
  const dot =
    tone === "ok" ? "bg-secondary" : tone === "fail" ? "bg-destructive" : tone === "info" ? "bg-gold" : "bg-muted-foreground";
  return (
    <li className="flex items-start gap-2 text-[11px]">
      <span className={`w-2 h-2 rounded-full mt-1.5 ${dot}`} />
      <div className="flex-1 flex justify-between gap-2 flex-wrap">
        <span className="break-keep">{label}</span>
        <span className="text-muted-foreground text-[10px] tabular-nums">{new Date(when).toLocaleString(dtLocale)}</span>
      </div>
    </li>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[9px] text-muted-foreground break-keep">{label}</div>
      <div className={`font-bold mt-0.5 text-[11px] tabular-nums ${strong ? "text-money-strong" : ""}`}>{value}</div>
    </div>
  );
}

// Backwards compat export retained for any external imports
export function statusBadge(_status: string) {
  return STATUS_TONE[_status] ?? STATUS_TONE.pending;
}
