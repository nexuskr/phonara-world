/**
 * Realtime bus — dedupes supabase channels.
 *
 * If two components subscribe to the same (channel, table, event, filter)
 * combo, only one underlying channel is opened and callbacks are fanned out.
 *
 * Usage:
 *   const off = subscribePostgres({
 *     key: "fomo:user:" + uid,
 *     table: "fomo_notifications",
 *     event: "INSERT",
 *     filter: `user_id=eq.${uid}`,
 *   }, (payload) => { ... });
 *   // later: off()
 */
import { supabase } from "@/integrations/supabase/client";

type PgEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

interface SubKey {
  key: string;
  table: string;
  event?: PgEvent;
  schema?: string;
  filter?: string;
}

interface ChannelEntry {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<(payload: unknown) => void>;
}

const channels = new Map<string, ChannelEntry>();

export function subscribePostgres(
  { key, table, event = "*", schema = "public", filter }: SubKey,
  onChange: (payload: unknown) => void,
): () => void {
  let entry = channels.get(key);
  if (!entry) {
    const ch = supabase
      .channel(key)
      .on(
        // @ts-ignore - supabase realtime typing
        "postgres_changes",
        { event, schema, table, ...(filter ? { filter } : {}) },
        (payload: unknown) => {
          const e = channels.get(key);
          if (!e) return;
          e.listeners.forEach((l) => {
            try { l(payload); } catch { /* swallow */ }
          });
        },
      )
      .subscribe();
    entry = { channel: ch, listeners: new Set() };
    channels.set(key, entry);
  }
  entry.listeners.add(onChange);
  return () => {
    const e = channels.get(key);
    if (!e) return;
    e.listeners.delete(onChange);
    if (e.listeners.size === 0) {
      void supabase.removeChannel(e.channel);
      channels.delete(key);
    }
  };
}
