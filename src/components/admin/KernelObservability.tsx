import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { Activity, AlertTriangle, RefreshCw, Search, Timer, TrendingDown } from "lucide-react";

type Summary = {
  inflight_total: number;
  inflight_expired: number;
  success_24h: number;
  failed_24h: number;
  failure_rate_24h: number;
  top_errors_24h: { code: string; cnt: number }[];
  reclaimed_24h: number;
  generated_at: string;
};

type Inflight = {
  client_request_id: string;
  user_id: string;
  lease_owner: string | null;
  lease_until: string;
  created_at: string;
  seconds_to_expire: number;
  is_expired: boolean;
  params_hash: string | null;
};

type AuditRow = {
  id: string;
  user_id: string;
  client_request_id: string | null;
  outcome: string;
  error_code: string | null;
  oracle_snapshot: any;
  position_id: string | null;
  entry_price: number | null;
  request_meta: any;
  created_at: string;
};

export default function KernelObservability() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [inflight, setInflight] = useState<Inflight[] | null>(null);
  const [audit, setAudit] = useState<AuditRow[] | null>(null);
  const [drift, setDrift] = useState<{ bucket_hour: string; error_code: string; cnt: number }[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOutcome, setFilterOutcome] = useState<"" | "success" | "failed">("failed");
  const [filterCode, setFilterCode] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const [s, i, d] = await Promise.all([
      supabase.rpc("admin_get_kernel_summary" as any),
      supabase.rpc("admin_get_kernel_inflight" as any, { _limit: 100 }),
      supabase.rpc("admin_get_kernel_drift_24h" as any),
    ]);
    if (s.error) notify.error(s.error.message); else setSummary(s.data as any);
    if (i.error) notify.error(i.error.message); else setInflight((i.data as any) ?? []);
    if (d.error) notify.error(d.error.message); else setDrift((d.data as any) ?? []);
    setLoading(false);
  };

  const loadAudit = async () => {
    const { data, error } = await supabase.rpc("admin_search_kernel_audit" as any, {
      _outcome: filterOutcome || null,
      _error_code: filterCode || null,
      _limit: 100,
    });
    if (error) { notify.error(error.message); return; }
    setAudit((data as any) ?? []);
  };

  useEffect(() => { void loadAll(); void loadAudit(); }, []);
  useEffect(() => {
    const id = setInterval(() => { void loadAll(); }, 15000);
    return () => clearInterval(id);
  }, []);

  const driftAggregated = useMemo(() => {
    if (!drift) return [];
    const map = new Map<string, number>();
    for (const r of drift) map.set(r.error_code, (map.get(r.error_code) ?? 0) + Number(r.cnt));
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [drift]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-imperial text-lg tracking-wide">Kernel Observability (v3.2)</h2>
        </div>
        <Button variant="outline" size="sm" onClick={() => { void loadAll(); void loadAudit(); }}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> 새로고침
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="In-flight (reserved)"
          value={summary?.inflight_total ?? "—"}
          accent={summary && summary.inflight_expired > 0 ? "danger" : "default"}
          icon={<Timer className="w-4 h-4" />}
          sub={summary ? `expired: ${summary.inflight_expired}` : undefined}
        />
        <KpiCard
          label="Success 24h"
          value={summary?.success_24h ?? "—"}
          accent="success"
          icon={<Activity className="w-4 h-4" />}
        />
        <KpiCard
          label="Failed 24h"
          value={summary?.failed_24h ?? "—"}
          accent={summary && summary.failed_24h > 0 ? "warning" : "default"}
          icon={<AlertTriangle className="w-4 h-4" />}
          sub={summary ? `rate ${(Number(summary.failure_rate_24h) * 100).toFixed(2)}%` : undefined}
        />
        <KpiCard
          label="Reclaimed 24h"
          value={summary?.reclaimed_24h ?? "—"}
          accent={summary && summary.reclaimed_24h > 0 ? "warning" : "default"}
          icon={<TrendingDown className="w-4 h-4" />}
        />
      </div>

      {/* Drift counters */}
      <Card className="p-4 glass">
        <h3 className="text-sm font-bold mb-3 break-keep">에러코드 분포 (24h)</h3>
        {loading && !drift ? <LoadingList rows={3} /> :
          driftAggregated.length === 0 ? <EmptyState title="실패 없음" description="지난 24시간 동안 커널 실패 0건." /> : (
          <div className="flex flex-wrap gap-2">
            {driftAggregated.map(([code, cnt]) => (
              <Badge key={code} variant="outline" className="text-xs">
                <span className="font-mono">{code}</span>
                <span className="ml-1.5 text-primary font-bold">{cnt}</span>
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {/* In-flight table */}
      <Card className="p-4 glass">
        <h3 className="text-sm font-bold mb-3 break-keep">진행 중 의도 (reserved)</h3>
        {loading && !inflight ? <LoadingList rows={3} /> :
          (inflight ?? []).length === 0 ? <EmptyState title="조용함" description="현재 진행 중인 포지션 개시 요청 없음." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-1.5 px-2">crid</th>
                  <th className="text-left py-1.5 px-2">user</th>
                  <th className="text-right py-1.5 px-2">lease</th>
                  <th className="text-left py-1.5 px-2">상태</th>
                </tr>
              </thead>
              <tbody>
                {(inflight ?? []).map((r) => (
                  <tr key={r.client_request_id} className="border-t border-border/40">
                    <td className="py-1.5 px-2 font-mono">{r.client_request_id.slice(0, 8)}…</td>
                    <td className="py-1.5 px-2 font-mono">{r.user_id.slice(0, 8)}…</td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {r.is_expired
                        ? <span className="text-destructive font-bold">EXPIRED ({Math.abs(r.seconds_to_expire)}s)</span>
                        : <span className={r.seconds_to_expire < 5 ? "text-warning" : "text-muted-foreground"}>{r.seconds_to_expire}s</span>}
                    </td>
                    <td className="py-1.5 px-2">
                      {r.is_expired
                        ? <Badge variant="destructive" className="text-[10px]">stuck</Badge>
                        : <Badge variant="secondary" className="text-[10px]">live</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Audit search */}
      <Card className="p-4 glass">
        <h3 className="text-sm font-bold mb-3 break-keep">감사 로그 검색</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            className="bg-background border border-border rounded-md text-xs px-2 py-1.5"
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value as any)}
          >
            <option value="">전체</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
          </select>
          <Input
            value={filterCode}
            onChange={(e) => setFilterCode(e.target.value)}
            placeholder="error_code (예: price_moved_resync)"
            className="text-xs h-8 w-72"
          />
          <Button size="sm" onClick={() => void loadAudit()}>
            <Search className="w-3.5 h-3.5 mr-1" /> 검색
          </Button>
        </div>

        {audit === null ? <LoadingList rows={3} /> :
          audit.length === 0 ? <EmptyState title="결과 없음" description="조건에 맞는 감사 로그가 없습니다." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-left py-1.5 px-2">시각</th>
                  <th className="text-left py-1.5 px-2">결과</th>
                  <th className="text-left py-1.5 px-2">에러</th>
                  <th className="text-left py-1.5 px-2">user</th>
                  <th className="text-left py-1.5 px-2">crid</th>
                  <th className="text-right py-1.5 px-2">entry</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id} className="border-t border-border/40">
                    <td className="py-1.5 px-2 font-mono text-muted-foreground">
                      {new Date(a.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-1.5 px-2">
                      {a.outcome === "success"
                        ? <Badge variant="secondary" className="text-[10px] text-success">success</Badge>
                        : <Badge variant="destructive" className="text-[10px]">failed</Badge>}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-warning">{a.error_code ?? "—"}</td>
                    <td className="py-1.5 px-2 font-mono">{a.user_id.slice(0, 8)}…</td>
                    <td className="py-1.5 px-2 font-mono">{a.client_request_id?.slice(0, 8) ?? "—"}…</td>
                    <td className="py-1.5 px-2 text-right font-mono">{a.entry_price ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {summary && (
        <p className="text-[10px] text-muted-foreground text-right">
          updated {new Date(summary.generated_at).toLocaleTimeString()} · 15s auto
        </p>
      )}
    </div>
  );
}

function KpiCard({
  label, value, accent = "default", icon, sub,
}: {
  label: string;
  value: number | string;
  accent?: "default" | "success" | "warning" | "danger";
  icon?: React.ReactNode;
  sub?: string;
}) {
  const tone =
    accent === "danger"  ? "border-destructive/50 text-destructive" :
    accent === "warning" ? "border-warning/50 text-warning" :
    accent === "success" ? "border-success/40 text-success" :
                           "border-border text-foreground";
  return (
    <Card className={`p-3 glass border ${tone}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-imperial text-2xl">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}
