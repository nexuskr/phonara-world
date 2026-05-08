import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Clock, CheckCircle2, XCircle, Loader2, ArrowUpRight, Filter, X, Banknote, Coins, Shield } from "lucide-react";

type Status = "pending" | "processing" | "approved" | "completed" | "rejected" | "cancelled";
type Method = "bank" | "coin";

type WR = {
  id: string;
  user_id: string;
  amount: number;
  method: Method;
  bank_name: string | null;
  bank_account: string | null;
  coin_address: string | null;
  coin_network: string | null;
  tx_code: string;
  status: Status;
  tier_at_request: string;
  process_by: string;
  approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  rejected_reason: string | null;
  receipt_url: string | null;
  admin_id: string | null;
};

const FILTERS: { key: Status | "all"; tKey: string }[] = [
  { key: "all", tKey: "all" },
  { key: "pending", tKey: "pending" },
  { key: "processing", tKey: "processing" },
  { key: "approved", tKey: "approved" },
  { key: "completed", tKey: "completed" },
  { key: "rejected", tKey: "rejected" },
];

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground",
  processing: "bg-primary/15 text-primary",
  approved: "bg-accent/15 text-accent",
  completed: "bg-secondary/20 text-secondary",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const PAGE_SIZE = 20;

export default function WithdrawalHistoryList() {
  const { t } = useTranslation("withdrawHistory");
  const [rows, setRows] = useState<WR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    let q = supabase
      .from("withdrawal_requests")
      .select("*", { count: "exact" })
      .eq("user_id", u.user.id);
    if (filter !== "all") q = q.eq("status", filter);
    q = q.order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await q;
    setRows((data || []) as WR[]);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [filter, page]);

  // Realtime: refresh on any change to user's withdrawal_requests
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      ch = supabase
        .channel(`wh-${u.user.id}`)
        .on("postgres_changes",
          { event: "*", schema: "public", table: "withdrawal_requests", filter: `user_id=eq.${u.user.id}` },
          () => { void load(); })
        .subscribe();
    })();
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [filter, page]);

  const opened = useMemo(() => rows.find((r) => r.id === openId) || null, [rows, openId]);
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <section>
      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 mb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => { setFilter(f.key); setPage(0); }}
            className={`shrink-0 min-h-[32px] px-3 rounded-full text-[11px] font-bold border transition ${
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border text-foreground/80"
            }`}
          >
            <Filter className="w-3 h-3 inline mr-1" />
            {t(`filter.${f.tKey}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-xs text-muted-foreground break-keep">{t("empty")}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <button
              key={r.id}
              onClick={() => setOpenId(r.id)}
              className="w-full text-left glass rounded-2xl p-4 border border-border hover:border-primary/40 transition flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl glass flex items-center justify-center text-primary shrink-0">
                {r.method === "bank" ? <Banknote className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-black text-sm text-money-strong tabular-nums">₩{Number(r.amount).toLocaleString()}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${STATUS_STYLE[r.status]}`}>
                    {t(`status.${r.status}`)}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  <span className="font-mono">{r.tx_code}</span>
                  <span className="mx-1.5">·</span>
                  {new Date(r.created_at).toLocaleString("ko-KR")}
                </div>
                {r.rejected_reason && (
                  <div className="text-[10px] text-destructive mt-0.5 truncate break-keep">{r.rejected_reason}</div>
                )}
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}

          {/* Pagination */}
          {lastPage > 0 && (
            <div className="flex items-center justify-between pt-3">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="text-xs px-3 py-1.5 rounded-md bg-card border border-border disabled:opacity-40"
              >‹ {t("prev")}</button>
              <span className="text-[10px] text-muted-foreground tabular-nums">{page + 1} / {lastPage + 1}</span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="text-xs px-3 py-1.5 rounded-md bg-card border border-border disabled:opacity-40"
              >{t("next")} ›</button>
            </div>
          )}
        </div>
      )}

      {opened && <DetailModal req={opened} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function DetailModal({ req, onClose }: { req: WR; onClose: () => void }) {
  const { t } = useTranslation("withdrawHistory");
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (req.receipt_url) {
      // If stored as path inside withdraw-receipts bucket, generate signed URL
      const path = req.receipt_url.includes("://") ? null : req.receipt_url;
      if (path) {
        supabase.storage.from("withdraw-receipts").createSignedUrl(path, 300).then(({ data }) => {
          if (active) setSignedUrl(data?.signedUrl ?? null);
        });
      } else {
        setSignedUrl(req.receipt_url);
      }
    }
    return () => { active = false; };
  }, [req.receipt_url]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto glass-strong rounded-3xl border border-border p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black tracking-wider uppercase text-muted-foreground">{t("modal.title")}</div>
            <div className="font-display font-black text-2xl text-money-strong tabular-nums">₩{Number(req.amount).toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{req.tx_code}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-card"><X className="w-4 h-4" /></button>
        </div>

        <div className={`px-2 py-1 rounded-md inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider ${STATUS_STYLE[req.status]}`}>
          {req.status === "completed" ? <CheckCircle2 className="w-3 h-3" /> :
           req.status === "rejected" ? <XCircle className="w-3 h-3" /> :
           <Clock className="w-3 h-3" />}
          {t(`status.${req.status}`)}
        </div>

        {/* Admin review fields */}
        <div className="rounded-2xl border border-border p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-wider text-accent">{t("modal.adminReview")}</span>
          </div>
          <Row label={t("modal.method")} value={t(`method.${req.method}`)} />
          {req.method === "bank" ? (
            <>
              <Row label={t("modal.bank")} value={req.bank_name || "—"} />
              <Row label={t("modal.account")} value={req.bank_account || "—"} mono />
            </>
          ) : (
            <>
              <Row label={t("modal.coinNetwork")} value={req.coin_network || "—"} />
              <Row label={t("modal.coinAddress")} value={req.coin_address || "—"} mono />
            </>
          )}
          <Row label={t("modal.tier")} value={req.tier_at_request.toUpperCase()} />
          {signedUrl && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">{t("modal.receipt")}</div>
              <a href={signedUrl} target="_blank" rel="noreferrer" className="block">
                <img src={signedUrl} alt="receipt" className="rounded-lg border border-border max-h-48 object-contain bg-card" />
              </a>
            </div>
          )}
          {!signedUrl && (
            <div className="text-[10px] text-muted-foreground">{t("modal.noReceipt")}</div>
          )}
        </div>

        {/* Timeline */}
        <div className="rounded-2xl border border-border p-3 space-y-1.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">{t("modal.timeline")}</div>
          <Step label={t("modal.requested")} ts={req.created_at} done />
          <Step label={t("modal.processBy")} ts={req.process_by} done={req.status !== "pending"} muted />
          <Step label={t("modal.approved")} ts={req.approved_at} done={!!req.approved_at} />
          <Step label={t("modal.completed")} ts={req.completed_at} done={!!req.completed_at} />
        </div>

        {req.rejected_reason && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-destructive mb-1">{t("modal.rejectedReason")}</div>
            <div className="text-xs text-foreground/90 break-keep">{req.rejected_reason}</div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center break-keep">{t("modal.zeroFeeNote")}</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-foreground/90 truncate text-right ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

function Step({ label, ts, done, muted }: { label: string; ts: string | null; done: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className={`w-2 h-2 rounded-full ${done ? "bg-primary" : "bg-muted"}`} />
      <span className={`flex-1 ${done ? "text-foreground/90" : "text-muted-foreground"} ${muted ? "italic" : ""}`}>{label}</span>
      <span className="text-muted-foreground tabular-nums text-[10px]">
        {ts ? new Date(ts).toLocaleString("ko-KR") : "—"}
      </span>
    </div>
  );
}
