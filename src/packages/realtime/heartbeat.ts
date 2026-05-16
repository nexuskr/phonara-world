/**
 * @pkg/realtime/heartbeat — region latency telemetry (PR-O)
 *
 * Fire-and-forget: 각 채널이 처음 `live` 상태에 도달할 때 한 번,
 * (subscribe 시작 → SUBSCRIBED) 경과 ms를 `record_realtime_heartbeat` RPC로 기록.
 * 실패는 조용히 무시 (관측 외엔 사용자 흐름 영향 0).
 *
 * 추가 가드:
 *  - per-channel 1회만 보고
 *  - 전역 60s 디바운스 (스팸 방지)
 *  - SSR safe
 *  - 가시 텍스트 없음 → i18n 게이트 대상 아님
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeRegion } from "./regions";

type Partition = "wallet" | "game" | "chat" | "market";

const REPORTED = new Set<string>();
let lastSentAt = 0;
const MIN_INTERVAL_MS = 60_000;

export function reportHeartbeat(
  channelKey: string,
  region: RealtimeRegion,
  partition: Partition,
  latencyMs: number,
): void {
  if (typeof window === "undefined") return;
  if (REPORTED.has(channelKey)) return;
  const now = Date.now();
  if (now - lastSentAt < MIN_INTERVAL_MS) return;
  if (!Number.isFinite(latencyMs) || latencyMs < 0 || latencyMs >= 60_000) return;

  REPORTED.add(channelKey);
  lastSentAt = now;

  // Fire-and-forget — never await, never throw
  Promise.resolve().then(async () => {
    try {
      await supabase.rpc("record_realtime_heartbeat", {
        _region: region,
        _partition: partition,
        _latency_ms: Math.round(latencyMs),
      });
    } catch {
      /* silent */
    }
  });
}
