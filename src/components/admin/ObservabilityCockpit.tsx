import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Webhook, Snowflake, FlaskConical, RefreshCw, Gauge, ListTree } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getSpanMetrics, getLastAlert, getPersistedQueueSize } from "@/lib/spans";
import RecentActivity from "./RecentActivity";

type Sub = "activity" | "slow" | "spanq" | "webhook" | "freeze" | "chaos";

export default function ObservabilityCockpit() {
  const [sub, setSub] = useState<Sub>("activity");
  const subs: { id: Sub; label: string; icon: any }[] = [
    { id: "activity", label: "활동 로그", icon: ListTree },
    { id: "slow", label: "Slow Top 20", icon: Activity },
    { id: "spanq", label: "Span 품질", icon: Gauge },
    { id: "webhook", label: "Webhooks", icon: Webhook },
    { id: "freeze", label: "Freezes", icon: Snowflake },
    { id: "chaos", label: "Chaos", icon: FlaskConical },
  ];
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto -mx-1 pb-1">
        {subs.map((s) => (
          <button key={s.id} onClick={() => setSub(s.id)}
            className={`shrink-0 px-3 py-2 rounded-lg text-[11px] font-bold flex items-center gap-1.5 ${sub === s.id ? "bg-gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
            <s.icon className="w-3 h-3" /> {s.label}
          </button>
        ))}
      </div>
      {sub === "activity" && <RecentActivity />}
      {sub === "slow" && <SlowRequests />}
      {sub === "spanq" && <SpanQuality />}
      {sub === "webhook" && <Webhooks />}
      {sub === "freeze" && <Freezes />}
      {sub === "chaos" && <ChaosHistory />}
    </div>
  );
}

function SpanQuality() {
  const [m, setM] = useState(getSpanMetrics());
  const [persisted, setPersisted] = useState<number>(0);
  const [alert, setAlert] = useState(getLastAlert());
  useEffect(() => {
    const id = setInterval(async () => {
      setM(getSpanMetrics());
      setAlert(getLastAlert());
      setPersisted(await getPersistedQueueSize());
    }, 1000);
    return () => clearInterval(id);
  }, []);
  const total = m.flushed_ok + m.flushed_fail + m.dropped;
  const successRate = total > 0 ? (m.flushed_ok / total) * 100 : 100;
  const lossRate = total > 0 ? ((m.flushed_fail + m.dropped) / total) * 100 : 0;
  const cells: [string, string | number, string?][] = [
    ["Enqueued", m.enqueued],
    ["성공 flush", m.flushed_ok],
    ["실패 flush", m.flushed_fail, m.flushed_fail > 0 ? "text-destructive" : ""],
    ["재시도", m.retried],
    ["중복 제거", m.deduped],
    ["손실(드롭)", m.dropped, m.dropped > 0 ? "text-destructive" : ""],
    ["성공률", `${successRate.toFixed(2)}%`, successRate >= 99 ? "text-secondary" : "text-gold"],
    ["손실률", `${lossRate.toFixed(2)}%`, lossRate <= 1 ? "text-secondary" : "text-destructive"],
    ["메모리 큐", `${m.queue_size}${m.in_flight ? " ⏳" : ""}`],
    ["로컬 저장(IDB/LS)", persisted, persisted > 50 ? "text-gold" : ""],
    ["마지막 flush", m.last_flush_at ? new Date(m.last_flush_at).toLocaleTimeString("ko-KR") : "—"],
    ["마지막 임계 알림", alert.at ? `${new Date(alert.at).toLocaleTimeString("ko-KR")} · ${alert.reason ?? "—"}` : "—", alert.at ? "text-gold" : ""],
  ];
  return (
    <div className="glass-strong rounded-2xl p-4 neon-border space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-1.5"><Gauge className="w-4 h-4 text-gold" /> Span 계측 품질</h3>
        <span className="text-[10px] text-muted-foreground">1초마다 갱신 · 클라이언트 로컬</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cells.map(([label, value, tone]) => (
          <div key={label} className="glass rounded-xl p-2.5">
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className={`font-bold tabular-nums mt-1 text-xs ${tone ?? ""}`}>{value}</div>
          </div>
        ))}
      </div>
      {m.last_error && (
        <div className="text-[10px] text-destructive break-all glass rounded-lg p-2">최근 에러: {m.last_error}</div>
      )}
    </div>
  );
}


function SlowRequests() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("slow_requests_top", { _limit: 20, _hours: 24 });
    if (error) toast({ title: "조회 실패", description: error.message });
    setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-sm">최근 24h 느린 요청 Top 20</h3>
        <button onClick={load} className="glass px-2 py-1 rounded-lg text-[10px] flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 새로고침</button>
      </div>
      {loading && <div className="text-xs text-muted-foreground">로딩…</div>}
      {!loading && rows.length === 0 && <div className="text-xs text-muted-foreground">데이터 없음 (record_span 인스트루먼트 필요)</div>}
      <div className="space-y-1">
        {rows.map((r: any, i: number) => (
          <div key={i} className="flex items-center justify-between text-[11px] glass rounded-lg px-3 py-2">
            <div className="font-mono truncate flex-1">{r.op}</div>
            <div className="flex gap-3 text-muted-foreground">
              <span>n={r.calls}</span>
              <span>p95 <b className="text-gold">{r.p95_ms}ms</b></span>
              <span>avg {r.avg_ms}ms</span>
              <span>max {r.max_ms}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Webhooks() {
  const [subs, setSubs] = useState<any[]>([]);
  const [delivs, setDelivs] = useState<any[]>([]);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["anomaly", "freeze"]);

  const EVENT_OPTIONS = ["anomaly", "slo_breach", "freeze", "chaos_failed"];

  async function load() {
    const [s, d] = await Promise.all([
      supabase.from("webhook_subscriptions" as any).select("*").order("created_at", { ascending: false }),
      supabase.from("webhook_deliveries" as any).select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setSubs((s.data as any[]) || []);
    setDelivs((d.data as any[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!url.startsWith("https://")) { toast({ title: "https URL이 필요합니다" }); return; }
    if (events.length === 0) { toast({ title: "이벤트 1개 이상 선택" }); return; }
    const buf = crypto.getRandomValues(new Uint8Array(24));
    const secretHex = Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("webhook_subscriptions" as any).insert({ url, events, secret: secretHex, active: true, created_by: user?.id } as any);
    if (error) { toast({ title: "등록 실패", description: error.message }); return; }
    toast({ title: "등록 완료", description: `시크릿(서버 외에는 다시 표시 안 됨): ${secretHex}` });
    setUrl("");
    load();
  }
  async function toggle(id: string, active: boolean) {
    await supabase.from("webhook_subscriptions" as any).update({ active: !active } as any).eq("id", id);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4 neon-border space-y-2">
        <h3 className="font-display font-bold text-sm">Webhook 구독 등록</h3>
        <input placeholder="https://example.com/hook" value={url} onChange={(e) => setUrl(e.target.value)}
          className="w-full bg-input/60 border border-border rounded-xl px-3 py-2 text-sm" />
        <div className="flex flex-wrap gap-1.5">
          {EVENT_OPTIONS.map((ev) => {
            const on = events.includes(ev);
            return (
              <button key={ev} type="button"
                onClick={() => setEvents((p) => on ? p.filter((x) => x !== ev) : [...p, ev])}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${on ? "bg-gradient-primary text-primary-foreground" : "glass text-muted-foreground"}`}>
                {ev}
              </button>
            );
          })}
        </div>
        <button onClick={add} className="w-full py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold">등록 (HMAC-SHA256 시크릿 자동 생성)</button>
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[11px] font-bold mb-2">활성 구독 {subs.length}개</div>
        {subs.map((s) => (
          <div key={s.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-border/40 last:border-0">
            <div className="truncate flex-1">
              <span className="text-gold">[{(s.events || []).join(",")}]</span> {s.url}
              {s.last_status && <span className="ml-2 text-muted-foreground">last={s.last_status}</span>}
            </div>
            <button onClick={() => toggle(s.id, s.active)}
              className={`px-2 py-0.5 rounded text-[10px] ${s.active ? "bg-secondary/20 text-secondary" : "bg-muted/40"}`}>
              {s.active ? "ON" : "OFF"}
            </button>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-3">
        <div className="text-[11px] font-bold mb-2">최근 전송 20건</div>
        {delivs.length === 0 && <div className="text-[10px] text-muted-foreground">아직 전송 이력 없음</div>}
        {delivs.map((d) => (
          <div key={d.id} className="text-[10px] flex justify-between py-1 border-b border-border/30 last:border-0">
            <span className="truncate flex-1">{d.event}</span>
            <span className={d.http_status && d.http_status < 400 ? "text-secondary" : "text-destructive"}>
              {d.http_status || (d.error ? "ERR" : "—")}
            </span>
            <span className="text-muted-foreground ml-2">{new Date(d.created_at).toLocaleString("ko-KR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Freezes() {
  const [rows, setRows] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("account_freezes" as any).select("*")
      .is("released_at", null).order("frozen_at", { ascending: false }).limit(50);
    setRows((data as any[]) || []);
  }
  useEffect(() => { load(); }, []);
  async function release(id: string) {
    const { error } = await (supabase as any).rpc("admin_release_freeze", { _freeze_id: id, _note: "manual release" });
    if (error) toast({ title: "해제 실패", description: error.message });
    else { toast({ title: "해제 완료" }); load(); }
  }
  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <h3 className="font-display font-bold text-sm mb-2">활성 freeze {rows.length}건</h3>
      {rows.length === 0 && <div className="text-xs text-muted-foreground">현재 freeze된 계정 없음</div>}
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="glass rounded-lg p-3 flex items-center justify-between">
            <div className="text-[11px]">
              <div className="font-mono">{r.user_id.slice(0, 8)}…</div>
              <div className="text-muted-foreground">{r.reason}</div>
              <div className="text-[10px] text-gold">{r.severity} · 만료 {new Date(r.expires_at).toLocaleString("ko-KR")}</div>
            </div>
            <button onClick={() => release(r.id)}
              className="bg-destructive/20 text-destructive text-[10px] px-3 py-1.5 rounded-lg font-bold">해제</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChaosHistory() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("chaos_runs" as any).select("*").order("ran_at", { ascending: false }).limit(30)
      .then(({ data }) => setRows((data as any[]) || []));
  }, []);
  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <h3 className="font-display font-bold text-sm mb-2">최근 30회 카오스 드릴</h3>
      {rows.length === 0 && <div className="text-xs text-muted-foreground">실행 이력 없음</div>}
      <div className="space-y-1">
        {rows.map((r) => {
          const ok = r.failed === 0;
          return (
            <details key={r.id} className="glass rounded-lg">
              <summary className="cursor-pointer text-[11px] px-3 py-2 flex justify-between">
                <span className={ok ? "text-secondary" : "text-destructive"}>
                  {ok ? "✅" : "❌"} {r.passed}/{r.total_probes} · {r.duration_ms}ms
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(r.ran_at).toLocaleString("ko-KR")} · {r.source}
                </span>
              </summary>
              <pre className="text-[9px] p-2 bg-background/40 rounded-b-lg overflow-x-auto max-h-40">
                {JSON.stringify(r.results, null, 2)}
              </pre>
            </details>
          );
        })}
      </div>
    </div>
  );
}
