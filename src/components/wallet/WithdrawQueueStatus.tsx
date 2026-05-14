import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel, type ConnState } from "@/hooks/use-realtime-channel";
import { toast } from "@/hooks/use-toast";
import { Clock, Crown, CheckCircle2, XCircle, Zap, ArrowRight, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";

type Status = "pending" | "processing" | "approved" | "completed" | "rejected" | "canceled";

type Latest = {
  id: string;
  amount: number;
  status: Status;
  tier_at_request: string;
  created_at: string;
  rejected_reason: string | null;
  tx_code: string;
  method: string;
};

const PRIORITY_TIERS = new Set(["vip", "god", "empire"]);
const STATUS_ORDER: Status[] = ["pending", "processing", "approved", "completed"];

type ConnBadgeState = "connecting" | "live" | "polling" | "offline";

export default function WithdrawQueueStatus() {
  const { t } = useTranslation("withdrawQueue");
  const [latest, setLatest] = useState<Latest | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [conn, setConn] = useState<ConnBadgeState>("connecting");

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    if (uid !== u.user.id) setUid(u.user.id);

    const { data, error } = await supabase
      .from("withdrawal_requests")
      .select("id, amount, status, tier_at_request, created_at, rejected_reason, tx_code, method")
      .eq("user_id", u.user.id)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setLoading(false);
      return;
    }

    if (data) {
      setLatest(data as Latest);
      const tier = (data as Latest).tier_at_request;
      const isPriority = PRIORITY_TIERS.has(tier);
      let q = supabase
        .from("withdrawal_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", (data as Latest).created_at);
      if (isPriority) q = q.in("tier_at_request", ["vip", "god", "empire"]);
      const { count } = await q;
      setPosition((count ?? 0) + 1);
    } else {
      setLatest(null);
      setPosition(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 통합 realtime: 채널 dedup + 자동 재연결 + 폴링 폴백 + 포커스 재개
  useRealtimeChannel({
    key: uid ? `wr-${uid}` : "",
    bindings: uid
      ? [{ event: "*", table: "withdrawal_requests", filter: `user_id=eq.${uid}` }]
      : [],
    enabled: !!uid,
    onEvent: (payload) => {
      const newRow: any = (payload as any).new;
      const oldRow: any = (payload as any).old;
      if (newRow && oldRow && newRow.status !== oldRow.status) {
        const titleKey = newRow.status === "completed" ? "toastCompleted"
          : newRow.status === "rejected" ? "toastRejected"
          : newRow.status === "approved" ? "toastApproved"
          : newRow.status === "processing" ? "toastProcessing"
          : "toastUpdate";
        toast({
          title: t(titleKey),
          description: t("toastDesc", { amount: Number(newRow.amount).toLocaleString() }),
          variant: newRow.status === "rejected" ? "destructive" : undefined,
        });
      }
      void refresh();
    },
    onStatus: (s: ConnState) => {
      setConn(s === "live" ? "live" : s === "down" ? "polling" : "connecting");
    },
    pollMs: 15_000,
    onPoll: () => { void refresh(); },
    resumeOnFocus: true,
  });

  if (loading) return <div className="glass rounded-2xl p-4 h-24 animate-pulse mb-5" />;
  if (!latest) {
    return (
      <div className="glass rounded-2xl p-4 mb-5 border border-border/40">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="break-keep">{t("noActive")}</span>
        </div>
      </div>
    );
  }

  const isPriority = PRIORITY_TIERS.has(latest.tier_at_request);
  const stepIndex = STATUS_ORDER.indexOf(latest.status);
  const rejected = latest.status === "rejected";

  return (
    <div className="glass-strong rounded-2xl p-4 mb-5 border border-primary/30 neon-border">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold tracking-wider uppercase">{t("title")}</span>
          <ConnBadge state={conn} onRetry={() => { void refresh(); }} t={t} />
        </div>
        {isPriority && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-gold/20 border border-gold/40">
            <Crown className="w-3 h-3 text-gold" />
            <span className="text-[10px] font-black text-gold tracking-wider">{t("priorityBadge")}</span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-black text-2xl text-money-strong tabular-nums">
          ₩{latest.amount.toLocaleString()}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {t("txCode")} <span className="font-mono">{latest.tx_code}</span>
        </span>
      </div>

      {!rejected && position !== null && (
        <div className="mb-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
          <div className="text-[10px] text-muted-foreground mb-1">
            {isPriority ? t("priorityQueue") : t("standardQueue")}
          </div>
          <div className="font-display font-black text-lg tabular-nums text-primary">
            {t("positionLabel", { n: position })}
          </div>
          <div className="text-[10px] text-muted-foreground mt-1 break-keep">
            {isPriority ? t("priorityHint") : t("upgradeHint")}
          </div>
        </div>
      )}

      {/* Timeline */}
      {!rejected ? (
        <div className="flex items-center gap-1">
          {STATUS_ORDER.map((s, i) => {
            const done = i <= stepIndex;
            const active = i === stepIndex;
            return (
              <div key={s} className="flex-1 flex items-center gap-1">
                <div className={`flex flex-col items-center gap-1 flex-1`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
                    done
                      ? active
                        ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                        : "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {s === "completed" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-black">{i + 1}</span>}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${done ? "text-foreground" : "text-muted-foreground"}`}>
                    {t(`step.${s}`)}
                  </span>
                </div>
                {i < STATUS_ORDER.length - 1 && (
                  <ArrowRight className={`w-3 h-3 shrink-0 ${i < stepIndex ? "text-primary" : "text-muted-foreground/40"}`} />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
          <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-destructive">{t("step.rejected")}</div>
            {latest.rejected_reason && (
              <div className="text-[10px] text-muted-foreground mt-1 break-keep">{latest.rejected_reason}</div>
            )}
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center mt-3 break-keep">
        {t("zeroFeeNote")}
      </p>
    </div>
  );
}

function ConnBadge({ state, onRetry, t }: { state: ConnBadgeState; onRetry: () => void; t: (k: string) => string }) {
  if (state === "live") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-secondary/15 text-secondary">
        <Wifi className="w-2.5 h-2.5" /> LIVE
      </span>
    );
  }
  if (state === "polling") {
    return (
      <button onClick={onRetry} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-yellow-500/15 text-yellow-300">
        <RefreshCw className="w-2.5 h-2.5" /> POLLING
      </button>
    );
  }
  if (state === "offline") {
    return (
      <button onClick={onRetry} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-destructive/15 text-destructive">
        <WifiOff className="w-2.5 h-2.5" /> OFFLINE
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-muted text-muted-foreground">
      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> ...
    </span>
  );
}
