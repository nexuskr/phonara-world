// PR-2: Bot Mix Monitor — admin-only realtime view of real vs bot signals + auto-adjust trigger.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, Gauge, RefreshCw, Sparkles, Zap } from "lucide-react";

type Metrics = {
  enabled: boolean;
  current_strength_pct: number;
  recommended_strength_pct: number;
  real_active_users_24h: number;
  bot_events_24h: number;
  real_share: number;
  real_online_5m: number;
  cap_pct: number;
  snapshot_at: string;
};

type LogRow = {
  id: number;
  occurred_at: string;
  prev_strength_pct: number;
  new_strength_pct: number;
  reason: string;
  source: string;
};

export default function BotMixMonitor() {
  const [m, setM] = useState<Metrics | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: metrics, error: mErr }, { data: rows }] = await Promise.all([
      supabase.rpc("get_bot_mix_metrics"),
      supabase.from("bot_mix_log")
        .select("id,occurred_at,prev_strength_pct,new_strength_pct,reason,source")
        .order("occurred_at", { ascending: false })
        .limit(20),
    ]);
    if (mErr) notify.error("메트릭 로드 실패", { description: mErr.message });
    if (metrics) setM(metrics as unknown as Metrics);
    if (rows) setLog(rows as LogRow[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  async function runAutoAdjust() {
    setBusy(true);
    const { data, error } = await supabase.rpc("auto_adjust_bot_strength");
    setBusy(false);
    if (error) {
      notify.error("자동 조정 실패", { description: error.message });
      return;
    }
    const r = data as any;
    notify.success("자동 조정 적용", {
      description: r?.skipped ? "엔진이 비활성 상태입니다." : `${r.prev}% → ${r.new}% (권장 ${r.recommended}%)`,
    });
    void load();
  }

  if (loading && !m) return <LoadingList rows={6} />;
  if (!m) return <EmptyState title="메트릭 없음" description="관리자 권한을 확인하세요." />;

  const realPct = Math.round((m.real_share || 0) * 100);
  const drift = m.current_strength_pct - m.recommended_strength_pct;

  return (
    <div className="space-y-5">
      <div className="glass-strong rounded-2xl p-5 neon-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-primary" />
            <h2 className="font-imperial text-lg tracking-wider text-gradient-imperial">Bot Mix Monitor</h2>
          </div>
          <button onClick={runAutoAdjust} disabled={busy} className="lux-btn lux-btn-primary flex items-center gap-2">
            <Zap className="w-4 h-4" /> 자동 조정 실행
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          실유저 활동량을 기준으로 봇 강도를 5% 스텝으로 [20%, 50%] 범위 내에서 조정합니다.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <Stat icon={Activity} label="현재 강도" value={`${m.current_strength_pct}%`} />
          <Stat icon={Sparkles} label="권장 강도" value={`${m.recommended_strength_pct}%`} highlight={drift !== 0} />
          <Stat icon={Activity} label="실유저 (5m 온라인)" value={m.real_online_5m.toLocaleString()} />
          <Stat icon={Activity} label="실유저 비중 (24h)" value={`${realPct}%`} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="glass rounded-lg p-3">
            <div className="text-muted-foreground">실유저 활동 (24h)</div>
            <div className="font-bold tabular-nums">{m.real_active_users_24h.toLocaleString()}</div>
          </div>
          <div className="glass rounded-lg p-3">
            <div className="text-muted-foreground">봇 이벤트 (24h)</div>
            <div className="font-bold tabular-nums">{m.bot_events_24h.toLocaleString()}</div>
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground mt-3">
          하드 캡 {m.cap_pct}% · 마지막 스냅샷 {new Date(m.snapshot_at).toLocaleTimeString("ko-KR")}
        </div>
      </div>

      <div className="glass-strong rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold flex items-center gap-2"><RefreshCw className="w-4 h-4" /> 최근 조정 기록</div>
          <button onClick={load} className="lux-btn lux-btn-ghost text-xs">새로고침</button>
        </div>
        {log.length === 0 ? (
          <EmptyState title="조정 기록 없음" description="자동/수동 조정이 발생하면 여기에 표시됩니다." />
        ) : (
          <ul className="space-y-1.5 max-h-72 overflow-y-auto">
            {log.map(r => (
              <li key={r.id} className="text-xs flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.source === 'auto' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'}`}>
                  {r.source}
                </span>
                <span className="font-bold tabular-nums">{r.prev_strength_pct}% → {r.new_strength_pct}%</span>
                <span className="text-muted-foreground truncate">{r.reason}</span>
                <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                  {new Date(r.occurred_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, highlight }: any) {
  return (
    <div className={`glass rounded-xl p-3 text-center ${highlight ? 'ring-1 ring-primary/40' : ''}`}>
      <Icon className="w-4 h-4 mx-auto text-muted-foreground" />
      <div className="text-[10px] text-muted-foreground mt-1">{label}</div>
      <div className="font-display font-bold text-sm tabular-nums">{value}</div>
    </div>
  );
}
