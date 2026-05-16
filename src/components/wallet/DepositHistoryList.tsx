import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWalletChannel } from "@pkg/realtime";
import { Clock, CheckCircle2, XCircle, ArrowUpRight, X, Banknote, Coins, Ticket, Shield, FileText, Inbox } from "lucide-react";
import RequestTimeline from "@/components/RequestTimeline";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type Status = "pending" | "approved" | "rejected" | "cancelled";
type Method = "bank" | "coin" | "voucher";

type DR = {
  id: string;
  user_id: string;
  amount: number;
  method: Method;
  package_name: string | null;
  voucher_brand: string | null;
  receipt_url: string | null;
  memo: string | null;
  status: Status;
  rejected_reason: string | null;
  bonus_amount: number;
  bonus_pct: number;
  admin_review_memo: string | null;
  approved_at: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<Status, string> = {
  pending: "bg-muted text-muted-foreground",
  approved: "bg-secondary/20 text-secondary",
  rejected: "bg-destructive/15 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<Status, string> = {
  pending: "검수 대기",
  approved: "승인됨",
  rejected: "거절",
  cancelled: "취소",
};

const METHOD_ICON: Record<Method, typeof Banknote> = {
  bank: Banknote,
  coin: Coins,
  voucher: Ticket,
};

const PAGE_SIZE = 20;

export default function DepositHistoryList() {
  const [uid, setUid] = useState<string | null>(null);
  const [rows, setRows] = useState<DR[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setLoading(false); return; }
    const { data, count } = await supabase
      .from("deposit_requests")
      .select("*", { count: "exact" })
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    setRows((data || []) as DR[]);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [page]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  useWalletChannel({
    key: uid ? `dh-${uid}` : "",
    bindings: uid
      ? [{ event: "*", table: "deposit_requests", filter: `user_id=eq.${uid}` }]
      : [],
    onEvent: () => { void load(); },
    enabled: !!uid,
  });

  const opened = useMemo(() => rows.find((r) => r.id === openId) || null, [rows, openId]);
  const lastPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  if (loading) {
    return <LoadingList rows={4} rowHeight="md" />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="w-5 h-5" />}
        title="충전 신청 내역이 없습니다"
        description="첫 충전을 진행하면 이곳에 검수 진행 상황이 실시간으로 표시됩니다."
        variant="muted"
      />
    );
  }

  return (
    <section>
      <div className="space-y-2">
        {rows.map((r) => {
          const Icon = METHOD_ICON[r.method];
          return (
            <button key={r.id} onClick={() => setOpenId(r.id)}
              className="w-full text-left glass rounded-2xl p-4 border border-border hover:border-primary/40 transition flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl glass flex items-center justify-center text-primary shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-black text-sm tabular-nums">₩{Number(r.amount).toLocaleString()}</span>
                  {r.bonus_amount > 0 && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gold/20 text-gold">+{r.bonus_pct}%</span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {r.package_name ?? "충전"} · {new Date(r.created_at).toLocaleString("ko-KR")}
                </div>
                {r.rejected_reason && (
                  <div className="text-[10px] text-destructive mt-0.5 truncate">{r.rejected_reason}</div>
                )}
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          );
        })}

        {lastPage > 0 && (
          <div className="flex items-center justify-between pt-3">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="text-xs px-3 py-1.5 rounded-md bg-card border border-border disabled:opacity-40">‹ 이전</button>
            <span className="text-[10px] text-muted-foreground tabular-nums">{page + 1} / {lastPage + 1}</span>
            <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage}
              className="text-xs px-3 py-1.5 rounded-md bg-card border border-border disabled:opacity-40">다음 ›</button>
          </div>
        )}
      </div>

      {opened && <DepositDetailModal req={opened} onClose={() => setOpenId(null)} />}
    </section>
  );
}

function DepositDetailModal({ req, onClose }: { req: DR; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto glass-strong rounded-3xl border border-border p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">충전 신청</div>
            <div className="font-display font-black text-2xl tabular-nums">₩{Number(req.amount).toLocaleString()}</div>
            {req.bonus_amount > 0 && (
              <div className="text-[11px] text-gold font-bold mt-0.5">+ 보너스 ₩{Number(req.bonus_amount).toLocaleString()} ({req.bonus_pct}%)</div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-card"><X className="w-4 h-4" /></button>
        </div>

        <div className={`px-2 py-1 rounded-md inline-flex items-center gap-1.5 text-[10px] font-black uppercase ${STATUS_STYLE[req.status]}`}>
          {req.status === "approved" ? <CheckCircle2 className="w-3 h-3" /> :
           req.status === "rejected" ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
          {STATUS_LABEL[req.status]}
        </div>

        <div className="rounded-2xl border border-border p-3 space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span className="text-[10px] font-black uppercase tracking-wider text-accent">신청 정보</span>
          </div>
          <Row label="결제 수단" value={req.method === "bank" ? "계좌이체" : req.method === "coin" ? "암호화폐" : "상품권"} />
          {req.voucher_brand && <Row label="상품권" value={req.voucher_brand} />}
          {req.package_name && <Row label="패키지/메모" value={req.package_name} />}
          <Row label="신청일시" value={new Date(req.created_at).toLocaleString("ko-KR")} />
          {req.approved_at && <Row label="승인일시" value={new Date(req.approved_at).toLocaleString("ko-KR")} />}
        </div>

        <div className="rounded-2xl border border-border p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-2">실시간 처리 이력</div>
          <RequestTimeline kind="deposit" requestId={req.id} />
        </div>

        {req.admin_review_memo && (
          <div className="rounded-2xl border border-accent/40 bg-accent/5 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-wider text-accent">관리자 검수 메모</span>
            </div>
            <div className="text-xs text-foreground/90 break-keep whitespace-pre-wrap">{req.admin_review_memo}</div>
          </div>
        )}

        {req.rejected_reason && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-destructive mb-1">거절 사유</div>
            <div className="text-xs text-foreground/90 break-keep">{req.rejected_reason}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground/90 truncate text-right">{value}</span>
    </div>
  );
}
