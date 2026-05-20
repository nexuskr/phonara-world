// PR-P0-6: Unified push subscription hook.
// Wraps lib/push with the VAPID rotation guard and the local daily-cap mirror.

import { useCallback, useEffect, useState } from "react";
import {
  VAPID_PUBLIC_KEY,
  getPushPermission,
  isPushActive,
  isPushSupported,
  subscribePush,
  unsubscribePush,
} from "@/lib/push";
import { ensureVapidConsistent, rememberVapidKey } from "@/lib/push/pushVapidGuard";
import {
  getDailyPushCap,
  getPushReceivedToday,
  isPushCapped,
  pruneOldPushCounters,
  recordPushReceived,
} from "@/lib/push/pushRateLimit";

type Perm = NotificationPermission | "unsupported";

export interface PushSubscriptionState {
  supported: boolean;
  permission: Perm;
  active: boolean;
  loading: boolean;
  capped: boolean;
  receivedToday: number;
  dailyCap: number;
}

export function usePushSubscription() {
  const [state, setState] = useState<PushSubscriptionState>(() => ({
    supported: isPushSupported(),
    permission: isPushSupported() ? "default" : "unsupported",
    active: false,
    loading: true,
    capped: false,
    receivedToday: 0,
    dailyCap: getDailyPushCap(),
  }));

  const refresh = useCallback(async () => {
    const supported = isPushSupported();
    if (!supported) {
      setState((s) => ({ ...s, supported: false, permission: "unsupported", active: false, loading: false }));
      return;
    }
    const [perm, active] = await Promise.all([getPushPermission(), isPushActive()]);
    setState((s) => ({
      ...s,
      supported: true,
      permission: perm,
      active,
      loading: false,
      capped: isPushCapped(),
      receivedToday: getPushReceivedToday(),
    }));
  }, []);

  // Mount: prune old counters, run VAPID guard silently, refresh state.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      pruneOldPushCounters();
      if (isPushSupported()) {
        await ensureVapidConsistent(VAPID_PUBLIC_KEY);
      }
      if (!cancelled) await refresh();
    })();
    return () => { cancelled = true; };
  }, [refresh]);

  // SW → page bridge: count received pushes for local cap UX.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (ev: MessageEvent) => {
      const d = ev.data;
      if (!d || typeof d !== "object") return;
      if (d.type === "push-received") {
        const n = recordPushReceived();
        setState((s) => ({ ...s, receivedToday: n, capped: n >= s.dailyCap }));
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const enable = useCallback(async (): Promise<{ ok: boolean; reason?: string }> => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await ensureVapidConsistent(VAPID_PUBLIC_KEY);
      const res = await subscribePush();
      if (res.ok) await rememberVapidKey(VAPID_PUBLIC_KEY);
      await refresh();
      return res;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await unsubscribePush();
      await refresh();
      return res;
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  }, [refresh]);

  return { ...state, enable, disable, refresh };
}
