import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatKRW } from "@/lib/store";
import { Check, X, Clock } from "lucide-react";
import AdminReviewModal from "@/components/admin/AdminReviewModal";
import RequestTimeline from "@/components/RequestTimeline";

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
  const [busy, setBusy] = useState(false);

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

  async function act(id: string, action: "approve" | "reject") {
    setBusy(true);
    try {
      const reason = action === "reject" ? prompt("거절 사유") ?? "rejected" : undefined;
      await adminResolveDeposit(id, action, reason);
      const row = rows.find(r => r.id === id);
      if (row) {
        await sendAdminNotification({
          userId: row.user_id,
          template: action === "approve" ? "deposit-approved" : "deposit-rejected",
          idempotencyKey: `dep-${action}-${id}`,
          data: { amount: row.amount, method: row.method, reason },
        });
      }
      toast({ title: action === "approve" ? "승인 + 잔액 적립 + 메일 전송" : "거절 + 메일 전송" });
      await load();
    } catch (e: any) {
      toast({ title: "실패", description: e.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display font-black text-lg">충전 신청 (서버)</h3>
      {rows.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-8 glass rounded-2xl">신청 내역 없음</div>
      )}
      {rows.map(r => (
        <div key={r.id} className="glass rounded-2xl p-3">
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
          {r.status === "pending" && (
            <div className="flex gap-2 mt-2">
              <button onClick={() => act(r.id, "approve")} disabled={busy}
                className="flex-1 py-2 rounded-xl bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5" /> 승인 (자동 적립)
              </button>
              <button onClick={() => act(r.id, "reject")} disabled={busy}
                className="flex-1 py-2 rounded-xl bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-1">
                <X className="w-3.5 h-3.5" /> 거절
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
