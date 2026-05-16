/**
 * Admin · Realtime Region Health (PR-O)
 * AAL2 gated. Renders 3-region matrix with last-5min metrics + failover pin.
 */
import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingList } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { notify } from "@/lib/notify";
import { supabase } from "@/integrations/supabase/client";
import { setRegion, getRegion, type RealtimeRegion } from "@pkg/realtime";
import { Globe, Zap, AlertTriangle } from "lucide-react";

type Row = {
  region: RealtimeRegion;
  active_users: number;
  samples: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  last_sample_at: string | null;
};

const REGION_LABEL: Record<RealtimeRegion, string> = {
  ap: "Asia-Pacific",
  us: "Americas",
  eu: "Europe / EMEA",
};

function latencyTone(ms: number): { tone: string; text: string } {
  if (ms === 0) return { tone: "bg-muted text-muted-foreground", text: "no data" };
  if (ms < 200) return { tone: "bg-emerald-500/15 text-emerald-400", text: "fast" };
  if (ms < 600) return { tone: "bg-yellow-500/15 text-yellow-400", text: "ok" };
  return { tone: "bg-red-500/15 text-red-400", text: "slow" };
}

export default function RegionHealth() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pinning, setPinning] = useState<RealtimeRegion | "auto" | null>(null);
  const myRegion = getRegion();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_get_realtime_region_health");
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      notify.error("리전 헬스 조회 실패", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  const pinRegion = async (target: RealtimeRegion | "auto") => {
    setPinning(target);
    try {
      const { error } = await supabase.rpc("admin_broadcast_region_failover", {
        _target_region: target,
        _reason: target === "auto" ? "admin: auto" : `admin: pin ${target}`,
      });
      if (error) throw error;
      if (target !== "auto") {
        setRegion(target);
        notify.success(`리전 강제 라우팅: ${target.toUpperCase()}`, {
          description: "본 세션은 즉시 적용, 타 사용자는 다음 채널 마운트 시 반영됩니다.",
        });
      } else {
        setRegion(null);
        notify.success("자동 리전 복귀", { description: "휴리스틱 라우팅으로 돌아갑니다." });
      }
      await load();
    } catch (e) {
      notify.error("Failover 실패", { description: (e as Error).message });
    } finally {
      setPinning(null);
    }
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="w-4 h-4 text-primary" />
          Realtime Region Health
          <Badge variant="outline" className="ml-2 text-[10px]">last 5min · 15s refresh</Badge>
          <Badge className="ml-auto bg-primary/15 text-primary text-[10px]">
            this session: {myRegion.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && !rows ? (
          <LoadingList rows={3} />
        ) : !rows || rows.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="w-5 h-5" />}
            title="아직 샘플이 없습니다"
            description="사용자가 realtime 채널을 마운트하면 자동으로 누적됩니다."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rows.map((r) => {
                const tone = latencyTone(Number(r.avg_latency_ms));
                return (
                  <div
                    key={r.region}
                    className="rounded-xl border border-border/40 p-4 space-y-2 bg-card/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-display font-black text-lg">
                        {r.region.toUpperCase()}
                      </div>
                      <Badge className={tone.tone}>{tone.text}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {REGION_LABEL[r.region]}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <div className="text-muted-foreground">활성 사용자</div>
                        <div className="font-mono text-sm">{r.active_users}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">샘플</div>
                        <div className="font-mono text-sm">{r.samples}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">평균 latency</div>
                        <div className="font-mono text-sm">{Number(r.avg_latency_ms).toFixed(0)}ms</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">p95</div>
                        <div className="font-mono text-sm">{Number(r.p95_latency_ms).toFixed(0)}ms</div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={myRegion === r.region ? "secondary" : "outline"}
                      className="w-full mt-2 h-8 text-xs"
                      disabled={pinning !== null}
                      onClick={() => pinRegion(r.region)}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      {pinning === r.region ? "적용중…" : `이 리전으로 고정`}
                    </Button>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <div className="text-xs text-muted-foreground">
                관리자 고정은 모든 신규 채널에 반영됩니다 (기존 활성 채널은 재마운트 시).
              </div>
              <Button
                size="sm"
                variant="ghost"
                disabled={pinning !== null}
                onClick={() => pinRegion("auto")}
              >
                자동 복귀
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
