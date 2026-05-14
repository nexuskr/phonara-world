/**
 * Stress Test Dashboard — admin-only, paper-isolated.
 * Mounted inside the empire GodModePanel. Drives src/lib/trading/stress-test.ts
 * and visualizes 1h SIM telemetry via admin_get_stress_test_stats().
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { Activity, FlaskConical, Gauge, Play, Power, RefreshCcw, Target, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import {
  equityVolatilityInjector,
  fullFlowAutoTest,
  getStressState,
  isStressEnabled,
  liquidationPressureSimulator,
  oracleSpikeSimulator,
  resetStressMetrics,
  setStressEnabled,
  subscribeStress,
} from "@/lib/trading/stress-test";

type ByType = { event_type: string; total: number; rejects: number; warns: number; passes: number; avg_rpi: number; avg_safety: number };
type Heat = { symbol: string; avg_rpi: number; rejects: number };
type Stats = { window: string; total: number; by_type: ByType[]; heatmap: Heat[]; near_miss_count: number };

function useStress() {
  return useSyncExternalStore(subscribeStress, getStressState, getStressState);
}

function pressureColor(rpi: number) {
  if (rpi >= 0.75) return "bg-red-500/80";
  if (rpi >= 0.5) return "bg-orange-500/70";
  if (rpi >= 0.3) return "bg-amber-400/60";
  return "bg-emerald-500/50";
}

export default function StressTestDashboard() {
  const s = useStress();
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc("admin_get_stress_test_stats" as any);
    if (!error && data) setStats(data as unknown as Stats);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const guarded = async (label: string, fn: () => Promise<void>) => {
    if (busy) return;
    if (!isStressEnabled()) { notify.error("Stress Mode 비활성화", { description: "먼저 토글을 켜주세요." }); return; }
    setBusy(label);
    try { await fn(); await load(); }
    catch (e: any) { notify.error("시뮬레이션 실패", { description: e?.message ?? "unknown" }); }
    finally { setBusy(null); }
  };

  return (
    <section className="rounded-2xl border border-fuchsia-500/30 bg-background/40 p-4 space-y-3 mt-3">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-fuchsia-300" />
          <h3 className="font-display font-black text-sm tracking-wider uppercase">Stress Test · 1h</h3>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-200 border border-fuchsia-500/30">
            SIMULATION ACTIVE · PAPER ONLY
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStressEnabled(!s.enabled)}
            className={`text-[10px] font-black px-2 py-1 rounded border inline-flex items-center gap-1 transition ${
              s.enabled
                ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                : "border-border/50 bg-background/60 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Power className="w-3 h-3" /> {s.enabled ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => { resetStressMetrics(); load(); }}
            className="text-[10px] font-black px-2 py-1 rounded border border-border/50 bg-background/60 hover:border-primary/40 inline-flex items-center gap-1"
          ><RefreshCcw className="w-3 h-3" /> reset</button>
        </div>
      </header>

      {/* Live runtime metrics */}
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <Mini icon={<Waves className="w-3 h-3" />} label="Latency" value={`${s.metrics.lastLatencyMs}ms`} />
        <Mini icon={<Gauge className="w-3 h-3" />} label="Equity Vol" value={`${s.metrics.equityVolatility.toFixed(0)}%`} />
        <Mini icon={<Target className="w-3 h-3" />} label="Near-Miss" value={String(s.metrics.nearMisses)} tone="warn" />
        <Mini icon={<Activity className="w-3 h-3" />} label="Reject%"
          value={s.metrics.totalRuns ? `${((s.metrics.rejects / s.metrics.totalRuns) * 100).toFixed(0)}%` : "—"}
          tone="danger" />
      </div>

      {/* 1-click simulators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ActionBtn
          label="Oracle Spike 8s"
          hint="가격 동기화 지연 주입"
          busy={busy === "oracle"}
          onClick={() => guarded("oracle", async () => {
            const r = await oracleSpikeSimulator({ delayMs: 8000 });
            notify.success(`Oracle Spike → ${r.status}`, { description: `RPI ${(r.rpi*100).toFixed(1)}% · ${Math.round(r.latencyMs)}ms` });
          })}
        />
        <ActionBtn
          label="Inject Volatility 35%"
          hint="자본 급변 시뮬"
          busy={busy === "vol"}
          onClick={() => guarded("vol", async () => {
            const r = await equityVolatilityInjector({ volatilityPercent: 35 });
            notify.success(`Equity Volatility → ${r.status}`, { description: `RPI ${(r.rpi*100).toFixed(1)}%` });
          })}
        />
        <ActionBtn
          label="Liq Pressure 50× / 47%"
          hint="청산 근접 near-miss"
          busy={busy === "liq"}
          onClick={() => guarded("liq", async () => {
            const r = await liquidationPressureSimulator({ leverage: 50, nearMissPercent: 47 });
            notify.success(`Liquidation Pressure → ${r.status}`, { description: `RPI ${(r.rpi*100).toFixed(1)}%` });
          })}
        />
        <ActionBtn
          label="Run Full Flow ×100"
          hint="paper 자동 회귀"
          accent
          busy={busy === "full"}
          onClick={() => guarded("full", async () => {
            const acc = await fullFlowAutoTest({ repeatCount: 100 });
            notify.success("Full Flow Test 완료", {
              description: `PASS ${acc.pass} · WARN ${acc.warn} · REJECT ${acc.reject} · Near-Miss ${acc.nearMiss}`,
            });
          })}
        />
      </div>

      {/* 1h aggregated SIM telemetry */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
          SIM Pressure Heatmap (1h, per symbol)
        </div>
        {!stats || stats.heatmap.length === 0 ? (
          <div className="text-[11px] text-muted-foreground/70 py-2">최근 1시간 SIM 이벤트 없음</div>
        ) : (
          <div className="grid grid-cols-2 gap-1">
            {stats.heatmap.map((h) => (
              <div key={h.symbol} className="flex items-center gap-2 text-[11px]">
                <span className="font-mono w-16 truncate">{h.symbol.replace("USDT","")}</span>
                <div className="flex-1 h-2 rounded bg-background/80 overflow-hidden border border-border/40">
                  <div className={`h-full ${pressureColor(Number(h.avg_rpi))}`} style={{ width: `${Math.min(100, Number(h.avg_rpi)*100).toFixed(0)}%` }} />
                </div>
                <span className="font-mono tabular-nums w-10 text-right">{(Number(h.avg_rpi)*100).toFixed(0)}%</span>
                {h.rejects > 0 && <span className="text-rose-300 text-[10px] font-bold">×{h.rejects}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {stats && stats.by_type.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          {stats.by_type.map((b) => (
            <div key={b.event_type} className="rounded-lg border border-border/40 bg-background/60 p-2">
              <div className="font-mono text-fuchsia-200 truncate">{b.event_type.replace("SIM_", "")}</div>
              <div className="text-muted-foreground tabular-nums">
                P{b.passes} · W{b.warns} · R{b.rejects} · RPI {(Number(b.avg_rpi)*100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
        시뮬레이션은 메모리 격리(per-tab) · 실 데이터 0%·실 RPC 0% 호출. 모든 이벤트는 schema-level 분리(<code>SIM_*</code>)로 기록됩니다.
      </p>
    </section>
  );
}

function Mini({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: "danger" | "warn" }) {
  const color = tone === "danger" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-cyan-300";
  return (
    <div className="rounded-lg border border-border/40 bg-background/60 p-2">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">{icon}{label}</div>
      <div className={`font-mono tabular-nums font-black mt-0.5 text-xs ${color}`}>{value}</div>
    </div>
  );
}

function ActionBtn({ label, hint, busy, accent, onClick }: { label: string; hint: string; busy: boolean; accent?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`group relative rounded-xl border p-2.5 text-left transition disabled:opacity-50 disabled:cursor-not-allowed
        ${accent ? "border-fuchsia-500/50 bg-fuchsia-500/10 hover:border-fuchsia-400" : "border-border/50 bg-background/60 hover:border-primary/50"}`}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold">
        <Play className="w-3 h-3" />{busy ? "running…" : label}
      </div>
      <div className="text-[10px] text-muted-foreground truncate">{hint}</div>
    </button>
  );
}
