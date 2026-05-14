/**
 * useRealtimeChannel — idempotent Supabase realtime subscription
 *
 * Generalizes the useMyPower pattern so any component can attach to a
 * postgres_changes channel without worrying about:
 *  - React StrictMode double-mount creating duplicate subscriptions
 *  - Route transitions leaving dangling listeners
 *  - removeChannel firing before SUBSCRIBED ack (dangling handler)
 *
 * Channels are keyed by a caller-supplied string. All consumers with the
 * same key share ONE supabase channel; when the last consumer unmounts,
 * the channel is torn down (deferred until after the SUBSCRIBED ack so
 * pending listeners are never leaked).
 *
 * Usage:
 *   useRealtimeChannel({
 *     key: `wallet:${uid}`,
 *     bindings: [
 *       { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${uid}` },
 *     ],
 *     onEvent: (payload) => { ... },
 *     enabled: !!uid,
 *   });
 *
 * Debug logs gated behind localStorage `phonara:debug-realtime=1` (always on in DEV).
 */
import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ChannelBinding = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  table: string;
  filter?: string;
};

type Listener = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;

interface Entry {
  key: string;
  channel: ReturnType<typeof supabase.channel> | null;
  listeners: Map<string, Listener>;
  status: "subscribing" | "subscribed" | "removed";
  pendingRemove: boolean;
  events: number;
}

const REGISTRY = new Map<string, Entry>();
let __counter = 0;

function dbg(...args: unknown[]) {
  try {
    const on = (import.meta as any).env?.DEV || localStorage.getItem("phonara:debug-realtime") === "1";
    if (on) {
      // eslint-disable-next-line no-console
      console.debug("[useRealtimeChannel]", ...args);
    }
  } catch { /* noop */ }
}

function ensureChannel(key: string, bindings: ChannelBinding[]): Entry {
  const existing = REGISTRY.get(key);
  if (existing && existing.status !== "removed") return existing;

  const entry: Entry = {
    key,
    channel: null,
    listeners: new Map(),
    status: "subscribing",
    pendingRemove: false,
    events: 0,
  };
  REGISTRY.set(key, entry);

  let ch = supabase.channel(key);
  for (const b of bindings) {
    ch = ch.on(
      "postgres_changes" as any,
      { event: b.event, schema: b.schema ?? "public", table: b.table, filter: b.filter },
      (payload: any) => {
        const cur = REGISTRY.get(key);
        if (!cur || cur.status === "removed") return;
        cur.events++;
        dbg(key, "event #", cur.events, "fanout →", cur.listeners.size);
        cur.listeners.forEach((l) => { try { l(payload); } catch { /* swallow */ } });
      },
    );
  }
  entry.channel = ch;
  dbg(key, "subscribe");

  ch.subscribe((status: string) => {
    const cur = REGISTRY.get(key);
    if (!cur) return;
    dbg(key, "status", status);
    if (status === "SUBSCRIBED") {
      cur.status = "subscribed";
      if (cur.pendingRemove && cur.listeners.size === 0) teardown(key, "post-subscribe pending");
    }
  });

  return entry;
}

function teardown(key: string, reason: string) {
  const e = REGISTRY.get(key);
  if (!e) return;
  if (e.status === "subscribing") {
    e.pendingRemove = true;
    dbg(key, "teardown deferred —", reason);
    return;
  }
  if (e.channel) {
    try { void supabase.removeChannel(e.channel); dbg(key, "removeChannel ✓ —", reason); }
    catch (err) { dbg(key, "removeChannel error", err); }
  }
  e.status = "removed";
  e.channel = null;
  REGISTRY.delete(key);
}

export interface UseRealtimeChannelOpts {
  /** Stable channel key; consumers sharing the same key share one channel. */
  key: string;
  /** Postgres-changes bindings; only used on first subscriber per key. */
  bindings: ChannelBinding[];
  /** Fired for every matching event. Latest closure is always called. */
  onEvent: Listener;
  /** Skip subscribing while false; tearing down if already attached. */
  enabled?: boolean;
}

export function useRealtimeChannel({ key, bindings, onEvent, enabled = true }: UseRealtimeChannelOpts) {
  // Stable per-mount instance id so attach/detach refcount is correct under StrictMode.
  const idRef = useRef<string>("");
  if (!idRef.current) idRef.current = `rch-${++__counter}-${Date.now().toString(36)}`;

  // Always call the latest onEvent closure without re-subscribing.
  const cbRef = useRef<Listener>(onEvent);
  useEffect(() => { cbRef.current = onEvent; }, [onEvent]);

  // Bindings are intentionally captured on first subscribe (per key). Stringify so
  // changes to filter/table re-key naturally via the consumer side.
  const bindingsKey = JSON.stringify(bindings);

  useEffect(() => {
    if (!enabled || !key) return;
    const entry = ensureChannel(key, bindings);
    const id = idRef.current;
    const listener: Listener = (p) => { try { cbRef.current(p); } catch { /* noop */ } };
    entry.listeners.set(id, listener);
    entry.pendingRemove = false;
    dbg(key, "attach", id, "listeners=", entry.listeners.size);

    return () => {
      const cur = REGISTRY.get(key);
      if (!cur) return;
      cur.listeners.delete(id);
      dbg(key, "detach", id, "listeners=", cur.listeners.size);
      if (cur.listeners.size === 0) teardown(key, "last consumer left");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, bindingsKey]);
}
