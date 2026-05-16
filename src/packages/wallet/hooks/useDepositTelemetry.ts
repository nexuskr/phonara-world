/**
 * useDepositTelemetry — 6 events + session_funnel_id + abandon reason.
 * 모든 페이로드에 session_funnel_id 자동 첨부.
 */
import { useCallback, useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import { amountBand } from "../lib/depositValidators";

const KEY = "phonara:deposit_funnel_id:v1";

export type DepositMethodKind = "coin" | "bank" | "voucher";
export type AbandonReason = "close_button" | "backdrop" | "timeout" | "refresh" | "nav_away";

function getFunnelId(): string {
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    sessionStorage.setItem(KEY, fresh);
    return fresh;
  } catch {
    return crypto.randomUUID();
  }
}

function clearFunnelId() {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
}

export function useDepositTelemetry(open: boolean) {
  const funnelIdRef = useRef<string | null>(null);
  const intentCreatedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      funnelIdRef.current = getFunnelId();
      track("deposit_modal_open", { session_funnel_id: funnelIdRef.current });
    }
  }, [open]);

  const send = useCallback((event: string, props: Record<string, string | number | boolean | null | undefined> = {}) => {
    track(event, { ...props, session_funnel_id: funnelIdRef.current });
  }, []);

  const methodSelected = useCallback((method: DepositMethodKind) => {
    send("deposit_method_selected", { method });
  }, [send]);

  const submitClicked = useCallback((method: DepositMethodKind, amount: number) => {
    send("deposit_submit_clicked", { method, amount_band: amountBand(amount) });
  }, [send]);

  const intentCreated = useCallback((method: DepositMethodKind, intentId: string) => {
    intentCreatedAtRef.current = Date.now();
    send("deposit_intent_created", { method, intent_id: intentId });
  }, [send]);

  const filled = useCallback((method: DepositMethodKind) => {
    const elapsed = intentCreatedAtRef.current ? Date.now() - intentCreatedAtRef.current : null;
    send("deposit_filled", { method, elapsed_ms: elapsed });
    clearFunnelId();
  }, [send]);

  const abandon = useCallback((method: DepositMethodKind | null, step: 1 | 2 | 3, reason: AbandonReason) => {
    send("deposit_abandon", { method: method ?? "none", step, reason });
    clearFunnelId();
  }, [send]);

  return { methodSelected, submitClicked, intentCreated, filled, abandon };
}
