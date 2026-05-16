import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Activity, Radio, AlertTriangle, RefreshCw, Sliders, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type SourceCell = { source: string; price: number; age_s: number };
type Row = {
  symbol: string;
  consensus: number;
  quorum: number;
  divergence_bps: number | null;
  sources: string[] | null;
  consensus_age_s: number;
  raw: SourceCell[] | null;
  // shadow fields (Phase 3.5)
  shadow_consensus: number | null;
  shadow_quorum: number | null;
  shadow_clamp_active: boolean;
  shadow_drift_bps: number | null;
};
type Weight = { source: string; weight: number; max_lag_ms: number };
type SourceHealth = { source: string; degraded: boolean; degraded_since: string | null; last_eff_weight: number | null };
type DriftPoint = { h: string; avg_bps: number; p99_bps: number; samples: number };
type Health = {
  summary: { healthy: number; degraded: number; down: number; total: number };
  matrix: Row[];
  weights: Weight[];
  health: SourceHealth[];
  drift_24h: DriftPoint[];
};
type Gate = { id: string; label: string; value: number; target: number; pass: boolean };
type Readiness = { pass_count: number; total: number; eligible: boolean; gates: Gate[]; samples_total: number };

const ALL_SOURCES = ["bybit", "binance", "coinbase"] as const;

function cellTone(age_s: number): string {
  if (age_s <= 8) return "text-emerald-500";
  if (age_s <= 20) return "text-amber-500";
  return "text-rose-500";
}

function quorumBadge(q: number) {
  if (q >= 2) return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Healthy ({q})</Badge>;
  if (q === 1) return <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30">Degraded (1)</Badge>;
  return <Badge variant="destructive">Down (0)</Badge>;
}

function WeightBar({ value }: { value: number | null }) {
  const pct = Math.max(0, Math.min(100, Math.round((value ?? 0) * 100)));
  const tone = pct >= 70 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
      <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function DriftSparkline({ points }: { points: DriftPoint[] }) {
  if (!points?.length) return <div className="text-xs text-muted-foreground">데이터 수집 중…</div>;
  const max = Math.max(10, ...points.map(p => p.p99_bps));
  return (
    <div className="flex items-end gap-[2px] h-16">
      {points.map((p, i) => {
        const h = Math.max(2, Math.round((p.avg_bps / max) * 100));
        const tone = p.avg_bps < 5 ? "bg-emerald-500" : p.avg_bps < 25 ? "bg-amber-500" : "bg-rose-500";
        return (
          <div key={i} className={`flex-1 ${tone} rounded-sm`} style={{ height: `${h}%` }}
               title={`${new Date(p.h).getHours()}시 · 평균 ${p.avg_bps}bps · p99 ${p.p99_bps}bps`} />
        );
      })}
    </div>
  );
}

export function OracleFortress() {
  const [data, setData] = useState<Health | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Weight | null>(null);
  const [editWeight, setEditWeight] = useState<number>(1);
  const [editLag, setEditLag] = useState<number>(3000);

  const load = useCallback(async () => {
    const [h, r] = await Promise.all([
      supabase.rpc("admin_get_oracle_health" as any),
      supabase.rpc("admin_get_oracle_swap_readiness" as any),
    ]);
    if (h.error) {
      notify.error("오라클 상태 조회 실패", { description: h.error.message });
      return;
    }
    setData(h.data as unknown as Health);
    if (!r.error) setReadiness(r.data as unknown as Readiness);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setVisibleInterval(load, 5000 , { meta: { owner: "OracleFortress", category: "admin" } });
    return () => t();
  }, [load]);

  const chaosStale = async (source: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc("admin_oracle_chaos_stale_source" as any, {
      _source: source, _minutes: 1,
    });
    setBusy(false);
    if (error) return notify.error("카오스 실패", { description: error.message });
    notify.warning(`${source} 강제 stale`, { description: `${data}건 row 백데이트` });
    load();
  };

  const chaosClear = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("admin_oracle_chaos_clear" as any);
    setBusy(false);
    if (error) return notify.error("카오스 복구 실패", { description: error.message });
    notify.success("카오스 복구 완료", { description: "다음 cron tick에서 신규 가격 수신" });
    load();
  };

  const openEdit = (w: Weight) => {
    setEditing(w);
    setEditWeight(Number(w.weight));
    setEditLag(Number(w.max_lag_ms));
  };

  const saveWeight = async () => {
    if (!editing) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_set_source_weight" as any, {
      _source: editing.source, _weight: editWeight, _max_lag_ms: editLag,
    });
    setBusy(false);
    if (error) return notify.error("가중치 저장 실패", { description: error.message });
    notify.success("가중치 저장 완료", { description: `${editing.source} → weight ${editWeight}` });
    setEditing(null);
    load();
  };

  if (loading) return <LoadingList rows={6} />;
  if (!data || !data.matrix?.length) return <EmptyState icon={<Activity className="w-6 h-6" />} title="오라클 데이터 없음" description="아직 합의된 심볼이 없습니다." />;

  const { summary, matrix, weights, health, drift_24h } = data;
  const healthBySrc = new Map(health.map(h => [h.source, h]));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Radio className="w-3 h-3" /> Healthy (≥2)</div>
          <div className="text-3xl font-bold text-emerald-500">{summary.healthy}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Degraded (1)</div>
          <div className="text-3xl font-bold text-amber-500">{summary.degraded}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Down (0)</div>
          <div className="text-3xl font-bold text-rose-500">{summary.down}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="text-xs text-muted-foreground">Total Symbols</div>
          <div className="text-3xl font-bold">{summary.total}</div>
        </CardContent></Card>
      </div>

      {/* Phase 3.5 — Swap readiness + drift */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {readiness?.eligible ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />}
              Shadow → Live 졸업 자격 ({readiness?.pass_count ?? 0}/{readiness?.total ?? 5})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(readiness?.gates ?? []).map(g => (
              <div key={g.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {g.pass ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className={g.pass ? "" : "text-muted-foreground"}>{g.label}</span>
                </div>
                <span className="font-mono text-muted-foreground">{g.value} / {g.target}</span>
              </div>
            ))}
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40">
              총 샘플 {readiness?.samples_total ?? 0}건 · 5/5 도달 시 weighted shadow → live 승격 가능
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Drift 24h (live vs shadow)</CardTitle>
          </CardHeader>
          <CardContent>
            <DriftSparkline points={drift_24h ?? []} />
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-sm" /> &lt;5bps</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded-sm" /> &lt;25bps</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-500 rounded-sm" /> ≥25bps</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source Weights */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Sliders className="w-4 h-4" /> Source Weights</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {weights.map(w => {
            const h = healthBySrc.get(w.source);
            return (
              <div key={w.source} className="rounded-md border border-border/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm uppercase">{w.source}</span>
                    {h?.degraded && <Badge className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[10px]">AUTO-DEGRADED</Badge>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>편집</Button>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Effective</span><span className="font-mono">{((h?.last_eff_weight ?? 0) * 100).toFixed(0)}%</span>
                  </div>
                  <WeightBar value={h?.last_eff_weight ?? 0} />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>Weight {Number(w.weight).toFixed(2)}</span>
                  <span>Max lag {w.max_lag_ms}ms</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Chaos Controls */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Chaos Drill</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {ALL_SOURCES.map(s => (
            <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => chaosStale(s)}>
              Kill {s}
            </Button>
          ))}
          <Button size="sm" variant="default" disabled={busy} onClick={chaosClear}>
            <RefreshCw className="w-3 h-3 mr-1" /> Clear chaos
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={busy}>
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Source Matrix (live + shadow, auto-refresh 5s)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Symbol</th>
                <th className="px-3 py-2 text-right font-medium">Live</th>
                <th className="px-3 py-2 text-right font-medium">Shadow</th>
                <th className="px-3 py-2 text-right font-medium">Drift</th>
                <th className="px-3 py-2 text-center font-medium">Quorum</th>
                {ALL_SOURCES.map(s => (
                  <th key={s} className="px-3 py-2 text-right font-medium">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(row => {
                const bySrc: Record<string, SourceCell | undefined> = {};
                for (const c of row.raw ?? []) bySrc[c.source] = c;
                const driftTone = (row.shadow_drift_bps ?? 0) < 5 ? "text-emerald-500"
                  : (row.shadow_drift_bps ?? 0) < 25 ? "text-amber-500" : "text-rose-500";
                return (
                  <tr key={row.symbol} className="border-t border-border/50">
                    <td className="px-3 py-2 font-mono text-xs">{row.symbol}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{Number(row.consensus).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">
                      {row.shadow_consensus != null ? Number(row.shadow_consensus).toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
                      {row.shadow_clamp_active && <Badge className="ml-1 bg-rose-500/15 text-rose-500 border-rose-500/30 text-[9px] px-1 py-0">CLAMP</Badge>}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono text-xs ${driftTone}`}>
                      {row.shadow_drift_bps != null ? `${row.shadow_drift_bps}bps` : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">{quorumBadge(row.quorum)}</td>
                    {ALL_SOURCES.map(s => {
                      const c = bySrc[s];
                      if (!c) return <td key={s} className="px-3 py-2 text-right text-xs text-muted-foreground/50">—</td>;
                      const included = (row.sources ?? []).includes(s);
                      return (
                        <td key={s} className={`px-3 py-2 text-right font-mono text-xs ${cellTone(c.age_s)} ${!included ? "opacity-40 line-through" : ""}`}>
                          <div>{Number(c.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}</div>
                          <div className="text-[10px]">{c.age_s}s</div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Weight editor dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing?.source} 가중치 조정</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Weight (0 ~ 1) — 현재 {editWeight.toFixed(2)}</Label>
              <Slider value={[editWeight]} min={0} max={1} step={0.05}
                      onValueChange={(v) => setEditWeight(v[0])} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs">Max lag (ms)</Label>
              <Input type="number" value={editLag} onChange={(e) => setEditLag(Number(e.target.value))}
                     min={500} max={30000} step={500} className="mt-1" />
              <div className="text-[10px] text-muted-foreground mt-1">이 값을 초과한 lag면 effective weight = 0</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>취소</Button>
            <Button onClick={saveWeight} disabled={busy}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OracleFortress;
