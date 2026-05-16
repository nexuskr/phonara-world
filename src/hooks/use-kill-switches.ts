/**
 * useKillSwitches — global subscription to platform_kill_switches.
 * Every authenticated user reads these flags so the UI can disable
 * trading/withdrawals or show a maintenance screen when the operator
 * flips them in /admin/ops/self-heal.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";
import { isCategoryPaused } from "@pkg/runtime";

export type KillSwitches = {
  trading_halt: boolean;
  withdrawals_halt: boolean;
  signup_halt: boolean;
  maintenance_mode: boolean;
  reasons: Partial<Record<keyof Omit<KillSwitches, "reasons">, string>>;
  loaded: boolean;
};

const DEFAULT: KillSwitches = {
  trading_halt: false,
  withdrawals_halt: false,
  signup_halt: false,
  maintenance_mode: false,
  reasons: {},
  loaded: false,
};

let cache: KillSwitches = DEFAULT;
const listeners = new Set<(s: KillSwitches) => void>();

function emit(next: KillSwitches) {
  cache = next;
  listeners.forEach((l) => l(next));
}

async function refresh() {
  // PR-H: skip while tab hidden or admin category paused (idle).
  if (typeof document !== "undefined" && document.hidden) return;
  if (isCategoryPaused("admin")) return;
  try {
    const { data, error } = await (supabase as any)
      .from("platform_kill_switches")
      .select("key, enabled, reason");
    if (error) throw error;
    const next: KillSwitches = { ...DEFAULT, loaded: true, reasons: {} };
    for (const row of data ?? []) {
      const k = row.key as keyof Omit<KillSwitches, "reasons" | "loaded">;
      if (k in next) {
        (next as any)[k] = !!row.enabled;
        if (row.enabled && row.reason) (next.reasons as any)[k] = row.reason;
      }
    }
    emit(next);
  } catch {
    emit({ ...cache, loaded: true });
  }
}

let subscribed = false;
function subscribeOnce() {
  if (subscribed) return;
  subscribed = true;
  refresh();
  try {
    const channel = (supabase as any)
      .channel("kill-switches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_kill_switches" },
        () => refresh(),
      )
      .subscribe();
    // Refresh every 60s as a safety net even if realtime drops.
    // setVisibleInterval(category="admin") pauses while tab hidden or governor-idle.
    const stop = setVisibleInterval(refresh, 60_000, {
      meta: { owner: "use-kill-switches", category: "admin" },
    });
    if (typeof window !== "undefined") {
      window.addEventListener("focus", refresh);
      (window as any).__killSwitchCleanup = () => {
        stop();
        window.removeEventListener("focus", refresh);
        try { (supabase as any).removeChannel(channel); } catch {}
      };
    }
  } catch {}
}

export function useKillSwitches(): KillSwitches {
  const [state, setState] = useState<KillSwitches>(cache);
  useEffect(() => {
    subscribeOnce();
    listeners.add(setState);
    setState(cache);
    return () => { listeners.delete(setState); };
  }, []);
  return state;
}
