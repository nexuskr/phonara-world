// PR-P0-5 — Realtime Status card (admin / Health Dock)
//
// 활성 realtime 채널 수, 누적 재구독, 현재 region, 마지막 failover 시각.
// 15s 자동 갱신. 머니플로 무관, 관측 전용.

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getRealtimeStats, getFailoverState } from "@pkg/realtime";

function fmtRelative(ts: number): string {
  if (!ts) return "—";
  const sec = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  return `${Math.round(sec / 3600)}h ago`;
}

export function RealtimeStatusCard() {
  const [stats, setStats] = useState(() => getRealtimeStats());
  const [fover, setFover] = useState(() => getFailoverState());

  useEffect(() => {
    const id = window.setInterval(() => {
      setStats(getRealtimeStats());
      setFover(getFailoverState());
    }, 15_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Realtime Status</span>
          <span className="flex gap-2">
            <Badge variant="outline">{stats.activeChannels} active</Badge>
            {stats.idlePausedChannels > 0 && (
              <Badge variant="outline">{stats.idlePausedChannels} idle</Badge>
            )}
            <Badge variant="outline">region {fover.region}</Badge>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-muted-foreground">활성 채널</div>
            <div className="font-mono text-sm">{stats.activeChannels}</div>
          </div>
          <div>
            <div className="text-muted-foreground">idle paused</div>
            <div className="font-mono text-sm">{stats.idlePausedChannels}</div>
          </div>
          <div>
            <div className="text-muted-foreground">누적 재구독</div>
            <div className="font-mono text-sm">{stats.totalReconnects}</div>
          </div>
          <div>
            <div className="text-muted-foreground">마지막 재구독</div>
            <div className="font-mono text-sm">{fmtRelative(stats.lastReconnectAt)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">현재 region</div>
            <div className="font-mono text-sm">{fover.region}</div>
          </div>
          <div>
            <div className="text-muted-foreground">failover 횟수</div>
            <div className="font-mono text-sm">{fover.attempts}</div>
          </div>
          <div>
            <div className="text-muted-foreground">마지막 failover</div>
            <div className="font-mono text-sm">{fmtRelative(fover.lastFailoverAt)}</div>
          </div>
        </div>
        <p className="text-muted-foreground pt-2 border-t border-border/40">
          채널 5회 연속 down 시 자동 region 회전 (30s cooldown). 백그라운드 탭 5분+ 시 채널 일시 해제, 가시 복귀 시 자동 재구독.
        </p>
      </CardContent>
    </Card>
  );
}
