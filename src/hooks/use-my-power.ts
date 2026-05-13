/**
 * useMyPower — Cosmic Emperor V3
 * Returns { phon, nfts, boostPct, maxLeverage, nextThreshold } with realtime
 * updates on phon_balances and nft_collection.
 *
 * Subscription contract (idempotent):
 *  - One supabase channel per (userId) is shared across ALL component instances
 *    via a module-level registry. React StrictMode double-mounts and route
 *    transitions cannot create duplicate channels.
 *  - Each consumer gets a stable instanceKey (useRef) so we can refcount
 *    safely even if the SAME hook mounts twice.
 *  - Cleanup is async-safe: if a teardown is requested before SUBSCRIBED,
 *    we mark the entry pending-removal and removeChannel only after the
 *    subscribe lifecycle has acked, preventing dangling listeners.
 *  - Debug logs are gated behind localStorage `phonara:debug-power=1`
 *    (and always-on in dev) so we can trace channel name, subscribe/remove
 *    transitions, and event-trigger counts when issues recur.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NFTRow {
  id: string;
  type: "crown" | "emperor" | "founder";
  level: "bronze" | "gold" | "diamond";
  boost_pct: number;
  source: string;
  created_at: string;
}

export interface NextThreshold {
  next_level: "gold" | "diamond" | null;
  usdt_needed: number;
  krw_needed: number;
}

export interface PowerState {
  phon: number;
  nfts: NFTRow[];
  boostPct: number;
  maxLeverage: number;
  nextThreshold: NextThreshold | null;
  loading: boolean;
  refresh: () => void;
}

const TIER_RANK: Record<NFTRow["level"], number> = { bronze: 1, gold: 2, diamond: 3 };

export function topNftLevel(nfts: NFTRow[]): NFTRow["level"] | null {
  if (!nfts.length) return null;
  return nfts.reduce((acc, n) => (TIER_RANK[n.level] > TIER_RANK[acc] ? n.level : acc), nfts[0].level);
}

// ---------- debug ----------
function dbg(...args: unknown[]) {
  try {
    const on = (import.meta as any).env?.DEV || localStorage.getItem("phonara:debug-power") === "1";
    if (on) {
      // eslint-disable-next-line no-console
      console.debug("[useMyPower]", ...args);
    }
  } catch { /* noop */ }
}

// ---------- channel registry (singleton per uid) ----------
type Listener = (kind: "phon" | "nft") => void;

interface Entry {
  uid: string;
  channelName: string;
  channel: ReturnType<typeof supabase.channel> | null;
  listeners: Map<string, Listener>;     // instanceKey -> listener
  status: "idle" | "subscribing" | "subscribed" | "removed";
  pendingRemove: boolean;
  events: number;                       // event-trigger count
}

const REGISTRY = new Map<string, Entry>();

function ensureChannel(uid: string): Entry {
  let e = REGISTRY.get(uid);
  if (e && e.status !== "removed") return e;

  const channelName = `my-power:${uid}`;
  e = {
    uid,
    channelName,
    channel: null,
    listeners: new Map(),
    status: "subscribing",
    pendingRemove: false,
    events: 0,
  };
  REGISTRY.set(uid, e);

  const ch = supabase.channel(channelName);
  e.channel = ch;
  dbg("subscribe →", channelName);

  ch.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "phon_balances", filter: `user_id=eq.${uid}` },
    () => {
      const cur = REGISTRY.get(uid);
      if (!cur || cur.status === "removed") return;
      cur.events++;
      dbg(channelName, "phon event #", cur.events, "fanout →", cur.listeners.size);
      cur.listeners.forEach((l) => { try { l("phon"); } catch { /* swallow */ } });
    },
  ).on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "nft_collection", filter: `user_id=eq.${uid}` },
    () => {
      const cur = REGISTRY.get(uid);
      if (!cur || cur.status === "removed") return;
      cur.events++;
      dbg(channelName, "nft event #", cur.events, "fanout →", cur.listeners.size);
      cur.listeners.forEach((l) => { try { l("nft"); } catch { /* swallow */ } });
    },
  ).subscribe((status: string) => {
    const cur = REGISTRY.get(uid);
    if (!cur) return;
    dbg(channelName, "status", status);
    if (status === "SUBSCRIBED") {
      cur.status = "subscribed";
      // Honor a teardown that arrived before SUBSCRIBED ack.
      if (cur.pendingRemove && cur.listeners.size === 0) {
        teardown(uid, "post-subscribe pending");
      }
    }
  });

  return e;
}

function teardown(uid: string, reason: string) {
  const e = REGISTRY.get(uid);
  if (!e) return;
  if (e.status === "subscribing") {
    // Defer until SUBSCRIBED ack to avoid dangling handlers.
    e.pendingRemove = true;
    dbg(e.channelName, "teardown deferred (still subscribing) —", reason);
    return;
  }
  if (e.channel) {
    try {
      void supabase.removeChannel(e.channel);
      dbg(e.channelName, "removeChannel ✓ —", reason);
    } catch (err) {
      dbg(e.channelName, "removeChannel error", err);
    }
  }
  e.status = "removed";
  e.channel = null;
  REGISTRY.delete(uid);
}

function attach(uid: string, instanceKey: string, listener: Listener) {
  const e = ensureChannel(uid);
  e.listeners.set(instanceKey, listener);
  e.pendingRemove = false; // a new consumer cancels any pending teardown
  dbg(e.channelName, "attach", instanceKey, "listeners=", e.listeners.size);
}

function detach(uid: string, instanceKey: string) {
  const e = REGISTRY.get(uid);
  if (!e) return;
  e.listeners.delete(instanceKey);
  dbg(e.channelName, "detach", instanceKey, "listeners=", e.listeners.size);
  if (e.listeners.size === 0) teardown(uid, "last consumer left");
}

// ---------- hook ----------
let __instanceCounter = 0;

export function useMyPower(): PowerState {
  const [phon, setPhon] = useState(0);
  const [nfts, setNfts] = useState<NFTRow[]>([]);
  const [boostPct, setBoostPct] = useState(0);
  const [maxLeverage, setMaxLeverage] = useState(10);
  const [nextThreshold, setNextThreshold] = useState<NextThreshold | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Stable per-mount key — survives StrictMode double-mount cycles cleanly.
  const instanceKeyRef = useRef<string>("");
  if (!instanceKeyRef.current) instanceKeyRef.current = `pwr-${++__instanceCounter}-${Date.now().toString(36)}`;

  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const fetchAll = useCallback(async () => {
    const { data: ses } = await supabase.auth.getSession();
    const uid = ses?.session?.user?.id ?? null;
    if (!aliveRef.current) return;
    setUserId(uid);
    if (!uid) {
      setPhon(0); setNfts([]); setBoostPct(0); setMaxLeverage(10); setNextThreshold(null);
      setLoading(false);
      return;
    }
    const [{ data: bal }, { data: nftRows }, { data: boost }, { data: lev }, { data: nx }] = await Promise.all([
      supabase.rpc("get_phon_balance"),
      supabase.rpc("get_my_nft_collection"),
      supabase.rpc("get_my_total_boost_pct"),
      supabase.rpc("get_my_max_leverage"),
      supabase.rpc("get_next_nft_threshold"),
    ]);
    if (!aliveRef.current) return;
    setPhon(Number(bal ?? 0));
    setNfts((nftRows as any) || []);
    setBoostPct(Number(boost ?? 0));
    setMaxLeverage(Number(lev ?? 10));
    setNextThreshold((nx as any) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // Idempotent realtime attach per (uid, instanceKey).
  useEffect(() => {
    if (!userId) return;
    const key = instanceKeyRef.current;
    const listener: Listener = () => { if (aliveRef.current) void fetchAll(); };
    attach(userId, key, listener);
    return () => { detach(userId, key); };
  }, [userId, fetchAll]);

  return { phon, nfts, boostPct, maxLeverage, nextThreshold, loading, refresh: fetchAll };
}
