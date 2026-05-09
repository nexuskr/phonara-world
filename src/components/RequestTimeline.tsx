import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";

type RequestKind = "deposit" | "package" | "withdrawal";

interface TimelineEntry {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_role: string;
  memo: string | null;
  evidence: Record<string, unknown>;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "접수",
  reviewing: "검수 중",
  approved: "승인",
  active: "정산 진행",
  completed: "지급 완료",
  rejected: "거절",
  cancelled: "취소",
};

function statusIcon(s: string) {
  if (["completed", "approved", "active"].includes(s)) return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (["rejected", "cancelled"].includes(s)) return <XCircle className="w-4 h-4 text-destructive" />;
  if (s === "pending") return <Clock className="w-4 h-4 text-muted-foreground" />;
  return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
}

/**
 * Real-time timeline for a single deposit / package / withdrawal request.
 * Subscribes to request_status_history INSERTs scoped to this request_id.
 */
export default function RequestTimeline({
  kind,
  requestId,
  className = "",
}: {
  kind: RequestKind;
  requestId: string;
  className?: string;
}) {
  const [rows, setRows] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("request_status_history")
        .select("id, from_status, to_status, actor_role, memo, evidence, created_at")
        .eq("request_kind", kind)
        .eq("request_id", requestId)
        .order("created_at", { ascending: true });
      if (alive) {
        setRows((data ?? []) as TimelineEntry[]);
        setLoading(false);
      }
    })();

    const ch = supabase
      .channel(`rsh:${kind}:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_status_history",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          const row = payload.new as TimelineEntry & { request_kind?: string };
          if (row.request_kind && row.request_kind !== kind) return;
          setRows((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]));
        },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [kind, requestId]);

  if (loading) {
    return <LoadingList rows={3} rowHeight="sm" className={className} />;
  }
  if (rows.length === 0) {
    return <EmptyState title="아직 기록이 없습니다" description="처리 진행 단계가 발생하면 여기에 표시됩니다." variant="muted" size="sm" className={className} />;
  }

  return (
    <ol className={`relative border-l border-border/60 pl-4 space-y-3 ${className}`}>
      {rows.map((r) => {
        const checklist = (r.evidence as Record<string, boolean>) || {};
        const checks = Object.entries(checklist).filter(([k]) => k !== "_meta");
        return (
          <li key={r.id} className="relative">
            <span className="absolute -left-[22px] top-1 w-4 h-4 flex items-center justify-center bg-background rounded-full">
              {statusIcon(r.to_status)}
            </span>
            <div className="text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold">
                  {r.from_status ? `${STATUS_LABEL[r.from_status] ?? r.from_status} → ` : ""}
                  {STATUS_LABEL[r.to_status] ?? r.to_status}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                  {r.actor_role}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
                  {new Date(r.created_at).toLocaleString("ko-KR", { hour12: false })}
                </span>
              </div>
              {r.memo && (
                <div className="mt-1 px-2 py-1.5 rounded-md bg-muted/30 text-[11px] leading-relaxed whitespace-pre-wrap break-keep">
                  <span className="text-muted-foreground">사유: </span>{r.memo}
                </div>
              )}
              {checks.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {checks.map(([k, v]) => (
                    <span
                      key={k}
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        v ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {v ? "✓" : "✗"} {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
      <li className="text-[10px] text-muted-foreground/70 flex items-center gap-1 pt-1">
        <AlertCircle className="w-3 h-3" /> 실시간 업데이트 — 상태 변경 시 자동 추가됩니다.
      </li>
    </ol>
  );
}
