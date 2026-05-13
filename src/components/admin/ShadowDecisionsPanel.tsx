/**
 * PR-16 — Shadow decisions panel.
 * Reads recent auto_rule_decisions to compare suggested vs actual outcome.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Eye, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

type Decision = {
  id: string;
  rule_name: string;
  suggested_action: string;
  actual_action: string | null;
  deposit_id: string | null;
  user_id: string | null;
  created_at: string;
  payload: any;
};

const actionTone: Record<string, string> = {
  auto_approve: "text-secondary",
  auto_hold:    "text-gold",
  flag_only:    "text-muted-foreground",
  approved:     "text-secondary",
  pending:      "text-muted-foreground",
  rejected:     "text-destructive",
};

function matchKind(suggested: string, actual: string | null) {
  if (!actual) return { label: "대기", icon: Clock, tone: "text-muted-foreground" };
  const goodMap: Record<string, string> = { auto_approve: "approved", auto_hold: "pending", flag_only: "" };
  const want = goodMap[suggested];
  if (!want) return { label: "참고", icon: Eye, tone: "text-muted-foreground" };
  if (actual === want) return { label: "일치", icon: CheckCircle2, tone: "text-secondary" };
  return { label: "불일치", icon: AlertCircle, tone: "text-destructive" };
}

export default function ShadowDecisionsPanel() {
  const [rows, setRows] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, match: 0, miss: 0, pending: 0 });

  async function load() {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from("auto_rule_decisions")
        .select("id, rule_name, suggested_action, actual_action, deposit_id, user_id, created_at, payload")
        .order("created_at", { ascending: false })
        .limit(100);
      const list = (data ?? []) as Decision[];
      setRows(list);
      const s = { total: list.length, match: 0, miss: 0, pending: 0 };
      for (const r of list) {
        const k = matchKind(r.suggested_action, r.actual_action);
        if (k.label === "일치") s.match++;
        else if (k.label === "불일치") s.miss++;
        else if (k.label === "대기") s.pending++;
      }
      setStats(s);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingList rows={4} />;

  return (
    <section className="glass-strong rounded-2xl p-5 border border-border/50 space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="font-display font-black text-sm">Shadow 결정 로그 (DRY-RUN)</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] tabular-nums">
          <span>총 <b className="text-foreground">{stats.total}</b></span>
          <span className="text-secondary">일치 {stats.match}</span>
          <span className="text-destructive">불일치 {stats.miss}</span>
          <span className="text-muted-foreground">대기 {stats.pending}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Eye className="w-5 h-5" />}
          title="Shadow 데이터 없음"
          description="규칙을 활성화하고 신규 입금이 들어오면 여기에 의사결정이 누적됩니다."
        />
      ) : (
        <div className="space-y-1.5 max-h-[420px] overflow-auto">
          {rows.map((r) => {
            const m = matchKind(r.suggested_action, r.actual_action);
            const Icon = m.icon;
            return (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-2 items-center text-[11px] rounded-lg border border-border/30 bg-card/40 px-2 py-1.5"
              >
                <div className="col-span-3 truncate font-bold">{r.rule_name}</div>
                <div className={`col-span-2 ${actionTone[r.suggested_action] ?? ""}`}>
                  → {r.suggested_action}
                </div>
                <div className={`col-span-2 ${actionTone[r.actual_action ?? ""] ?? "text-muted-foreground"}`}>
                  실제: {r.actual_action ?? "—"}
                </div>
                <div className={`col-span-2 flex items-center gap-1 ${m.tone}`}>
                  <Icon className="w-3 h-3" /> {m.label}
                </div>
                <div className="col-span-3 text-right text-[10px] text-muted-foreground tabular-nums">
                  {r.payload?.amount && (
                    <span className="mr-2">₩{Number(r.payload.amount).toLocaleString()}</span>
                  )}
                  {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ko })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
