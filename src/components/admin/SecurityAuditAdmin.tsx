import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, ShieldAlert, RefreshCw, Activity, AlertTriangle, CheckCircle2, Filter, Eye } from "lucide-react";
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

export default function SecurityAuditAdmin() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [settles, setSettles] = useState<SettleRow[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AuditRow | null>(null);

  // filters
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [okFilter, setOkFilter] = useState<OkFilter>("all");
  const [minIssues, setMinIssues] = useState<string>("");

  async function load() {
    setLoading(true);
    const [a, s] = await Promise.all([
      supabase.from("security_audit_log").select("*").order("created_at", { ascending: false }).limit(200),
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
