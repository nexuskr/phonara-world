/**
 * useDepositRealtime — crypto_deposit_intents UPDATE 구독.
 *
 * L1: 상태 우선순위 머지 (filled > expired).
 * A3: ownership verification (payload.new.user_id === session.user.id).
 * B3: replay protection (processedIntentIds Set, 모달 lifetime).
 * H-3: 10s 무이벤트 → confirming 상태 알림 (호출부에서 처리).
 * H-6: CHANNEL_ERROR / 30s 무이벤트 → degraded banner.
 */
import { useEffect, useRef, useState } from "react";
import { useRealtimeChannel, type ConnState } from "@/hooks/use-realtime-channel";
import { supabase } from "@/integrations/supabase/client";
import { shouldOverwriteStatus } from "../lib/depositValidators";
import type { CryptoDepositIntent } from "@/lib/phonaraPay";

interface Opts {
  intentId: string | null;
  active: boolean;
  onFilled: (row: CryptoDepositIntent) => void;
  onStatusUpdate?: (row: CryptoDepositIntent) => void;
}

export function useDepositRealtime({ intentId, active, onFilled, onStatusUpdate }: Opts) {
  const [conn, setConn] = useState<ConnState>("connecting");
  const [degraded, setDegraded] = useState(false);
  const processedRef = useRef<Set<string>>(new Set());
  const lastEventAtRef = useRef<number>(Date.now());
  const userIdRef = useRef<string | null>(null);
  const currentStatusRef = useRef<string>("intent_created");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { userIdRef.current = data.user?.id ?? null; });
  }, []);

  useRealtimeChannel({
    key: active && intentId ? `deposit:intent:${intentId}` : "",
    bindings: intentId ? [{ event: "UPDATE", schema: "public", table: "crypto_deposit_intents", filter: `id=eq.${intentId}` }] : [],
    enabled: active && !!intentId,
    onStatus: (s) => setConn(s),
    onEvent: (payload) => {
      lastEventAtRef.current = Date.now();
      setDegraded(false);
      const row = (payload as { new: CryptoDepositIntent }).new;
      if (!row) return;
      // A3 ownership verification
      if (userIdRef.current && row.user_id && row.user_id !== userIdRef.current) {
        // eslint-disable-next-line no-console
        console.warn("[useDepositRealtime] ownership mismatch — dropped");
        return;
      }
      // L1 priority merge
      if (!shouldOverwriteStatus(row.status, currentStatusRef.current)) return;
      currentStatusRef.current = row.status;
      if (row.status === "filled") {
        // B3 replay protection
        if (processedRef.current.has(row.id)) return;
        processedRef.current.add(row.id);
        onFilled(row);
      } else {
        onStatusUpdate?.(row);
      }
    },
    // polling은 호출부에서 별도 source-of-truth 로 처리
  });

  // H-6 degraded heartbeat: 30s 무이벤트 OR conn=down → degraded ON
  useEffect(() => {
    if (!active || !intentId) { setDegraded(false); return; }
    const t = window.setInterval(() => {
      const stale = Date.now() - lastEventAtRef.current > 30_000;
      setDegraded(conn === "down" || stale);
    }, 5_000);
    return () => clearInterval(t);
  }, [active, intentId, conn]);

  return { conn, degraded };
}
