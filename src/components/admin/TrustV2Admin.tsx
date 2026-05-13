import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { CheckCircle2, XCircle, RotateCcw, HeartHandshake, Loader2, RefreshCw } from "lucide-react";

const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n || 0);

type Stats = {
  generated_at: string;
  refunds: {
    pending: number; approved: number; rejected: number; completed: number;
    total_refunded_krw: number; last_7d: number;
  };
  loss_protection: {
    claims: number; net_loss_krw: number; refunded_phon: number;
    avg_ratio: number; last_7d: number;
  };
  godmode: { total: number; active_protection: number };
};

type RefundRow = {
  id: string;
  user_id: string;
  nickname: string;
  reason: string;
  amount_krw: number;
  status: string;
  admin_memo: string | null;
  created_at: string;
  resolved_at: string | null;
};

type StatusFilter = "pending" | "approved" | "rejected" | "completed" | "all";

export default function TrustV2Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<RefundRow[] | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [loading, setLoading] = useState(true);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: s }, { data: r }] = await Promise.all([
        supabase.rpc("admin_get_trust_v2_stats"),
        supabase.rpc("admin_list_refund_requests", {
          _status: filter === "all" ? null : filter,
          _limit: 100,
          _offset: 0,
        }),
      ]);
      setStats((s as unknown as Stats) ?? null);
      setRows((r as RefundRow[]) ?? []);
    } catch (e: any) {
      notify.error(e?.message ?? "불러오기 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_trust_v2_" + Math.random().toString(36).slice(2))
      .on("postgres_changes", { event: "*", schema: "public", table: "refund_requests" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "loss_protection_claims" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const resolve = async (id: string, approve: boolean) => {
    const memo = (memos[id] ?? "").trim();
    if (!memo || memo.length < 3) {
      notify.error("관리자 메모를 3자 이상 입력해주세요.");
      return;
    }
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("admin_resolve_refund", {
        _id: id, _approve: approve, _memo: memo,
      });
      if (error) throw error;
      notify.success(approve ? "환불 승인되었습니다." : "환불 반려되었습니다.");
      setMemos((m) => ({ ...m, [id]: "" }));
      await load();
    } catch (e: any) {
      notify.error(e?.message ?? "처리 실패");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-secondary mb-3">
            <RotateCcw className="w-4 h-4" />
            <span className="font-imperial font-bold text-sm">환불 (7일 보장)</span>
          </div>
          {!stats ? <LoadingList rows={2} /> : (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Cell label="대기" value={stats.refunds.pending} hot={stats.refunds.pending > 0} />
              <Cell label="승인" value={stats.refunds.approved} />
              <Cell label="반려" value={stats.refunds.rejected} />
              <Cell label="완료" value={stats.refunds.completed} />
              <Cell label="7일 신청" value={stats.refunds.last_7d} />
              <Cell label="총 환불액" value={fmtKRW(stats.refunds.total_refunded_krw)} money />
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 text-money-strong mb-3">
            <HeartHandshake className="w-4 h-4" />
            <span className="font-imperial font-bold text-sm">손실 보호 (70%)</span>
          </div>
          {!stats ? <LoadingList rows={2} /> : (
            <div className="grid grid-cols-3 gap-2 text-center">
              <Cell label="청구 건수" value={stats.loss_protection.claims} />
              <Cell label="7일 청구" value={stats.loss_protection.last_7d} />
              <Cell label="평균 환급률" value={`${(stats.loss_protection.avg_ratio * 100).toFixed(1)}%`} />
              <Cell label="총 손실" value={fmtKRW(stats.loss_protection.net_loss_krw)} />
              <Cell label="환급 PHON" value={stats.loss_protection.refunded_phon.toLocaleString("ko-KR")} money />
              <Cell label="활성 보호중" value={stats.godmode.active_protection} hot={stats.godmode.active_protection > 0} />
            </div>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto">
          {(["pending", "approved", "rejected", "completed", "all"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                filter === f ? "bg-gradient-gold text-gold-foreground" : "glass text-muted-foreground"
              }`}
            >
              {f === "pending" ? "대기" : f === "approved" ? "승인" : f === "rejected" ? "반려" : f === "completed" ? "완료" : "전체"}
            </button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* List */}
      {loading && rows === null ? (
        <LoadingList rows={5} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="w-5 h-5" />}
          title="해당 상태의 환불 요청이 없습니다"
          description="새 요청이 들어오면 자동으로 표시됩니다."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="glass rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{r.nickname}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(r.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground break-keep">
                    사유: <span className="text-foreground">{r.reason}</span>
                  </div>
                  {r.admin_memo && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      관리자 메모: <span className="text-foreground">{r.admin_memo}</span>
                    </div>
                  )}
                </div>
                <div className="font-imperial font-bold text-money-strong tabular-nums shrink-0">
                  {fmtKRW(Number(r.amount_krw))}
                </div>
              </div>

              {r.status === "pending" && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="처리 메모 (필수, 3자 이상)"
                    value={memos[r.id] ?? ""}
                    onChange={(e) => setMemos((m) => ({ ...m, [r.id]: e.target.value }))}
                    className="min-h-[60px] text-sm"
                    maxLength={300}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => resolve(r.id, true)}
                      disabled={busyId === r.id}
                      className="flex-1"
                    >
                      {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                      승인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolve(r.id, false)}
                      disabled={busyId === r.id}
                      className="flex-1"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      반려
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, hot, money }: { label: string; value: string | number; hot?: boolean; money?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/20 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-imperial font-bold text-sm tabular-nums mt-0.5 ${
        money ? "text-money-strong" : hot ? "text-destructive" : "text-foreground"
      }`}>
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "대기", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    approved: { label: "승인", cls: "bg-money-strong/20 text-money-strong border-money-strong/30" },
    rejected: { label: "반려", cls: "bg-destructive/20 text-destructive border-destructive/30" },
    completed: { label: "완료", cls: "bg-secondary/20 text-secondary border-secondary/30" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted/30 text-muted-foreground border-border" };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${m.cls}`}>
      {m.label}
    </span>
  );
}
