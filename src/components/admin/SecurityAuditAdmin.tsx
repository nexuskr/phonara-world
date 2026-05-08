import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, RefreshCw, Activity, AlertTriangle, CheckCircle2, Filter, Eye, Wrench, Gauge, FileCheck2, Radar, BellRing, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

type OkFilter = "all" | "ok" | "fail";

type AssertionRun = {
  id: string;
  assertion_key: string;
  passed: boolean;
  observed: string | null;
  error: string | null;
  created_at: string;
};

type AnomalyEvent = {
  id: string;
  user_id: string | null;
  rule: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: any;
  acknowledged: boolean;
  acknowledged_at: string | null;
  ack_note: string | null;
  created_at: string;
};

export default function SecurityAuditAdmin() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [settles, setSettles] = useState<SettleRow[]>([]);
  const [slo, setSlo] = useState<any>(null);
  const [assertionRuns, setAssertionRuns] = useState<AssertionRun[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [runningAssert, setRunningAssert] = useState(false);
  const [scanningAnom, setScanningAnom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AuditRow | null>(null);
  const [anomalyDetail, setAnomalyDetail] = useState<AnomalyEvent | null>(null);
  const [showAckOnly, setShowAckOnly] = useState(false);

  // filters
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [okFilter, setOkFilter] = useState<OkFilter>("all");
  const [minIssues, setMinIssues] = useState<string>("");

  async function load() {
    setLoading(true);
    const [a, s, sl, ar, an] = await Promise.all([
      supabase.from("security_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("cron_settle_audit_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.rpc("settlement_slo"),
      supabase.from("policy_assertion_runs").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("anomaly_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setAudits((a.data ?? []) as AuditRow[]);
    setSettles((s.data ?? []) as SettleRow[]);
    setSlo(sl.data ?? null);
    setAssertionRuns((ar.data ?? []) as AssertionRun[]);
    setAnomalies((an.data ?? []) as AnomalyEvent[]);
    setLoading(false);
  }

  async function runAssertions() {
    setRunningAssert(true);
    try {
      const { data, error } = await supabase.rpc("run_policy_assertions");
      if (error) throw error;
      const r = data as any;
      toast({
        title: r?.ok ? "✅ 정책 단언 통과" : `⚠ ${r?.failed ?? "?"}건 실패`,
        description: `${r?.passed ?? 0}/${r?.total ?? 0} 통과`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "단언 실행 실패", description: e.message });
    } finally { setRunningAssert(false); }
  }

  async function scanAnomalies() {
    setScanningAnom(true);
    try {
      const { data, error } = await supabase.rpc("detect_anomalies");
      if (error) throw error;
      const r = data as any;
      toast({ title: "이상치 스캔 완료", description: `${r?.inserted ?? 0}건 신규 탐지` });
      await load();
    } catch (e: any) {
      toast({ title: "이상치 스캔 실패", description: e.message });
    } finally { setScanningAnom(false); }
  }

  async function ackAnomaly(id: string) {
    const note = window.prompt("처리 메모 (선택)") ?? null;
    try {
      const { error } = await supabase.rpc("acknowledge_anomaly", { _id: id, _note: note });
      if (error) throw error;
      toast({ title: "확인 처리 완료" });
      await load();
    } catch (e: any) {
      toast({ title: "처리 실패", description: e.message });
    }
  }

  async function recoverNow() {
    setRecovering(true);
    try {
      const { data, error } = await supabase.rpc("recover_stuck_settlements");
      if (error) throw error;
      const r = data as any;
      toast({ title: r?.ok ? "복구 실행" : "복구 실패", description: `stuck ${r?.stuck ?? 0} · recovered ${r?.recovered ?? 0}` });
      await load();
    } catch (e: any) {
      toast({ title: "복구 실행 실패", description: e.message });
    } finally { setRecovering(false); }
  }

  useEffect(() => { void load(); }, []);

  // Realtime subscription: surface new anomaly events instantly
  useEffect(() => {
    const channel = supabase
      .channel("anomaly_events_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "anomaly_events" },
        (payload) => {
          const row = payload.new as AnomalyEvent;
          setAnomalies((prev) => {
            if (prev.find((p) => p.id === row.id)) return prev;
            return [row, ...prev].slice(0, 100);
          });
          const isHigh = row.severity === "high" || row.severity === "critical";
          toast({
            title: isHigh ? "🚨 심각 이상치 탐지" : "⚠ 이상치 탐지",
            description: `${row.rule}${row.user_id ? ` · ${String(row.user_id).slice(0, 8)}…` : ""}`,
          });
          // Audible cue for high severity (best-effort, ignored if blocked)
          if (isHigh) {
            try {
              const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
              if (Ctx) {
                const ctx = new Ctx();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = "sine";
                o.frequency.value = 880;
                g.gain.value = 0.05;
                o.connect(g).connect(ctx.destination);
                o.start();
                o.stop(ctx.currentTime + 0.2);
                setTimeout(() => ctx.close(), 400);
              }
            } catch {}
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);


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

  const filtered = useMemo(() => {
    const min = minIssues === "" ? -1 : Number(minIssues);
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() + 86400000 : Infinity;
    return audits.filter((a) => {
      const t = new Date(a.created_at).getTime();
      if (t < fromTs || t > toTs) return false;
      if (okFilter === "ok" && !a.ok) return false;
      if (okFilter === "fail" && a.ok) return false;
      if (min >= 0 && a.issue_count < min) return false;
      return true;
    });
  }, [audits, from, to, okFilter, minIssues]);

  function resetFilters() {
    setFrom(""); setTo(""); setOkFilter("all"); setMinIssues("");
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

      {/* SLO card */}
      {slo && (
        <div className="glass-strong rounded-2xl p-4 neon-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-gold" />
              <h3 className="font-display font-black text-sm">정산 SLO (7d)</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                slo.health === "ok" ? "text-secondary bg-secondary/15 border-secondary/30" :
                slo.health === "degraded" ? "text-gold bg-gold/15 border-gold/30" :
                "text-destructive bg-destructive/15 border-destructive/30"
              }`}>{String(slo.health).toUpperCase()}</span>
            </div>
            <button onClick={recoverNow} disabled={recovering}
              className="px-3 py-2 rounded-xl bg-destructive/20 text-destructive text-xs font-bold flex items-center gap-1.5 press">
              <Wrench className={`w-3.5 h-3.5 ${recovering ? "animate-spin" : ""}`} /> Stuck 복구
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <Mini label="성공률" value={slo.success_rate != null ? `${slo.success_rate}%` : "—"} />
            <Mini label="실행/성공" value={`${slo.success_runs}/${slo.total_runs}`} />
            <Mini label="p95" value={`${slo.p95_duration_ms}ms`} />
            <Mini label="Stuck" value={String(slo.stuck_count)} tone={slo.stuck_count > 0 ? "fail" : "ok"} />
            <Mini label="연속실패" value={String(slo.consecutive_failures)} tone={slo.consecutive_failures > 0 ? "fail" : "ok"} />
            <Mini label="다음예정" value={slo.next_due_at ? new Date(slo.next_due_at).toLocaleString("ko-KR") : "—"} />
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            마지막 실행: {slo.last_run_at ? new Date(slo.last_run_at).toLocaleString("ko-KR") : "—"} · 마지막 성공: {slo.last_ok_at ? new Date(slo.last_ok_at).toLocaleString("ko-KR") : "—"}
          </div>
        </div>
      )}

      {/* Policy Assertions */}
      <div className="glass-strong rounded-2xl p-4 neon-border">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-gold" />
            <h3 className="font-display font-black text-sm">Policy as Code 단언</h3>
            {(() => {
              const latestKey: Record<string, AssertionRun> = {};
              for (const r of assertionRuns) if (!latestKey[r.assertion_key]) latestKey[r.assertion_key] = r;
              const arr = Object.values(latestKey);
              const failed = arr.filter(r => !r.passed).length;
              return (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  failed === 0 ? "text-secondary bg-secondary/15 border-secondary/30" : "text-destructive bg-destructive/15 border-destructive/30"
                }`}>{failed === 0 ? `ALL PASS · ${arr.length}` : `${failed} FAIL`}</span>
              );
            })()}
          </div>
          <button onClick={runAssertions} disabled={runningAssert}
            className="px-3 py-2 rounded-xl bg-gradient-imperial text-primary-foreground text-xs font-bold flex items-center gap-1.5 press">
            <RefreshCw className={`w-3.5 h-3.5 ${runningAssert ? "animate-spin" : ""}`} /> 단언 실행
          </button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {(() => {
            const latestKey: Record<string, AssertionRun> = {};
            for (const r of assertionRuns) if (!latestKey[r.assertion_key]) latestKey[r.assertion_key] = r;
            const arr = Object.values(latestKey).sort((a, b) => Number(a.passed) - Number(b.passed));
            if (arr.length === 0) return <div className="text-xs text-muted-foreground text-center py-4">실행 기록 없음 — "단언 실행" 클릭</div>;
            return arr.map((r) => (
              <div key={r.assertion_key} className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg glass">
                <div className="flex items-center gap-2 min-w-0">
                  {r.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-secondary shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />}
                  <span className="font-mono truncate">{r.assertion_key}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{r.observed ?? "—"}</span>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* Anomaly Detection */}
      <div className="glass-strong rounded-2xl p-4 neon-border">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Radar className="w-4 h-4 text-gold" />
            <h3 className="font-display font-black text-sm">실시간 이상치 탐지</h3>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> LIVE
            </span>
            {(() => {
              const unack = anomalies.filter(a => !a.acknowledged).length;
              return (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  unack === 0 ? "text-secondary bg-secondary/15 border-secondary/30" : "text-destructive bg-destructive/15 border-destructive/30 animate-pulse"
                }`}>{unack === 0 ? "정상" : `미확인 ${unack}`}</span>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <input type="checkbox" checked={showAckOnly} onChange={(e) => setShowAckOnly(e.target.checked)} /> 처리 포함
            </label>
            <button onClick={scanAnomalies} disabled={scanningAnom}
              className="px-3 py-2 rounded-xl bg-destructive/20 text-destructive text-xs font-bold flex items-center gap-1.5 press">
              <Radar className={`w-3.5 h-3.5 ${scanningAnom ? "animate-spin" : ""}`} /> 즉시 스캔
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {anomalies.filter(a => showAckOnly || !a.acknowledged).length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">탐지된 이상치 없음</div>
          )}
          {anomalies.filter(a => showAckOnly || !a.acknowledged).map((a) => {
            const sevTone = a.severity === "critical" || a.severity === "high"
              ? "text-destructive bg-destructive/15 border-destructive/30"
              : a.severity === "medium" ? "text-gold bg-gold/15 border-gold/30"
              : "text-muted-foreground bg-muted/15 border-border";
            return (
              <div key={a.id} className="glass rounded-2xl p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <BellRing className={`w-4 h-4 ${a.acknowledged ? "text-muted-foreground" : "text-destructive"}`} />
                    <span className="text-xs font-bold truncate">{a.rule}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${sevTone}`}>{a.severity}</span>
                    {a.acknowledged && <span className="text-[10px] text-secondary">✓ 처리됨</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("ko-KR")}</span>
                    <button onClick={() => setAnomalyDetail(a)} className="p-1 rounded hover:bg-accent/20"><Eye className="w-3.5 h-3.5" /></button>
                    {!a.acknowledged && (
                      <button onClick={() => ackAnomaly(a.id)} className="px-2 py-1 rounded bg-secondary/20 text-secondary text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> 확인
                      </button>
                    )}
                  </div>
                </div>
                {a.user_id && <div className="text-[10px] text-muted-foreground mt-1 font-mono truncate">user: {a.user_id}</div>}
                <div className="text-[10px] text-muted-foreground mt-1 truncate">{JSON.stringify(a.evidence)}</div>
              </div>
            );
          })}
        </div>
      </div>


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

      {/* Filters */}
      <div className="glass rounded-2xl p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Filter className="w-3.5 h-3.5 text-gold" /> 필터
          <button onClick={resetFilters} className="ml-auto text-[10px] text-muted-foreground underline">초기화</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-muted-foreground">
            시작일
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full mt-1 rounded-lg bg-background/40 border border-border px-2 py-1.5 text-xs" />
          </label>
          <label className="text-[10px] text-muted-foreground">
            종료일
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full mt-1 rounded-lg bg-background/40 border border-border px-2 py-1.5 text-xs" />
          </label>
          <label className="text-[10px] text-muted-foreground">
            성공 여부
            <select value={okFilter} onChange={(e) => setOkFilter(e.target.value as OkFilter)}
              className="w-full mt-1 rounded-lg bg-background/40 border border-border px-2 py-1.5 text-xs">
              <option value="all">전체</option>
              <option value="ok">PASS</option>
              <option value="fail">FAIL</option>
            </select>
          </label>
          <label className="text-[10px] text-muted-foreground">
            최소 이슈 수
            <input type="number" min={0} value={minIssues} onChange={(e) => setMinIssues(e.target.value)}
              placeholder="0" className="w-full mt-1 rounded-lg bg-background/40 border border-border px-2 py-1.5 text-xs" />
          </label>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {filtered.length}건 / 전체 {audits.length}건
        </div>
      </div>

      {/* Security audit history */}
      <div>
        <h3 className="font-display font-black text-sm flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-gold" /> RLS 무결성 감사 이력
        </h3>
        <div className="space-y-2">
          {loading && <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">불러오는 중…</div>}
          {!loading && filtered.length === 0 && (
            <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">조건에 맞는 기록 없음</div>
          )}
          {filtered.map((a) => (
            <button
              key={a.id}
              onClick={() => setDetail(a)}
              className="w-full text-left glass rounded-2xl p-3 hover:bg-accent/10 transition press"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {a.ok ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <AlertTriangle className="w-4 h-4 text-destructive" />}
                  <span className="text-xs font-bold">{a.ok ? "PASS" : `FAIL (${a.issue_count})`}</span>
                  <span className="text-[10px] text-muted-foreground">· {a.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString("ko-KR")}</span>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              </div>
              {!a.ok && Array.isArray(a.issues) && a.issues.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {a.issues.slice(0, 2).map((it: any, i: number) => (
                    <li key={i} className="text-[11px] text-destructive truncate">
                      • [{it.severity}] {it.table ?? it.function ?? "?"} — {it.msg}
                    </li>
                  ))}
                  {a.issues.length > 2 && (
                    <li className="text-[10px] text-muted-foreground">+ {a.issues.length - 2} more…</li>
                  )}
                </ul>
              )}
            </button>
          ))}
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail?.ok ? <CheckCircle2 className="w-5 h-5 text-secondary" /> : <AlertTriangle className="w-5 h-5 text-destructive" />}
              감사 상세 {detail && <span className="text-xs text-muted-foreground font-normal">· {new Date(detail.created_at).toLocaleString("ko-KR")}</span>}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <Stat label="결과" value={detail.ok ? "PASS" : "FAIL"} tone={detail.ok ? "ok" : "fail"} />
                <Stat label="이슈 수" value={String(detail.issue_count)} />
                <Stat label="소스" value={detail.source} />
              </div>
              {Array.isArray(detail.issues) && detail.issues.length > 0 && (
                <div>
                  <div className="font-bold mb-1">이슈 목록</div>
                  <ul className="space-y-1">
                    {detail.issues.map((it: any, i: number) => (
                      <li key={i} className="glass rounded-lg p-2">
                        <div className="text-destructive text-[11px] font-bold">[{it.severity}] {it.table ?? it.function ?? "?"}</div>
                        <div className="text-[11px]">{it.msg}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="font-bold mb-1">원본 JSON</div>
                <pre className="glass rounded-lg p-2 text-[10px] overflow-auto max-h-72 whitespace-pre-wrap break-all">
{JSON.stringify(detail, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!anomalyDetail} onOpenChange={(o) => !o && setAnomalyDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-destructive" /> 이상치 상세
            </DialogTitle>
          </DialogHeader>
          {anomalyDetail && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <Stat label="룰" value={anomalyDetail.rule} />
                <Stat label="심각도" value={anomalyDetail.severity} tone={anomalyDetail.severity === "critical" || anomalyDetail.severity === "high" ? "fail" : undefined} />
              </div>
              <div className="text-[11px] text-muted-foreground">발생: {new Date(anomalyDetail.created_at).toLocaleString("ko-KR")}</div>
              {anomalyDetail.user_id && <div className="text-[11px] font-mono break-all">user: {anomalyDetail.user_id}</div>}
              <div>
                <div className="font-bold mb-1">증거</div>
                <pre className="glass rounded-lg p-2 text-[10px] overflow-auto max-h-64 whitespace-pre-wrap break-all">
{JSON.stringify(anomalyDetail.evidence, null, 2)}
                </pre>
              </div>
              {anomalyDetail.acknowledged && (
                <div className="text-[11px] text-secondary">
                  ✓ {anomalyDetail.acknowledged_at && new Date(anomalyDetail.acknowledged_at).toLocaleString("ko-KR")}
                  {anomalyDetail.ack_note && <div className="text-muted-foreground mt-1">메모: {anomalyDetail.ack_note}</div>}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "fail" }) {
  return (
    <div className="glass rounded-lg p-2 text-center">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`font-bold mt-0.5 ${tone === "ok" ? "text-secondary" : tone === "fail" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "ok" | "fail" }) {
  return (
    <div className="glass rounded-lg p-2">
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`font-bold mt-0.5 truncate ${tone === "ok" ? "text-secondary" : tone === "fail" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}
