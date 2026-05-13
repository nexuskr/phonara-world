/**
 * PR-15 — Auto-rule manager (DRY-RUN by default).
 * Admins toggle rules; auto-execution wiring is OFF until user explicitly
 * connects rules to deposit triggers (handled outside this UI).
 */
import { useEffect, useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ActionTable } from "@/components/admin/ActionTable";
import ShadowDecisionsPanel from "@/components/admin/ShadowDecisionsPanel";
import { notify } from "@/lib/notify";
import { ShieldAlert } from "lucide-react";

type Rule = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  action: "auto_approve" | "auto_hold" | "flag_only";
  amount_min: number | null;
  amount_max: number | null;
  method: "bank" | "coin" | null;
  risk_score_max: number;
  min_prior_approved: number;
  priority: number;
  updated_at: string;
};

const actionTone: Record<Rule["action"], string> = {
  auto_approve: "bg-secondary/15 text-secondary border-secondary/30",
  auto_hold:    "bg-gold/15 text-gold border-gold/30",
  flag_only:    "bg-muted text-muted-foreground border-border",
};

function fmtRange(min: number | null, max: number | null) {
  const f = (n: number) => n.toLocaleString("ko-KR");
  if (min == null && max == null) return "all";
  if (min == null) return `≤ ${f(max!)}`;
  if (max == null) return `≥ ${f(min)}`;
  return `${f(min)}–${f(max)}`;
}

function AutoRulesAdminBase() {
  const [rows, setRows] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("deposit_auto_rules")
      .select("*")
      .order("priority", { ascending: true });
    if (error) notify.fail("룰 로드 실패", error);
    else setRows((data ?? []) as Rule[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(
    async (rule: Rule, next: boolean) => {
      // optimistic
      setRows((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)),
      );
      const { error } = await supabase.rpc("admin_set_auto_rule_enabled", {
        _id: rule.id,
        _enabled: next,
      });
      if (error) {
        notify.fail("토글 실패", error);
        await load();
      } else {
        notify.success(next ? "룰 ON" : "룰 OFF");
      }
    },
    [load],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <ShieldAlert className="w-5 h-5 text-gold shrink-0 mt-0.5" />
        <div>
          <h1 className="font-display font-black text-xl">Auto-Process Rules</h1>
          <p className="text-xs text-muted-foreground mt-1">
            소액 80% 자동승인 / 중간 15% 자동보류 / 고위험 5% 사람 검토 — 모든 룰은 기본
            <span className="text-destructive font-bold"> 비활성</span> 상태입니다. 활성화 후
            트리거 연결까지는 <span className="text-secondary font-bold">DRY-RUN</span> (
            <code className="text-[10px]">anomaly_events</code> 기록만)으로 동작합니다.
          </p>
        </div>
      </div>

      <ActionTable<Rule>
        rows={rows}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="룰이 없습니다"
        emptyDescription="기본 시드 룰이 표시되지 않으면 마이그레이션을 확인하세요."
        disableBulk
        columns={[
          {
            key: "enabled",
            header: "ON",
            cell: (r) => (
              <Switch
                checked={r.enabled}
                onCheckedChange={(v) => toggle(r, v)}
                aria-label={`Toggle ${r.name}`}
              />
            ),
          },
          {
            key: "name",
            header: "이름",
            cell: (r) => (
              <div>
                <div className="font-bold text-sm">{r.name}</div>
                {r.description && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {r.description}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "action",
            header: "액션",
            cell: (r) => (
              <Badge variant="outline" className={actionTone[r.action]}>
                {r.action}
              </Badge>
            ),
          },
          {
            key: "amount",
            header: "금액 범위",
            cell: (r) => (
              <span className="font-mono text-[11px]">
                {fmtRange(r.amount_min, r.amount_max)}
              </span>
            ),
          },
          {
            key: "method",
            header: "수단",
            cell: (r) => (
              <span className="font-mono text-[11px] text-muted-foreground">
                {r.method ?? "any"}
              </span>
            ),
          },
          {
            key: "risk",
            header: "위험점수",
            align: "right",
            cell: (r) => (
              <span className="font-mono text-[11px] tabular-nums">
                ≤ {r.risk_score_max}
              </span>
            ),
          },
          {
            key: "prior",
            header: "신뢰",
            align: "right",
            cell: (r) => (
              <span className="font-mono text-[11px] tabular-nums">
                ≥ {r.min_prior_approved}건
              </span>
            ),
          },
          {
            key: "priority",
            header: "우선",
            align: "right",
            cell: (r) => (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                #{r.priority}
              </span>
            ),
          },
        ]}
      />
      <ShadowDecisionsPanel />
    </div>
  );
}

export default memo(AutoRulesAdminBase);
