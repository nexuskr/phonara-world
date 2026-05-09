import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { settlePackagesNow } from "@/lib/packages-rpc";
import { toast } from "@/hooks/use-toast";
import { formatKRW } from "@/lib/store";
import { Check, X, Zap, RefreshCw, AlertTriangle, Clock, TrendingUp, CheckCircle2, XCircle, Wrench } from "lucide-react";
import AdminReviewModal from "@/components/admin/AdminReviewModal";
import RequestTimeline from "@/components/RequestTimeline";

type Row = {
  id: string;
  user_id: string;
  package_name: string;
  amount: number;
  daily_return: number;
  duration_days: number;
  status: string;
  settled_count: number;
  total_settled: number;
  receipt_url: string | null;
  created_at: string;
  next_settle_at: string | null;
};

const STATUS_META: Record<string, { label: string; tone: string; icon: any }> = {
  pending: { label: "대기", tone: "text-gold bg-gold/15 border-gold/30", icon: Clock },
  active: { label: "승인/정산중", tone: "text-secondary bg-secondary/15 border-secondary/30", icon: TrendingUp },
  completed: { label: "정산 완료", tone: "text-muted-foreground bg-muted/30 border-muted", icon: CheckCircle2 },
  rejected: { label: "거절", tone: "text-destructive bg-destructive/15 border-destructive/30", icon: XCircle },
  failed: { label: "실패", tone: "text-destructive bg-destructive/15 border-destructive/30", icon: AlertTriangle },
};

export default function PackagePurchasesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("package_purchases")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "조회 실패", description: error.message });
      return;
    }
    setRows((data ?? []) as Row[]);
  }

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin:packages")
      .on("postgres_changes", { event: "*", schema: "public", table: "package_purchases" }, () => void load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function act(id: string, action: "approve" | "reject") {
    setBusy(true);
    try {
      const reason = action === "reject" ? prompt("거절 사유") ?? "rejected" : undefined;
      await adminResolvePackage(id, action, reason);
      toast({ title: action === "approve" ? "승인됨" : "거절됨" });
      await load();
    } catch (e: any) {
      toast({ title: "실패", description: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function settle() {
    setBusy(true);
    try {
      const r = await settlePackagesNow();
      toast({ title: "정산 완료", description: `${r.settled}건 처리` });
      await load();
    } catch (e: any) {
      toast({ title: "정산 실패", description: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function retryOne(r: Row) {
    setBusy(true);
    try {
      const r2 = await settlePackagesNow();
      toast({ title: "재시도 실행", description: `${r2.settled}건 처리됨` });
      await load();
    } catch (e: any) {
      toast({ title: "재시도 실패", description: e.message });
    } finally { setBusy(false); }
  }

  async function markResolve(r: Row) {
    const note = prompt("해결 메모 (관리자 감사 로그에 기록됨)") ?? "";
    if (!note) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("admin_audit_log").insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        action: "package_resolve_request",
        target_id: r.id,
        target_type: "package_purchase",
        metadata: { note, status: r.status, package_name: r.package_name },
      } as any);
      if (error) throw error;
      toast({ title: "해결 요청 기록됨" });
    } catch (e: any) {
      toast({ title: "기록 실패", description: e.message });
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-black text-lg">패키지 결제 신청</h3>
        <button onClick={settle} disabled={busy}
          className="px-3 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> 일일 정산 실행
        </button>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8 glass rounded-2xl">신청 내역 없음</div>
        )}
        {rows.map(r => {
          const meta = STATUS_META[r.status] ?? STATUS_META.pending;
          const Icon = meta.icon;
          return (
          <div key={r.id} className="glass rounded-2xl p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="font-display font-bold text-sm truncate">{r.package_name}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{r.user_id.slice(0, 8)} · {new Date(r.created_at).toLocaleString()}</div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold border flex items-center gap-1 ${meta.tone}`}>
                <Icon className="w-3 h-3" /> {meta.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
              <Cell label="금액" value={formatKRW(r.amount)} />
              <Cell label="일정산" value={formatKRW(r.daily_return)} />
              <Cell label="진행" value={`${r.settled_count}/${r.duration_days}`} />
            </div>
            {r.receipt_url && (
              <a href={r.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary underline mt-2 block truncate">영수증 보기</a>
            )}
            {r.status === "pending" && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => act(r.id, "approve")} disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-secondary/20 text-secondary text-xs font-bold flex items-center justify-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 승인
                </button>
                <button onClick={() => act(r.id, "reject")} disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-destructive/20 text-destructive text-xs font-bold flex items-center justify-center gap-1">
                  <X className="w-3.5 h-3.5" /> 거절
                </button>
              </div>
            )}
            {(r.status === "active" || r.status === "failed") && (
              <div className="flex gap-2 mt-2">
                <button onClick={() => retryOne(r)} disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-gold/20 text-gold text-xs font-bold flex items-center justify-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> 정산 재시도
                </button>
                <button onClick={() => markResolve(r)} disabled={busy}
                  className="flex-1 py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1">
                  <Wrench className="w-3.5 h-3.5" /> 해결 요청
                </button>
              </div>
            )}
            {r.status === "rejected" && (
              <button onClick={() => markResolve(r)} disabled={busy}
                className="w-full mt-2 py-2 rounded-xl bg-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1">
                <Wrench className="w-3.5 h-3.5" /> 해결 요청 기록
              </button>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className="font-bold mt-0.5">{value}</div>
    </div>
  );
}
