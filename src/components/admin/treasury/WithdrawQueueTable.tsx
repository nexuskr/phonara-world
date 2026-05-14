/**
 * WithdrawQueueTable — admin 큐 테이블 (정렬·하이라이트·벌크 액션 UI)
 * 데이터는 useWithdrawQueue 훅이 단독으로 가져온다.
 * 실제 처리 액션은 기존 WithdrawRequestsAdmin에서 수행 — 여기는 큐 가시성만.
 */
import { memo, useMemo, useState, useCallback } from "react";
import { useWithdrawQueue, type WithdrawalRow } from "@/lib/withdrawal/useWithdrawQueue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Crown, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

type SortKey = "priority" | "created_at" | "amount";
type SortDir = "asc" | "desc";

const PRIORITY_TIERS = new Set(["vip", "god", "empire"]);

function fmtAmount(n: number) {
  return `₩${n.toLocaleString()}`;
}

function fmtAge(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

function isDelayed(row: WithdrawalRow) {
  const due = Date.parse(row.process_by);
  return Number.isFinite(due) && due < Date.now() && row.status === "pending";
}

const Row = memo(function Row({
  row, selected, onToggle,
}: { row: WithdrawalRow; selected: boolean; onToggle: (id: string) => void }) {
  const priority = row.priority < 100 || PRIORITY_TIERS.has(row.tier_at_request);
  const delayed = isDelayed(row);
  const tone = delayed
    ? "bg-destructive/8 hover:bg-destructive/12"
    : priority
      ? "bg-gold/5 hover:bg-gold/10"
      : "hover:bg-muted/40";

  return (
    <tr className={`${tone} border-b border-border/30 transition-colors`}>
      <td className="px-3 py-2">
        <Checkbox checked={selected} onCheckedChange={() => onToggle(row.id)} aria-label={`select ${row.tx_code}`} />
      </td>
      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{row.tx_code}</td>
      <td className="px-3 py-2 text-xs uppercase tracking-wider">
        <span className="inline-flex items-center gap-1">
          {priority && <Crown className="w-3 h-3 text-gold" />}
          {row.tier_at_request}
        </span>
      </td>
      <td className="px-3 py-2 font-display font-black text-money-strong tabular-nums">{fmtAmount(row.amount)}</td>
      <td className="px-3 py-2 text-xs uppercase tracking-wider">{row.method}</td>
      <td className="px-3 py-2 text-xs">
        <span className={
          row.status === "pending"     ? "text-yellow-300" :
          row.status === "processing"  ? "text-primary"    :
          row.status === "approved"    ? "text-secondary"  :
          "text-muted-foreground"
        }>
          {row.status}
        </span>
      </td>
      <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">{fmtAge(row.created_at)}</td>
      <td className="px-3 py-2 text-xs tabular-nums">
        {delayed ? (
          <span className="inline-flex items-center gap-1 text-destructive font-bold">
            <AlertTriangle className="w-3 h-3" /> 지연
          </span>
        ) : (
          <span className="text-muted-foreground">{fmtAge(row.process_by)} 까지</span>
        )}
      </td>
    </tr>
  );
});

function WithdrawQueueTable() {
  const { withdrawals, isLoading, error, refetch } = useWithdrawQueue();
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<null | "approve" | "reject">(null);

  const sorted = useMemo(() => {
    const arr = [...withdrawals];
    arr.sort((a, b) => {
      let av: number; let bv: number;
      if (sortKey === "amount")        { av = a.amount; bv = b.amount; }
      else if (sortKey === "created_at") { av = Date.parse(a.created_at); bv = Date.parse(b.created_at); }
      else                              { av = a.priority; bv = b.priority; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [withdrawals, sortKey, sortDir]);

  const toggleSort = useCallback((k: SortKey) => {
    setSortKey(prev => {
      if (prev === k) { setSortDir(d => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir(k === "amount" || k === "created_at" ? "desc" : "asc");
      return k;
    });
  }, []);

  const toggleRow = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === sorted.length) return new Set();
      return new Set(sorted.map(r => r.id));
    });
  }, [sorted]);

  const allSelected = sorted.length > 0 && selected.size === sorted.length;

  const sortIcon = (k: SortKey) => sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const handleApprove = useCallback(async () => {
    if (selected.size === 0 || pending !== null) return;
    const ids = Array.from(selected);
    const count = ids.length;
    setPending("approve");
    try {
      const { error: rpcErr } = await supabase.rpc("admin_bulk_approve_withdrawals", { _ids: ids });
      if (rpcErr) throw rpcErr;
      notify.success(`${count}건 승인 완료`);
      setSelected(new Set());
      await refetch();
    } catch (e) {
      notify.fail("벌크 승인 실패", e);
    } finally {
      setPending(null);
    }
  }, [selected, pending, refetch]);

  const handleReject = useCallback(async () => {
    if (selected.size === 0 || pending !== null) return;
    const reason = window.prompt("거절 사유를 입력하세요");
    if (reason === null || reason.trim() === "") return;
    const ids = Array.from(selected);
    const count = ids.length;
    setPending("reject");
    try {
      const { error: rpcErr } = await supabase.rpc("admin_bulk_reject_withdrawals", {
        _ids: ids,
        _reason: reason.trim(),
      });
      if (rpcErr) throw rpcErr;
      notify.success(`${count}건 거절 완료`);
      setSelected(new Set());
      await refetch();
    } catch (e) {
      notify.fail("벌크 거절 실패", e);
    } finally {
      setPending(null);
    }
  }, [selected, pending, refetch]);

  if (error) {
    return (
      <div className="glass rounded-xl border border-destructive/40 p-4 flex items-center justify-between gap-3">
        <div className="text-xs text-destructive break-keep">큐 로드 실패: {error}</div>
        <Button size="sm" variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-3 h-3 mr-1" /> 재시도
        </Button>
      </div>
    );
  }

  if (isLoading) return <LoadingList rows={6} />;

  if (sorted.length === 0) {
    return <EmptyState title="활성 출금 큐 없음" description="대기·진행 중인 출금이 없습니다." />;
  }

  return (
    <div className="glass rounded-xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3 border-b border-border/40">
        <div className="text-xs text-muted-foreground">
          총 {sorted.length}건 · 선택 {selected.size}건
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || pending !== null}
            onClick={handleApprove}
          >
            {pending === "approve" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            벌크 승인
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={selected.size === 0 || pending !== null}
            onClick={handleReject}
          >
            {pending === "reject" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            벌크 거절
          </Button>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            <RefreshCw className="w-3 h-3 mr-1" /> 새로고침
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2 w-8">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="select all" />
              </th>
              <th className="px-3 py-2 text-left">TX</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("priority")}>
                Tier{sortIcon("priority")}
              </th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("amount")}>
                금액{sortIcon("amount")}
              </th>
              <th className="px-3 py-2 text-left">방법</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-left cursor-pointer" onClick={() => toggleSort("created_at")}>
                경과{sortIcon("created_at")}
              </th>
              <th className="px-3 py-2 text-left">SLA</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(r => (
              <Row key={r.id} row={r} selected={selected.has(r.id)} onToggle={toggleRow} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default memo(WithdrawQueueTable);
