/**
 * /admin/duel — Imperial Duel real-betting console.
 * Kill switch + 24h metrics + force settle + audit export.
 * AAL2 enforced via AdminLayout section gate (registered with aal2: true).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify, describeError } from "@/lib/notify";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import DuelHealthDashboard from "@/components/admin/DuelHealthDashboard";

type Metrics = {
  window: string;
  bet_count: number;
  settled_count: number;
  total_pot_phon: number;
  total_edge_phon: number;
  actual_edge_pct: number;
  target_edge_pct: number;
  near_miss: { low: number; mid: number; high: number };
  perceived_avg_win_rate: number;
  actual_avg_win_rate: number;
  fairness_proof: { display_signals_isolated: boolean; rng_source: string };
};

function Pill({ tone, children }: { tone: "ok" | "warn" | "off"; children: React.ReactNode }) {
  const cls = tone === "ok"
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40"
    : tone === "warn"
    ? "bg-amber-500/20 text-amber-200 border-amber-400/40"
    : "bg-muted/40 text-muted-foreground border-border/40";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-mono ${cls}`}>{children}</span>;
}

function Bar({ value, max, label, tone = "amber" }: { value: number; max: number; label: string; tone?: "amber" | "emerald" | "rose" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = tone === "emerald" ? "from-emerald-500 to-emerald-300" : tone === "rose" ? "from-rose-500 to-rose-300" : "from-amber-500 to-amber-300";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] text-muted-foreground"><span>{label}</span><span className="font-mono">{value.toLocaleString()}</span></div>
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDuel() {
  const [killOn, setKillOn] = useState<boolean | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [seed, setSeed] = useState("");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [{ data: ks }, { data: m, error }] = await Promise.all([
        supabase.from("platform_kill_switches").select("enabled").eq("key", "phon_betting_enabled").maybeSingle(),
        supabase.rpc("admin_get_duel_metrics_24h"),
      ]);
      setKillOn(!!ks?.enabled);
      if (error) throw error;
      setMetrics(m as unknown as Metrics);
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function toggleKill() {
    if (killOn === null) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_set_kill_switch", { _key: "phon_betting_enabled", _enabled: !killOn });
      if (error) throw error;
      notify.success(killOn ? "PHON 결투 봉인됨" : "PHON 결투 개방됨");
      await refresh();
    } catch (e) {
      notify.error(describeError(e));
    } finally { setBusy(false); }
  }

  async function forceSettle() {
    if (!roomId || !seed) { notify.error("Room ID + Server Seed 필요"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("imperial-bet-settle", {
        body: { room_id: roomId, server_seed: seed },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "settle_failed");
      notify.success(`정산 완료 — winner: ${data.result?.winner}`);
      await refresh();
    } catch (e) {
      notify.error(describeError(e));
    } finally { setBusy(false); }
  }

  async function exportAudit() {
    try {
      const { data, error } = await supabase.from("imperial_duel_audit")
        .select("created_at,room_id,user_id,event,amount_phon,near_miss_intensity,cinematic_level,perceived_win_rate,actual_roll,meta")
        .gte("created_at", new Date(Date.now() - 86_400_000).toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      const rows = data ?? [];
      const cols = Object.keys(rows[0] ?? { created_at: "" });
      const csv = [cols.join(","), ...rows.map((r: any) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `imperial_duel_audit_${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      notify.error(describeError(e));
    }
  }

  if (loading && !metrics) return <LoadingList rows={4} />;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-black text-2xl">⚔️ Imperial Duel — PHON Real Betting</h1>
          <p className="text-xs text-muted-foreground mt-1">Mode B · House Edge 6.2% · Fair RNG (SHA-256 commit-reveal)</p>
        </div>
        <button
          type="button"
          onClick={toggleKill}
          disabled={busy || killOn === null}
          className={[
            "rounded-xl px-4 py-2 text-sm font-display font-bold border transition-all",
            killOn
              ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/50 hover:bg-emerald-500/30"
              : "bg-rose-500/20 text-rose-200 border-rose-400/50 hover:bg-rose-500/30",
          ].join(" ")}
        >
          {killOn ? "● LIVE — 봉인하기" : "○ OFF — 개방하기"}
        </button>
      </header>

      {!metrics ? (
        <EmptyState title="아직 데이터가 없습니다." description="첫 결투가 정산되면 지표가 채워집니다." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3">
              <div className="text-[10px] uppercase text-muted-foreground">24h 베팅</div>
              <div className="font-mono text-xl mt-1">{metrics.bet_count.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3">
              <div className="text-[10px] uppercase text-muted-foreground">정산 풀</div>
              <div className="font-mono text-xl mt-1">{Math.round(metrics.total_pot_phon).toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3">
              <div className="text-[10px] uppercase text-muted-foreground">House Edge 수익</div>
              <div className="font-mono text-xl mt-1 text-amber-300">{Math.round(metrics.total_edge_phon).toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3">
              <div className="text-[10px] uppercase text-muted-foreground">실측 Edge</div>
              <div className="font-mono text-xl mt-1">
                {metrics.actual_edge_pct.toFixed(2)}%
                <Pill tone={Math.abs(metrics.actual_edge_pct - metrics.target_edge_pct) <= 0.3 ? "ok" : "warn"}>
                  target {metrics.target_edge_pct}%
                </Pill>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-3">
              <div className="font-display font-bold text-sm">Near-Miss 강도 분포 (24h)</div>
              <Bar label="Calm (< 0.4)" value={metrics.near_miss.low} max={Math.max(1, metrics.settled_count)} tone="emerald" />
              <Bar label="Tense (0.4 – 0.75)" value={metrics.near_miss.mid} max={Math.max(1, metrics.settled_count)} tone="amber" />
              <Bar label="Climax (≥ 0.75)" value={metrics.near_miss.high} max={Math.max(1, metrics.settled_count)} tone="rose" />
            </div>

            <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-3">
              <div className="font-display font-bold text-sm">인지 승률 vs 실제 승률 (투명성 증명)</div>
              <Bar label="Perceived Win Rate" value={Math.round(metrics.perceived_avg_win_rate * 1000) / 10} max={100} tone="amber" />
              <Bar label="Actual Win Rate" value={Math.round(metrics.actual_avg_win_rate * 1000) / 10} max={100} tone="emerald" />
              <p className="text-[11px] text-muted-foreground">
                Display Signals 는 시각/사운드 연출에만 영향. 실제 RNG 결과는 <code className="font-mono">{metrics.fairness_proof.rng_source}</code> 로 결정됩니다.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur p-4 space-y-3">
            <div className="font-display font-bold text-sm">긴급 도구</div>
            <div className="grid md:grid-cols-3 gap-2">
              <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="room_id (uuid)"
                className="rounded-lg bg-background/60 border border-border/50 px-2 py-1.5 text-xs font-mono" />
              <input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="server_seed (≥16자)"
                className="rounded-lg bg-background/60 border border-border/50 px-2 py-1.5 text-xs font-mono md:col-span-2" />
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={busy} onClick={forceSettle}
                className="rounded-lg px-3 py-1.5 text-xs font-display font-bold bg-rose-500/20 text-rose-200 border border-rose-400/50 hover:bg-rose-500/30 disabled:opacity-50">
                Force Settle
              </button>
              <button type="button" onClick={exportAudit}
                className="rounded-lg px-3 py-1.5 text-xs font-display font-bold bg-muted/40 text-foreground border border-border/50 hover:bg-muted/60">
                Audit Export CSV (24h)
              </button>
              <button type="button" onClick={refresh} disabled={loading}
                className="rounded-lg px-3 py-1.5 text-xs font-display font-bold bg-muted/40 text-foreground border border-border/50 hover:bg-muted/60 disabled:opacity-50">
                새로고침
              </button>
            </div>
          </div>
          <DuelHealthDashboard />
        </>
      )}
    </div>
  );
}
