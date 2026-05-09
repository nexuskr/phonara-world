import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Check, X, Clock, Inbox } from "lucide-react";
import AdminReviewModal from "@/components/admin/AdminReviewModal";
import RequestTimeline from "@/components/RequestTimeline";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

type WR = {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  bank_name: string | null;
  bank_account: string | null;
  coin_address: string | null;
  coin_network: string | null;
  tx_code: string;
  status: string;
  tier_at_request: string;
  process_by: string;
  created_at: string;
};

function formatKRW(n: number) {
  return new Intl.NumberFormat("ko-KR").format(n) + "원";
}

type Action = "approve" | "reject" | "complete";

export default function WithdrawRequestsAdmin() {
  const [list, setList] = useState<WR[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [modal, setModal] = useState<{ id: string; action: Action } | null>(null);
  const [openTimeline, setOpenTimeline] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    let q = supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter === "pending") q = q.in("status", ["pending", "approved", "processing"]);
    const { data, error } = await q;
    if (error) toast({ title: "불러오기 실패", description: error.message, variant: "destructive" });
    else setList((data ?? []) as WR[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [filter]);

  useEffect(() => {
    const ch = supabase
      .channel("admin:wr")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, () => { void load(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter==="pending"?"bg-gradient-gold text-gold-foreground":"glass text-muted-foreground"}`}>
          대기/처리중
        </button>
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${filter==="all"?"bg-gradient-gold text-gold-foreground":"glass text-muted-foreground"}`}>
          전체
        </button>
        <button onClick={load} className="ml-auto px-3 py-1.5 rounded-lg text-xs glass text-muted-foreground">새로고침</button>
      </div>

      {loading && <LoadingList rows={5} rowHeight="lg" />}
      {!loading && list.length === 0 && (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title="서버 출금 요청이 없습니다"
          description="대기/처리중 또는 전체 필터를 변경해 보세요."
          variant="muted"
        />
      )}

      {list.map((w) => (
        <div key={w.id} className="glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                <Clock className="w-3 h-3" />
                {new Date(w.created_at).toLocaleString("ko-KR")}
                <span className="font-bold">{w.method === "coin" ? "🪙 COIN" : "🏦 BANK"}</span>
                <span className="px-1.5 py-0.5 rounded bg-gold/20 text-gold font-bold">{w.tier_at_request.toUpperCase()}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {w.method === "bank" ? `${w.bank_name} · ${w.bank_account}` : `${w.coin_network} · ${w.coin_address}`}
              </div>
              <div className="font-display font-black text-lg text-primary mt-1">{formatKRW(Number(w.amount))}</div>
              <div className="text-[10px] text-secondary font-mono mt-0.5">{w.tx_code}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">처리 기한: {new Date(w.process_by).toLocaleString("ko-KR")}</div>
            </div>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
              w.status === "pending" ? "bg-gold/20 text-gold" :
              w.status === "approved" ? "bg-primary/20 text-primary" :
              w.status === "completed" ? "bg-secondary/20 text-secondary" :
              "bg-destructive/20 text-destructive"
            }`}>{w.status}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3">
            {(w.status === "pending" || w.status === "approved" || w.status === "processing") && (
              <>
                {w.status === "pending" && (
                  <button onClick={() => setModal({ id: w.id, action: "approve" })} className="py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold">👍 승인</button>
                )}
                <button onClick={() => setModal({ id: w.id, action: "complete" })} className="py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 지급완료
                </button>
                <button onClick={() => setModal({ id: w.id, action: "reject" })} className="py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center gap-1">
                  <X className="w-3.5 h-3.5" /> 거절
                </button>
              </>
            )}
            <button onClick={() => setOpenTimeline(openTimeline === w.id ? null : w.id)}
              className="py-2 rounded-xl glass text-xs font-bold flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 타임라인
            </button>
          </div>
          {openTimeline === w.id && (
            <div className="mt-3">
              <RequestTimeline kind="withdrawal" requestId={w.id} />
            </div>
          )}
        </div>
      ))}

      {modal && (
        <AdminReviewModal
          open
          kind="withdrawal"
          requestId={modal.id}
          defaultAction={modal.action}
          onClose={() => setModal(null)}
          onResolved={() => void load()}
        />
      )}
    </div>
  );
}
