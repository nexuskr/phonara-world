import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, RefreshCw, Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AuditRow = {
  id: string;
  created_at: string;
  ok: boolean;
  issue_count: number;
  issues: any[];
  source: string;
};

type SettleRow = {
  id: string;
  created_at: string;
  ok: boolean;
  settled_count: number;
  duration_ms: number | null;
  caller: string | null;
  error: string | null;
};

export default function SecurityAuditAdmin() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [settles, setSettles] = useState<SettleRow[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [a, s] = await Promise.all([
      supabase.from("security_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("cron_settle_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setAudits((a.data ?? []) as AuditRow[]);
    setSettles((s.data ?? []) as SettleRow[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function runNow() {
    setRunning(true);
    try {
      const { data, error } = await supabase.rpc("run_security_self_audit", { _source: "admin_ui" });
      if (error) throw error;
      const r = data as any;
      toast({
        title: r?.ok ? "✅ 보안 감사 통과" : `⚠ ${r?.issue_count ?? "?"}건 이슈`,
        description: r?.ok ? "모든 RLS 정책 무결" : "관리자 패널에서 상세 내역 확인",
      });
      await load();
    } catch (e: any) {
      toast({ title: "감사 실행 실패", description: e.message });
    } finally {
      setRunning(false);
    }
  }

  const latest = audits[0];

  return (
    <div className="space-y-4">
      {/* Top status */}
      <div className="glass-strong rounded-2xl p-4 neon-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {latest?.ok ? (
            <CheckCircle2 className="w-7 h-7 text-secondary" />
          ) : latest ? (
            <AlertTriangle className="w-7 h-7 text-destructive" />
          ) : (
            <ShieldCheck className="w-7 h-7 text-muted-foreground" />
          )}
          <div>
            <div className="font-display font-black text-sm">
              {latest ? (latest.ok ? "보안 무결성 정상" : `${latest.issue_count}건 이슈 감지됨`) : "감사 기록 없음"}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {latest ? `최근 ${new Date(latest.created_at).toLocaleString("ko-KR")} · ${latest.source}` : "—"}
            </div>
          </div>
        </div>
        <button onClick={runNow} disabled={running}
          className="px-3 py-2 rounded-xl bg-gradient-imperial text-primary-foreground text-xs font-bold flex items-center gap-1.5 press">
          <RefreshCw className={`w-3.5 h-3.5 ${running ? "animate-spin" : ""}`} />
          지금 재스캔
        </button>
      </div>

      {/* Settle audit */}
      <div>
        <h3 className="font-display font-black text-sm flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-gold" /> 정산 cron 감사 로그
        </h3>
        <div className="space-y-2">
          {settles.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">호출 기록 없음</div>
          )}
          {settles.map((s) => (
            <div key={s.id} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {s.ok ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span className="text-xs font-bold">{s.ok ? "성공" : "실패"}</span>
                  <span className="text-[10px] text-muted-foreground">· {s.settled_count}건</span>
                  <span className="text-[10px] text-muted-foreground">· {s.duration_ms ?? "?"}ms</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString("ko-KR")}</span>
              </div>
              {s.caller && <div className="text-[10px] text-muted-foreground mt-1 truncate">caller: {s.caller}</div>}
              {s.error && <div className="text-[10px] text-destructive mt-1 break-all">{s.error}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Security audit history */}
      <div>
        <h3 className="font-display font-black text-sm flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-gold" /> RLS 무결성 감사 이력
        </h3>
        <div className="space-y-2">
          {loading && <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">불러오는 중…</div>}
          {!loading && audits.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">감사 기록 없음</div>
          )}
          {audits.map((a) => (
            <div key={a.id} className="glass rounded-2xl p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {a.ok ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span className="text-xs font-bold">{a.ok ? "PASS" : `FAIL (${a.issue_count})`}</span>
                  <span className="text-[10px] text-muted-foreground">· {a.source}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("ko-KR")}</span>
              </div>
              {!a.ok && Array.isArray(a.issues) && a.issues.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {a.issues.map((it: any, i: number) => (
                    <li key={i} className="text-[11px] text-destructive">
                      • [{it.severity}] {it.table ?? it.function ?? "?"} — {it.msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
