import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FOMO_POLL_MS } from "@/lib/fomo";
import { useDocumentVisible } from "@/lib/util/visible-interval";

export type LiveFomoCounters = {
  withdrawing_now: number;
  trading_now: number;
  founding_seat_contenders: number;
  online_now: number;
};

// Module-level cache so multiple consumers (Dashboard/BetPanel) share a single 15s timer.
let _cached: LiveFomoCounters | null = null;
let _lastFetch = 0;
let _inflight: Promise<LiveFomoCounters | null> | null = null;
const _subs = new Set<(v: LiveFomoCounters) => void>();

async function fetchOnce(): Promise<LiveFomoCounters | null> {
  if (_inflight) return _inflight;
  _inflight = (async () => {
    try {
      const { data, error } = await supabase.rpc("get_live_fomo_counters" as any);
      if (error) return _cached;
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) return _cached;
      const next: LiveFomoCounters = {
        withdrawing_now: Number(row.withdrawing_now ?? 0),
        trading_now: Number(row.trading_now ?? 0),
        founding_seat_contenders: Number(row.founding_seat_contenders ?? 0),
        online_now: Number(row.online_now ?? 0),
      };
      _cached = next;
      _lastFetch = Date.now();
      _subs.forEach((cb) => cb(next));
      return next;
    } finally {
      _inflight = null;
    }
  })();
  return _inflight;
}

export function useLiveFomoCounters(): LiveFomoCounters | null {
  const [state, setState] = useState<LiveFomoCounters | null>(_cached);
  const visible = useDocumentVisible();
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;
    const sub = (v: LiveFomoCounters) => { if (!stoppedRef.current) setState(v); };
    _subs.add(sub);
    // Initial fetch (respect cache freshness)
    if (!_cached || Date.now() - _lastFetch > FOMO_POLL_MS) void fetchOnce();
    return () => {
      stoppedRef.current = true;
      _subs.delete(sub);
    };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = window.setInterval(() => { void fetchOnce(); }, FOMO_POLL_MS);
    return () => window.clearInterval(id);
  }, [visible]);

  return state;
}
