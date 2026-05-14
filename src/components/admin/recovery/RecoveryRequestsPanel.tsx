/**
 * 4-eyes Admin TOTP Recovery — 다른 관리자가 분실 시 요청/승인 큐
 * 요청자 + 승인자 2명(distinct) 모이면 자동으로 대상자의 TOTP factor 삭제.
 */
import { useEffect, useState } from "react";
import { ShieldAlert, Check, X, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";

type Req = {
  id: string;
  target_user_id: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvals: Array<{ admin_id?: string; at?: string; rejected_by?: string; reason?: string }>;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export function RecoveryRequestsPanel() {
  const [me, setMe] = useState<string | null>(null);
  const [rows, setRows] = useState<Req[] | null>(null);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const load = async () => {
    const { data } = await supabase.rpc("list_admin_recovery_requests" as any, {
      _status: null,
      _limit: 50,
    });
    setRows((data as Req[]) ?? []);
  };
  useEffect(() => { load(); return setVisibleInterval(load, 30_000); }, []);

  const create = async () => {
    if (!target || reason.trim().length < 10) {
      notify.error("대상 UID와 사유(10자 이상)를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("request_admin_recovery" as any, {
      _target: target.trim(),
      _reason: reason.trim(),
    });
    setBusy(false);
    if (error) { notify.error(`요청 실패: ${error.message}`); return; }
    setTarget(""); setReason("");
    notify.success("복구 요청 생성됨. 다른 관리자 2명의 승인이 필요합니다.");
    load();
  };

  const approve = async (id: string) => {
    const { data, error } = await supabase.rpc("approve_admin_recovery" as any, { _request_id: id });
    if (error) { notify.error(`승인 실패: ${error.message}`); return; }
    const res = data as { executed?: boolean; approvals?: number; needed?: number };
    if (res?.executed) notify.success("4-eyes 충족 → 대상자의 TOTP factor 삭제 완료.");
    else notify.success(`승인 기록됨 (${res?.approvals}/${res?.needed}).`);
    load();
  };

  const reject = async (id: string) => {
    const r = prompt("반려 사유:");
    if (!r) return;
    const { error } = await supabase.rpc("reject_admin_recovery" as any, {
      _request_id: id, _reason: r,
    });
    if (error) { notify.error(`반려 실패: ${error.message}`); return; }
    notify.success("반려 처리됨.");
    load();
  };

  const canApprove = (r: Req) =>
    r.status === "pending" &&
    me !== null &&
    r.requested_by !== me &&
    !r.approvals.some(a => a.admin_id === me);

  return (
    <section className="glass-strong rounded-2xl p-5 border border-border/40 space-y-4">
      <header className="flex items-start gap-2">
        <Users className="h-4 w-4 mt-1 text-primary" />
        <div>
          <h2 className="font-display font-bold text-lg">4-Eyes 관리자 복구</h2>
          <p className="text-xs text-muted-foreground break-keep mt-1">
            다른 관리자가 백업 코드도 잃은 경우. 요청자 외 <b>다른 관리자 2명</b>이 승인하면
            대상자의 TOTP factor가 자동 삭제됩니다.
          </p>
        </div>
      </header>

      {/* 요청 폼 */}
      <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> 새 복구 요청
        </div>
        <Input
          placeholder="대상 admin user_id (uuid)"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="font-mono text-xs"
        />
        <Textarea
          placeholder="사유 (10자 이상). 예: 'admin@x.com 인증 앱 재설치 중 분실, 2026-05-14 슬랙 확인'"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
        />
        <Button size="sm" onClick={create} disabled={busy}>
          요청 생성
        </Button>
      </div>

      {/* 요청 리스트 */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">요청 큐</div>
        {rows === null ? (
          <LoadingList />
        ) : rows.length === 0 ? (
          <EmptyState title="요청 없음" />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const distinctApprovers = r.approvals.filter(a => a.admin_id).length;
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {r.id.slice(0, 8)}… · {new Date(r.created_at).toLocaleString("ko-KR")}
                      </div>
                      <div className="text-xs">
                        <span className="text-muted-foreground">대상</span>{" "}
                        <code className="font-mono">{r.target_user_id.slice(0, 8)}…</code>{" "}
                        <span className="text-muted-foreground">· 요청자</span>{" "}
                        <code className="font-mono">{r.requested_by.slice(0, 8)}…</code>
                      </div>
                      <p className="text-xs mt-1 break-words">{r.reason}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.status === "pending" && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        승인 {distinctApprovers}/2
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approve(r.id)}
                          disabled={!canApprove(r)}
                          title={
                            !canApprove(r)
                              ? r.requested_by === me
                                ? "본인 요청은 승인 불가"
                                : "이미 승인했거나 처리 완료됨"
                              : ""
                          }
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> 승인
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => reject(r.id)}>
                          <X className="h-3.5 w-3.5 mr-1" /> 반려
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground border border-destructive/30 bg-destructive/5 rounded-lg p-2.5">
        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 text-destructive shrink-0" />
        <span>
          모든 요청·승인·실행은 <code>admin_audit_log</code>와 <code>anomaly_events</code>에
          영구 기록됩니다. 본인 요청 자가승인은 시스템적으로 차단됩니다.
        </span>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: Req["status"] }) {
  const map: Record<Req["status"], string> = {
    pending: "border-yellow-500/40 text-yellow-400 bg-yellow-500/10",
    approved: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    rejected: "border-muted text-muted-foreground bg-muted/20",
  };
  const label = { pending: "대기", approved: "실행 완료", rejected: "반려" }[status];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${map[status]}`}>{label}</span>
  );
}
