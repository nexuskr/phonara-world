/**
 * Anomaly Ack Queue (ActionTable) — bulk acknowledge unack'd anomaly_events.
 * Mounted into /admin/ops/errors as a top-of-page panel.
 */
import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActionTable } from "@/components/admin/ActionTable";
import { notify } from "@/lib/notify";
import { Badge } from "@/components/ui/badge";

type AnomalyRow = {
  id: string;
  rule: string;
  severity: "low" | "medium" | "high" | "critical";
  user_id: string | null;
  evidence: Record<string, unknown> | null;
  created_at: string;
};

const sevTone: Record<AnomalyRow["severity"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/40",
  high:     "bg-destructive/10 text-destructive border-destructive/30",
  medium:   "bg-gold/15 text-gold border-gold/30",
  low:      "bg-muted text-muted-foreground border-border",
};

function AnomalyAckQueueBase() {
  const [rows, setRows] = useState<AnomalyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("anomaly_events")
      .select("id,rule,severity,user_id,evidence,created_at")
      .eq("acknowledged", false)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) notify.fail("이상 이벤트 로드 실패", error);
    else setRows((data ?? []) as AnomalyRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin:anomaly:ack")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "anomaly_events" },
        () => void load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  const ack = useCallback(async (selected: AnomalyRow[]) => {
    const ids = selected.map((r) => r.id);
    const { data, error } = await supabase.rpc("admin_ack_anomaly", {
      _ids: ids,
      _note: null,
    });
    if (error) {
      notify.fail("ack 실패", error);
      return;
    }
    notify.success(`${data ?? ids.length}건 확인 처리 완료`);
    await load();
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display font-black text-base">미확인 이상 이벤트</h2>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {rows.length} unacknowledged
        </span>
      </div>
      <ActionTable<AnomalyRow>
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="이상 이벤트 없음"
        emptyDescription="모든 이상 이벤트가 확인 처리되었습니다."
        columns={[
          {
            key: "severity",
            header: "심각도",
            cell: (r) => (
              <Badge variant="outline" className={sevTone[r.severity]}>
                {r.severity.toUpperCase()}
              </Badge>
            ),
          },
          {
            key: "rule",
            header: "규칙",
            cell: (r) => <span className="font-mono text-xs">{r.rule}</span>,
          },
          {
            key: "user",
            header: "유저",
            cell: (r) => (
              <span className="font-mono text-[10px] text-muted-foreground">
                {r.user_id ? r.user_id.slice(0, 8) : "—"}
              </span>
            ),
          },
          {
            key: "time",
            header: "발생",
            align: "right",
            cell: (r) => (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {new Date(r.created_at).toLocaleString("ko-KR")}
              </span>
            ),
          },
        ]}
        actions={[
          {
            id: "ack",
            label: "확인 처리",
            variant: "default",
            confirm: (rs) => `${rs.length}건을 확인 처리할까요?`,
            onExecute: ack,
          },
        ]}
      />
    </div>
  );
}

export default memo(AnomalyAckQueueBase);
