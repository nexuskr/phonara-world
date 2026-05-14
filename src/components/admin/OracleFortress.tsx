import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Activity, Radio, AlertTriangle, RefreshCw } from "lucide-react";

type SourceCell = { source: string; price: number; age_s: number };
type Row = {
  symbol: string;
  consensus: number;
  quorum: number;
  divergence_bps: number | null;
  sources: string[] | null;
  consensus_age_s: number;
  raw: SourceCell[] | null;
};
type Health = {
  summary: { healthy: number; degraded: number; down: number; total: number };
  matrix: Row[];
};

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

export function OracleFortress() {
  const [data, setData] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_get_oracle_health" as any);
    if (error) {
      notify.error("오라클 상태 조회 실패", { description: error.message });
      return;
    }
    setData(data as unknown as Health);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
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

  if (loading) return <LoadingList rows={6} />;
  if (!data || !data.matrix?.length) return <EmptyState icon={<Activity className="w-6 h-6" />} title="오라클 데이터 없음" description="아직 합의된 심볼이 없습니다." />;

  const { summary, matrix } = data;

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
        <CardHeader><CardTitle className="text-sm">Source Matrix (auto-refresh 5s)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Symbol</th>
                <th className="px-3 py-2 text-right font-medium">Consensus</th>
                <th className="px-3 py-2 text-center font-medium">Quorum</th>
                <th className="px-3 py-2 text-right font-medium">Div(bps)</th>
                {ALL_SOURCES.map(s => (
                  <th key={s} className="px-3 py-2 text-right font-medium">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(row => {
                const bySrc: Record<string, SourceCell | undefined> = {};
                for (const c of row.raw ?? []) bySrc[c.source] = c;
                return (
                  <tr key={row.symbol} className="border-t border-border/50">
                    <td className="px-3 py-2 font-mono text-xs">{row.symbol}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs">{Number(row.consensus).toLocaleString(undefined, { maximumFractionDigits: 6 })}</td>
                    <td className="px-3 py-2 text-center">{quorumBadge(row.quorum)}</td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-muted-foreground">{row.divergence_bps ?? "—"}</td>
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
    </div>
  );
}

export default OracleFortress;
