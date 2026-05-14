/**
 * Self-Heal Console — operator-only one-stop ops cockpit.
 * Lets the operator diagnose, repair, and emergency-stop the platform
 * without needing to ask the AI agent for code changes.
 *
 * AAL2-protected (lives under /admin/ops/*).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify, describeError } from "@/lib/notify";
import {
  HeartPulse, Activity, ListChecks, Database, Radio, Zap, ShieldAlert,
  PlayCircle, RefreshCcw, Power, AlertTriangle, Download, Search,
} from "lucide-react";

// ---------- Types ----------
type KillSwitch = {
  key: string;
  enabled: boolean;
  reason: string | null;
  set_by: string | null;
  set_at: string;
};
type HealthCheck = { name: string; pass: boolean; value: any; note?: string };
type TableCount = { table: string; count: number | null; error?: string };

// ---------- Helpers ----------
async function rpc<T = any>(name: string, args?: Record<string, any>): Promise<T> {
  const { data, error } = await (supabase as any).rpc(name, args ?? {});
  if (error) throw error;
  return data as T;
}

function pillFor(pass: boolean) {
  return pass ? (
    <Badge className="bg-primary/15 text-primary border-primary/30">PASS</Badge>
  ) : (
    <Badge className="bg-destructive/15 text-destructive border-destructive/30 animate-pulse">FAIL</Badge>
  );
}

// =====================================================================
// TAB 1 — OVERVIEW
// =====================================================================
function OverviewTab({ checks, switches, onRefresh, loading }: {
  checks: HealthCheck[];
  switches: KillSwitch[];
  onRefresh: () => void;
  loading: boolean;
}) {
  const failing = checks.filter((c) => !c.pass);
  const activeSwitches = switches.filter((s) => s.enabled);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
          <RefreshCcw className="w-4 h-4 mr-1.5" />새로고침
        </Button>
        <span className="text-xs text-muted-foreground">
          {loading ? "진단 중..." : `${checks.length}개 체크 · ${failing.length}개 경고`}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="활성 Kill Switch" value={activeSwitches.length}
          tone={activeSwitches.length ? "danger" : "ok"} />
        <StatCard label="실패 헬스체크" value={failing.length}
          tone={failing.length ? "warn" : "ok"} />
        <StatCard label="총 체크" value={checks.length} tone="ok" />
        <StatCard label="마지막 진단" value={loading ? "..." : "now"} tone="ok" />
      </div>

      {activeSwitches.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />🔴 활성화된 긴급 차단
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSwitches.map((s) => (
              <div key={s.key} className="flex items-center gap-3 text-xs">
                <Badge variant="destructive">{s.key}</Badge>
                <span className="text-muted-foreground">{s.reason ?? "(사유 없음)"}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {failing.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">⚠️ 지금 봐야 할 항목</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {failing.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs border-b border-border/30 pb-1.5">
                <div>
                  <div className="font-mono font-bold">{c.name}</div>
                  {c.note && <div className="text-muted-foreground">{c.note}</div>}
                </div>
                <div className="font-mono text-destructive">
                  {typeof c.value === "object" ? "JSON" : String(c.value)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : !loading && (
        <EmptyState
          icon={<HeartPulse className="w-8 h-8" />}
          title="모든 시스템 정상"
          description="실패한 헬스체크가 없습니다."
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: any; tone: "ok"|"warn"|"danger" }) {
  const cls =
    tone === "danger" ? "border-destructive/40 text-destructive"
    : tone === "warn" ? "border-accent/40 text-accent"
    : "border-border/40";
  return (
    <Card className={cls}>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-2xl font-black tabular-nums mt-0.5">{value}</div>
      </CardContent>
    </Card>
  );
}

// =====================================================================
// TAB 2 — DIAGNOSTICS
// =====================================================================
function DiagnosticsTab({ checks, onRefresh, loading }: {
  checks: HealthCheck[]; onRefresh: () => void; loading: boolean;
}) {
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ ran_at: new Date().toISOString(), checks }, null, 2)],
      { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `selfheal-diagnostics-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onRefresh} disabled={loading}>
          <PlayCircle className="w-4 h-4 mr-1.5" />전체 진단 실행
        </Button>
        <Button size="sm" variant="outline" onClick={downloadJson} disabled={!checks.length}>
          <Download className="w-4 h-4 mr-1.5" />결과 JSON
        </Button>
      </div>
      {loading ? <LoadingList rows={6} /> : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border/40">
                <tr><th className="text-left p-2">체크</th><th className="text-left p-2">상태</th><th className="text-left p-2">값</th></tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.name} className="border-b border-border/20">
                    <td className="p-2 font-mono">{c.name}</td>
                    <td className="p-2">{pillFor(c.pass)}</td>
                    <td className="p-2 font-mono text-muted-foreground max-w-[480px] truncate">
                      {typeof c.value === "object" ? JSON.stringify(c.value) : String(c.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// =====================================================================
// TAB 3 — JOBS / CRON
// =====================================================================
const CRON_JOBS = [
  { id: "reclaim_stale_intents",        label: "Stale 인텐트 회수 (LPI)" },
  { id: "monitor_lpi_stuck_reserved",   label: "Stuck LPI 모니터" },
  { id: "settle_ended_founding_seasons",label: "Founding 시즌 정산" },
  { id: "settle_guild_weekly",          label: "길드 주간 정산" },
];

function JobsTab() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  const trigger = async (job: string) => {
    setRunning(job);
    try {
      const result = await rpc("admin_trigger_cron", { _job: job });
      setResults((r) => ({ ...r, [job]: result }));
      notify.success(`${job} 실행됨`);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setRunning(null);
    }
  };
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">정기작업 수동 트리거</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {CRON_JOBS.map((j) => (
          <div key={j.id} className="flex items-center gap-2 border-b border-border/20 pb-2">
            <div className="flex-1">
              <div className="text-sm font-bold">{j.label}</div>
              <div className="text-[10px] font-mono text-muted-foreground">{j.id}</div>
              {results[j.id] && (
                <div className="text-[10px] font-mono text-primary mt-1">
                  {JSON.stringify(results[j.id])}
                </div>
              )}
            </div>
            <Button size="sm" variant="outline"
              onClick={() => trigger(j.id)}
              disabled={running === j.id}>
              {running === j.id ? "실행 중..." : "실행"}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// TAB 4 — DB HELPER (table counts + readonly SQL)
// =====================================================================
function DbTab() {
  const [counts, setCounts] = useState<TableCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState("SELECT count(*) FROM profiles");
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlRunning, setSqlRunning] = useState(false);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rpc<{ tables: TableCount[] }>("admin_get_table_counts");
      setCounts(data?.tables ?? []);
    } catch (e) { notify.error(describeError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);

  const runSql = async () => {
    setSqlRunning(true); setSqlResult(null);
    try {
      const data = await rpc("admin_exec_readonly_sql", { _sql: sql });
      setSqlResult(data);
      notify.success(`${data?.count ?? 0}행 (${Math.round(data?.ms ?? 0)}ms)`);
    } catch (e) { notify.error(describeError(e)); }
    finally { setSqlRunning(false); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">테이블 행 카운트</CardTitle>
          <Button size="sm" variant="outline" onClick={loadCounts} disabled={loading}>
            <RefreshCcw className="w-3.5 h-3.5 mr-1" />새로고침
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? <LoadingList rows={3} /> : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {counts.map((c) => (
                <div key={c.table} className="border border-border/40 rounded-lg p-2">
                  <div className="text-[10px] font-mono text-muted-foreground truncate">{c.table}</div>
                  <div className="text-lg font-black tabular-nums">
                    {c.count ?? "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">읽기전용 SQL 실행기 <span className="text-[10px] font-normal text-muted-foreground">(SELECT/EXPLAIN/WITH · 5초 · 1000행)</span></CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea value={sql} onChange={(e) => setSql(e.target.value)}
            className="font-mono text-xs min-h-[120px]" placeholder="SELECT ..." />
          <div className="flex gap-2">
            <Button size="sm" onClick={runSql} disabled={sqlRunning}>
              <Search className="w-4 h-4 mr-1.5" />{sqlRunning ? "실행 중..." : "실행"}
            </Button>
            {sqlResult && (
              <Button size="sm" variant="outline" onClick={() => {
                const blob = new Blob([JSON.stringify(sqlResult.rows, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url;
                a.download = `query-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
              }}><Download className="w-3.5 h-3.5 mr-1" />JSON</Button>
            )}
          </div>
          {sqlResult && (
            <pre className="text-[10px] font-mono bg-muted/30 rounded p-2 max-h-[360px] overflow-auto">
{JSON.stringify(sqlResult.rows, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================================================
// TAB 5 — KILL SWITCHES (EMERGENCY)
// =====================================================================
const SWITCH_LABELS: Record<string, { label: string; desc: string }> = {
  trading_halt:     { label: "🔴 거래 전면 중단",   desc: "신규 베팅·포지션 오픈 차단" },
  withdrawals_halt: { label: "🔴 출금 중단",         desc: "출금 신청 차단" },
  signup_halt:      { label: "🔴 신규 가입 중단",   desc: "회원가입 차단" },
  maintenance_mode: { label: "🟡 유지보수 모드",     desc: "전 사용자에게 점검 화면" },
};

function KillSwitchesTab({ switches, reload }: { switches: KillSwitch[]; reload: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const toggle = async (key: string, enabled: boolean) => {
    if (enabled && !reasons[key]?.trim()) {
      notify.warning("사유를 입력해 주세요.");
      return;
    }
    if (enabled && !confirm(`정말 "${SWITCH_LABELS[key]?.label}" 을(를) 활성화하시겠습니까?\n사유: ${reasons[key]}`)) return;
    setBusy(key);
    try {
      await rpc("admin_set_kill_switch", { _key: key, _enabled: enabled, _reason: reasons[key] ?? null });
      notify.success(`${key} ${enabled ? "활성화" : "해제"}`);
      reload();
    } catch (e) { notify.error(describeError(e)); }
    finally { setBusy(null); }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <ShieldAlert className="w-4 h-4" />긴급 차단 (모든 액션 감사 기록)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {switches.map((s) => {
          const meta = SWITCH_LABELS[s.key] ?? { label: s.key, desc: "" };
          return (
            <div key={s.key} className="border border-border/40 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-bold text-sm">{meta.label}</div>
                  <div className="text-[10px] text-muted-foreground">{meta.desc}</div>
                </div>
                <Switch
                  checked={s.enabled}
                  disabled={busy === s.key}
                  onCheckedChange={(v) => toggle(s.key, v)}
                />
              </div>
              {!s.enabled && (
                <Input
                  placeholder="활성화 사유 (필수)"
                  value={reasons[s.key] ?? ""}
                  onChange={(e) => setReasons((r) => ({ ...r, [s.key]: e.target.value }))}
                  className="text-xs"
                />
              )}
              {s.enabled && (
                <div className="text-[10px] text-muted-foreground">
                  사유: <span className="text-foreground">{s.reason ?? "(없음)"}</span>
                  {" · "}set at {new Date(s.set_at).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// TAB 6 — RUN LOG
// =====================================================================
function RunLogTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("self_heal_run_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows(data ?? []);
    } catch (e) { notify.error(describeError(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">최근 100개 액션 로그</CardTitle>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCcw className="w-3.5 h-3.5 mr-1" />새로고침
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? <LoadingList rows={4} /> :
          rows.length === 0 ? <EmptyState title="로그 없음" description="아직 실행된 Self-Heal 액션이 없습니다." /> : (
          <div className="space-y-1.5 max-h-[520px] overflow-auto">
            {rows.map((r) => (
              <div key={r.id} className="text-[11px] border-b border-border/20 pb-1.5">
                <div className="flex items-center gap-2">
                  {r.ok ? <Badge className="bg-primary/15 text-primary">OK</Badge>
                        : <Badge className="bg-destructive/15 text-destructive">FAIL</Badge>}
                  <span className="font-mono font-bold">{r.action}</span>
                  {r.target && <span className="text-muted-foreground">→ {r.target}</span>}
                  <span className="ml-auto text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {(r.payload && Object.keys(r.payload).length > 0) && (
                  <div className="font-mono text-[10px] text-muted-foreground truncate">payload: {JSON.stringify(r.payload)}</div>
                )}
                {(r.result && Object.keys(r.result).length > 0) && (
                  <div className="font-mono text-[10px] text-muted-foreground truncate">result: {JSON.stringify(r.result)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================================
// MAIN PAGE
// =====================================================================
export default function SelfHeal() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [switches, setSwitches] = useState<KillSwitch[]>([]);
  const [loading, setLoading] = useState(false);

  const runHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rpc<{ checks: HealthCheck[] }>("admin_run_all_healthchecks");
      setChecks(data?.checks ?? []);
    } catch (e) { notify.error(describeError(e)); }
    finally { setLoading(false); }
  }, []);

  const loadSwitches = useCallback(async () => {
    try {
      const data = await rpc<KillSwitch[]>("admin_get_kill_switches");
      setSwitches(data ?? []);
    } catch (e) { notify.error(describeError(e)); }
  }, []);

  useEffect(() => { runHealth(); loadSwitches(); }, [runHealth, loadSwitches]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display font-black text-xl sm:text-2xl flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-primary" />Self-Heal Console
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          진단 · 정기작업 수동실행 · DB조회 · 긴급차단을 한 페이지에서. 모든 액션은 감사 로그에 기록됩니다.
        </p>
      </header>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview"><Activity className="w-3.5 h-3.5 mr-1" />개요</TabsTrigger>
          <TabsTrigger value="diag"><ListChecks className="w-3.5 h-3.5 mr-1" />진단</TabsTrigger>
          <TabsTrigger value="jobs"><Zap className="w-3.5 h-3.5 mr-1" />큐/잡</TabsTrigger>
          <TabsTrigger value="db"><Database className="w-3.5 h-3.5 mr-1" />DB</TabsTrigger>
          <TabsTrigger value="kill"><Power className="w-3.5 h-3.5 mr-1" />긴급</TabsTrigger>
          <TabsTrigger value="log"><Radio className="w-3.5 h-3.5 mr-1" />액션 로그</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-3">
          <OverviewTab checks={checks} switches={switches} onRefresh={() => { runHealth(); loadSwitches(); }} loading={loading} />
        </TabsContent>
        <TabsContent value="diag" className="mt-3">
          <DiagnosticsTab checks={checks} onRefresh={runHealth} loading={loading} />
        </TabsContent>
        <TabsContent value="jobs" className="mt-3"><JobsTab /></TabsContent>
        <TabsContent value="db" className="mt-3"><DbTab /></TabsContent>
        <TabsContent value="kill" className="mt-3">
          <KillSwitchesTab switches={switches} reload={loadSwitches} />
        </TabsContent>
        <TabsContent value="log" className="mt-3"><RunLogTab /></TabsContent>
      </Tabs>
    </div>
  );
}
