/**
 * Anomaly Auto-Fix Panel
 * - Groups unacknowledged anomaly_events by rule
 * - Provides a per-rule "자동 수정" button (re-baselines + acks for permission_drift,
 *   ack-only for the rest), and a global "전체 자동 수정" button.
 * - Confirmation dialog: "수정하시겠습니까? 예 → 모두 사라짐"
 */
import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Wand2, ShieldCheck } from "lucide-react";

type RuleRow = {
  rule: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

const RULE_FIX_HINT: Record<string, string> = {
  permission_drift: "기준선을 현재 관찰값으로 갱신하고 모든 알림을 확인 처리합니다.",
  oracle_missing: "오라클 알림을 확인 처리합니다. (다음 틱에서 자동 복구)",
  withdrawal_velocity: "확인 처리만 진행합니다. (계정 동결은 별도 만료)",
  new_device: "확인 처리만 진행합니다.",
  oracle_spike_quarantine: "확인 처리만 진행합니다. (가격은 자동 격리됨)",
};

function AnomalyAutoFixPanelBase() {
  const [rows, setRows] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ rule: string | null; total: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("anomaly_events")
      .select("rule,severity")
      .eq("acknowledged", false)
      .limit(5000);
    if (error) {
      notify.fail("규칙별 집계 실패", error);
      setLoading(false);
      return;
    }
    const grouped = new Map<string, RuleRow>();
    for (const r of (data ?? []) as { rule: string; severity: string }[]) {
      const cur = grouped.get(r.rule) ?? {
        rule: r.rule,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
      cur.total += 1;
      const sev = (r.severity ?? "low") as keyof Pick<RuleRow, "critical" | "high" | "medium" | "low">;
      if (cur[sev] !== undefined) cur[sev] += 1;
      grouped.set(r.rule, cur);
    }
    setRows([...grouped.values()].sort((a, b) => b.total - a.total));
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const ch = supabase
      .channel("admin:anomaly:autofix")
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

  const runOne = useCallback(async (rule: string) => {
    setBusy(rule);
    const { data, error } = await supabase.rpc("admin_resolve_anomaly_rule", { _rule: rule });
    setBusy(null);
    if (error) {
      notify.fail("자동 수정 실패", error);
      return;
    }
    const obj = (data ?? {}) as { acked?: number; rebaselined?: number };
    notify.success(
      `${rule} 자동 수정 완료`,
      {
        description: `${obj.acked ?? 0}건 확인 처리${
          obj.rebaselined ? ` · 기준선 ${obj.rebaselined}개 갱신` : ""
        }`,
      },
    );
    await load();
  }, [load]);

  const runAll = useCallback(async () => {
    setBusy("__all__");
    const { data, error } = await supabase.rpc("admin_resolve_all_anomalies");
    setBusy(null);
    if (error) {
      notify.fail("전체 자동 수정 실패", error);
      return;
    }
    const obj = (data ?? {}) as { total_acked?: number };
    notify.success("전체 자동 수정 완료", {
      description: `총 ${obj.total_acked ?? 0}건 처리`,
    });
    await load();
  }, [load]);

  const onConfirm = async () => {
    if (!confirm) return;
    const target = confirm.rule;
    setConfirm(null);
    if (target === null) await runAll();
    else await runOne(target);
  };

  if (loading) return <LoadingList rows={3} />;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <h2 className="font-display font-black text-base">자동 수정 (Auto-Fix)</h2>
        </div>
        <Button
          size="sm"
          variant="default"
          disabled={rows.length === 0 || busy !== null}
          onClick={() => setConfirm({ rule: null, total: rows.reduce((s, r) => s + r.total, 0) })}
        >
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          전체 자동 수정 ({rows.reduce((s, r) => s + r.total, 0)})
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="처리할 이상 이벤트가 없습니다"
          description="모든 규칙의 알림이 확인 처리되었습니다."
        />
      ) : (
        <div className="grid gap-2">
          {rows.map((r) => (
            <div
              key={r.rule}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-card/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold">{r.rule}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {r.total}건
                  </Badge>
                  {r.critical > 0 && (
                    <Badge variant="outline" className="bg-destructive/15 text-destructive border-destructive/40 text-[10px]">
                      C {r.critical}
                    </Badge>
                  )}
                  {r.high > 0 && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">
                      H {r.high}
                    </Badge>
                  )}
                  {r.medium > 0 && (
                    <Badge variant="outline" className="bg-gold/15 text-gold border-gold/30 text-[10px]">
                      M {r.medium}
                    </Badge>
                  )}
                  {r.low > 0 && (
                    <Badge variant="outline" className="text-[10px]">
                      L {r.low}
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {RULE_FIX_HINT[r.rule] ?? "확인 처리만 진행합니다."}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => setConfirm({ rule: r.rule, total: r.total })}
              >
                <Wand2 className="w-3.5 h-3.5 mr-1" />
                자동 수정
              </Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>수정하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.rule
                ? `규칙 "${confirm.rule}" 의 ${confirm.total}건이 자동 처리되고 목록에서 사라집니다.`
                : `미확인 이상 이벤트 ${confirm?.total ?? 0}건이 모두 자동 처리되고 사라집니다.`}
              {confirm?.rule === "permission_drift" && (
                <span className="block mt-2 text-amber-600">
                  ※ 권한 기준선이 현재 관찰값으로 갱신됩니다. 비정상 권한 부여인지 사전 확인하세요.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>아니오</AlertDialogCancel>
            <AlertDialogAction onClick={() => void onConfirm()}>예, 수정</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default memo(AnomalyAutoFixPanelBase);
