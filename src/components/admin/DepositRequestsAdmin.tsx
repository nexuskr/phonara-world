import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatKRW } from "@/lib/store";
import { Check, X, Clock, Inbox } from "lucide-react";
import AdminReviewModal from "@/components/admin/AdminReviewModal";
import RequestTimeline from "@/components/RequestTimeline";
import { EmptyState } from "@/components/ui/empty-state";
import { useDeepLinkHighlight } from "@/hooks/use-deep-link-highlight";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  user_id: string;
  amount: number;
  method: "bank" | "coin";
  package_id: string | null;
  package_name: string | null;
  receipt_url: string | null;
  memo: string | null;
  status: string;
  rejected_reason: string | null;
  created_at: string;
};

export default function DepositRequestsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [modal, setModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [openTimeline, setOpenTimeline] = useState<string | null>(null);
  const highlightId = useDeepLinkHighlight();

  async function load() {
    const { data, error } = await supabase
      .from("deposit_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) { toast({ title: "조회 실패", description: error.message }); return; }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin:deposits")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-3">
      <h3 className="font-display font-black text-lg">충전 신청 (서버)</h3>
      {rows.length === 0 && (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title="신청 내역 없음"
          description="새로운 충전 신청이 들어오면 여기에 표시됩니다."
          variant="muted"
          size="sm"
        />
      )}
      {rows.map(r => (
        <div
          key={r.id}
          data-row-id={r.id}
          className={cn(
            "glass rounded-2xl p-3 transition-all",
            highlightId === r.id && "ring-2 ring-primary shadow-lg shadow-primary/20",
          )}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="font-display font-bold text-sm truncate">
                {r.package_name ?? "충전"} · {r.method === "bank" ? "🏦 BANK" : "🪙 COIN"}
              </div>
              <div className="text-[10px] text-muted-foreground font-mono truncate">
                {r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-base text-gradient-gold">{formatKRW(r.amount)}</div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                r.status === "pending" ? "bg-gold/20 text-gold" :
                r.status === "approved" ? "bg-secondary/20 text-secondary" :
                r.status === "rejected" ? "bg-destructive/20 text-destructive" : "bg-muted"
              }`}>{r.status}</span>
            </div>
          </div>
          {r.receipt_url && (
            <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline mt-2 block truncate">영수증 보기</a>
          )}
          {r.memo && <div className="text-[11px] text-muted-foreground mt-1">메모: {r.memo}</div>}
          <div className="flex gap-2 mt-2">
            {r.status === "pending" && (
              <>
                <button onClick={() => setModal({ id: r.id, action: "approve" })}
                  className="flex-1 py-2 rounded-xl bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 포렌식 승인
                </button>
                <button onClick={() => setModal({ id: r.id, action: "reject" })}
                  className="flex-1 py-2 rounded-xl bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-1">
                  <X className="w-3.5 h-3.5" /> 거절
                </button>
              </>
            )}
            <button onClick={() => setOpenTimeline(openTimeline === r.id ? null : r.id)}
              className="px-3 py-2 rounded-xl glass text-xs font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 타임라인
            </button>
          </div>
          {openTimeline === r.id && (
            <div className="mt-3">
              <RequestTimeline kind="deposit" requestId={r.id} />
            </div>
          )}
        </div>
      ))}
      {modal && (
        <AdminReviewModal
          open
          kind="deposit"
          requestId={modal.id}
          defaultAction={modal.action}
          onClose={() => setModal(null)}
          onResolved={() => void load()}
        />
      )}
    </div>
  );
}
