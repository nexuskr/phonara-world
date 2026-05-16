/**
 * useRealtimeChannel — 단일 Supabase realtime 통합 레이어
 *
 * 모든 Phonara 컴포넌트가 사용하는 유일한 realtime 진입점.
 * 다음을 한 곳에서 처리한다:
 *
 *  1. 채널 dedup        : 같은 `key`를 쓰는 모든 consumer가 단일 채널을 공유
 *  2. StrictMode-safe   : 더블 마운트/라우트 전환에도 dangling 핸들러 없음
 *  3. 자동 재연결       : CHANNEL_ERROR/TIMED_OUT/CLOSED 시 지수 백오프 (~30s)
 *  4. 상태 브로드캐스트 : `onStatus(connecting|live|down)`
 *  5. 폴링 폴백         : `pollMs + onPoll` — 채널이 live가 아닐 때 주기 호출
 *  6. 포커스/온라인 재개: `resumeOnFocus` — 탭 활성화·온라인 복귀 시 onPoll 1회
 *  7. preflight 검증    : `preflight()` — 관리자 검증 등 subscribe 전 게이트
 *  8. 인증 변경 재시도  : `resumeOnAuthChange` — sign-in/role 변경 시 재구독
 *
 * 또한 hook을 쓸 수 없는 컨텍스트(스토어/비-React 모듈)를 위해
 * 동일 레지스트리를 사용하는 imperative API `subscribeRealtime`을 export.
 *
 * Debug: localStorage `phonara:debug-realtime=1` (DEV 환상시 항상 on).
 */
import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export type ChannelBinding = {
  event: "*" | "INSERT" | "UPDATE" | "DELETE";
  schema?: string;
  table: string;
  filter?: string;
};

export type ConnState = "connecting" | "live" | "down";

type Listener = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
type StatusListener = (state: ConnState) => void;

interface Entry {
  key: string;
  bindings: ChannelBinding[];
  channel: ReturnType<typeof supabase.channel> | null;
  listeners: Map<string, Listener>;
  statusListeners: Map<string, StatusListener>;
  status: "subscribing" | "subscribed" | "errored" | "removed";
  pendingRemove: boolean;
  events: number;
  retryAttempts: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
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

function publicState(e: Entry): ConnState {
  if (e.status === "subscribed") return "live";
  if (e.status === "errored" || e.status === "removed") return "down";
  return "connecting";
}

function broadcastStatus(e: Entry) {
  const s = publicState(e);
  e.statusListeners.forEach((cb) => { try { cb(s); } catch { /* swallow */ } });
}

function bindAndSubscribe(e: Entry) {
  let ch = supabase.channel(e.key);
  for (const b of e.bindings) {
    ch = ch.on(
      "postgres_changes" as any,
      { event: b.event, schema: b.schema ?? "public", table: b.table, filter: b.filter },
      (payload: any) => {
        const cur = REGISTRY.get(e.key);
        if (!cur || cur.status === "removed") return;
        cur.events++;
        dbg(e.key, "event #", cur.events, "fanout →", cur.listeners.size);
        cur.listeners.forEach((l) => { try { l(payload); } catch { /* swallow */ } });
      },
    );
  }
  e.channel = ch;
  e.status = "subscribing";
  broadcastStatus(e);
  dbg(e.key, "subscribe");

  ch.subscribe((status: string) => {
    const cur = REGISTRY.get(e.key);
    if (!cur || cur.channel !== ch) return;
    dbg(e.key, "status", status);
    if (status === "SUBSCRIBED") {
      cur.status = "subscribed";
      cur.retryAttempts = 0;
      broadcastStatus(cur);
      if (cur.pendingRemove && cur.listeners.size === 0) {
        teardown(e.key, "post-subscribe pending");
      }
    } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      if (cur.status === "removed") return;
      cur.status = "errored";
      broadcastStatus(cur);
      // 자동 재연결 (지수 백오프, 30s cap)
      if (cur.listeners.size > 0 && !cur.retryTimer) {
        const delay = Math.min(30_000, 1_000 * Math.pow(2, cur.retryAttempts++));
        dbg(e.key, "reconnect in", delay, "ms");
        cur.retryTimer = setTimeout(async () => {
          cur.retryTimer = null;
          if (REGISTRY.get(e.key) !== cur || cur.status === "removed") return;
          // 기존 채널을 완전히 정리한 후에 새로 구독해야
          // Supabase가 같은 이름의 이전 채널 핸들을 재사용해 ".on() after subscribe()" 에러를 던지는 것을 방지한다.
          try { if (cur.channel) await supabase.removeChannel(cur.channel); } catch { /* swallow */ }
          cur.channel = null;
          if (REGISTRY.get(e.key) !== cur || (cur.status as string) === "removed") return;
          bindAndSubscribe(cur);
        }, delay);
      }
    }
  });
}

function ensureChannel(key: string, bindings: ChannelBinding[]): Entry {
  const existing = REGISTRY.get(key);
  if (existing && existing.status !== "removed") return existing;

  const entry: Entry = {
    key,
    bindings,
    channel: null,
    listeners: new Map(),
    statusListeners: new Map(),
    status: "subscribing",
    pendingRemove: false,
    events: 0,
    retryAttempts: 0,
    retryTimer: null,
  };
  REGISTRY.set(key, entry);
  bindAndSubscribe(entry);
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
  if (e.retryTimer) { clearTimeout(e.retryTimer); e.retryTimer = null; }
  if (e.channel) {
    try { void supabase.removeChannel(e.channel); dbg(key, "removeChannel ✓ —", reason); }
    catch (err) { dbg(key, "removeChannel error", err); }
  }
  e.status = "removed";
  e.channel = null;
  REGISTRY.delete(key);
}

/* ============================================================
 * Imperative API — for non-React modules (replaces realtime-bus)
 * ============================================================ */
export interface SubscribeRealtimeOpts {
  key: string;
  bindings: ChannelBinding[];
  onEvent: Listener;
  onStatus?: StatusListener;
}

let __impCounter = 0;
export function subscribeRealtime(opts: SubscribeRealtimeOpts): () => void {
  const id = `imp-${++__impCounter}-${Date.now().toString(36)}`;
  const entry = ensureChannel(opts.key, opts.bindings);
  entry.listeners.set(id, opts.onEvent);
  entry.pendingRemove = false;
  if (opts.onStatus) {
    entry.statusListeners.set(id, opts.onStatus);
    try { opts.onStatus(publicState(entry)); } catch { /* swallow */ }
  }
  return () => {
    const cur = REGISTRY.get(opts.key);
    if (!cur) return;
    cur.listeners.delete(id);
    cur.statusListeners.delete(id);
    if (cur.listeners.size === 0) teardown(opts.key, "imperative unsubscribe");
  };
}

/* ============================================================
 * React hook
 * ============================================================ */
export interface UseRealtimeChannelOpts {
  /** Stable channel key; consumers sharing the same key share one channel. */
  key: string;
  /** Postgres-changes bindings; only used on first subscriber per key. */
  bindings: ChannelBinding[];
  /** Fired for every matching event. Latest closure is always called. */
  onEvent: Listener;
  /** Skip subscribing while false; tearing down if already attached. */
  enabled?: boolean;
  /** 채널 상태 변화 콜백 (connecting/live/down). */
  onStatus?: StatusListener;
  /** 채널이 live가 아닐 때 주기적으로 onPoll 호출 (ms). */
  pollMs?: number;
  /** pollMs 또는 focus/online 복귀 시 호출. */
  onPoll?: () => void;
  /** visibilitychange/online 이벤트 시 onPoll 1회 호출. */
  resumeOnFocus?: boolean;
  /** auth 변경 시(SIGNED_IN, TOKEN_REFRESHED 등) 재구독 + onPoll. */
  resumeOnAuthChange?: boolean;
  /** subscribe 전 게이트(예: 관리자 검증). false 반환 시 status=down 유지. */
  preflight?: () => Promise<boolean>;
}

export function useRealtimeChannel(opts: UseRealtimeChannelOpts) {
  const {
    key, bindings, onEvent, enabled = true,
    onStatus, pollMs, onPoll, resumeOnFocus, resumeOnAuthChange, preflight,
  } = opts;

  // Stable per-mount instance id
  const idRef = useRef<string>("");
  if (!idRef.current) idRef.current = `rch-${++__counter}-${Date.now().toString(36)}`;

  // Latest-closure refs (no re-subscribe on callback change)
  const cbRef = useRef<Listener>(onEvent);
  const statusRef = useRef<StatusListener | undefined>(onStatus);
  const pollRef = useRef<(() => void) | undefined>(onPoll);
  const preflightRef = useRef<typeof preflight>(preflight);
  useEffect(() => { cbRef.current = onEvent; }, [onEvent]);
  useEffect(() => { statusRef.current = onStatus; }, [onStatus]);
  useEffect(() => { pollRef.current = onPoll; }, [onPoll]);
  useEffect(() => { preflightRef.current = preflight; }, [preflight]);

  const bindingsKey = JSON.stringify(bindings);

  useEffect(() => {
    if (!enabled || !key) return;
    let cancelled = false;
    let attached = false;
    const id = idRef.current;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let lastState: ConnState = "connecting";

    const fireStatus = (s: ConnState) => {
      lastState = s;
      try { statusRef.current?.(s); } catch { /* noop */ }
      // 채널이 live가 아닐 때만 폴링 활성
      if (pollMs && pollRef.current) {
        if (s !== "live" && !pollTimer) {
          pollTimer = setVisibleInterval(() => { try { pollRef.current?.(); } catch {} }, pollMs , { meta: { owner: "use-realtime-channel", category: "admin" } });
        } else if (s === "live" && pollTimer) {
          clearInterval(pollTimer); pollTimer = null;
        }
      }
    };

    const attach = () => {
      if (cancelled || attached) return;
      const entry = ensureChannel(key, bindings);
      const listener: Listener = (p) => { try { cbRef.current(p); } catch { /* noop */ } };
      const statusListener: StatusListener = (s) => fireStatus(s);
      entry.listeners.set(id, listener);
      entry.statusListeners.set(id, statusListener);
      entry.pendingRemove = false;
      attached = true;
      dbg(key, "attach", id, "listeners=", entry.listeners.size);
      // 즉시 현재 상태 통지
      fireStatus(publicState(entry));
    };

    const detach = () => {
      if (!attached) return;
      const cur = REGISTRY.get(key);
      attached = false;
      if (cur) {
        cur.listeners.delete(id);
        cur.statusListeners.delete(id);
        dbg(key, "detach", id, "listeners=", cur.listeners.size);
        if (cur.listeners.size === 0) teardown(key, "last consumer left");
      }
    };

    const start = async () => {
      if (preflightRef.current) {
        try {
          const ok = await preflightRef.current();
          if (cancelled) return;
          if (!ok) { fireStatus("down"); return; }
        } catch { if (!cancelled) fireStatus("down"); return; }
      }
      if (!cancelled) attach();
    };

    void start();

    // focus/online 재개
    const onResume = async () => {
      if (cancelled) return;
      try { pollRef.current?.(); } catch { /* noop */ }
      // 채널이 down이면 재시도(빠른 재연결 트리거)
      const cur = REGISTRY.get(key);
      if (!cur || (cur.status as string) === "removed") { void start(); return; }
      if (cur.status === "errored" && !cur.retryTimer) {
        cur.retryAttempts = 0;
        // 동일 이름 채널 재사용으로 인한 ".on() after subscribe()" 방지
        try { if (cur.channel) await supabase.removeChannel(cur.channel); } catch {}
        cur.channel = null;
        if (cancelled || REGISTRY.get(key) !== cur || (cur.status as string) === "removed") return;
        bindAndSubscribe(cur);
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible") onResume(); };
    if (resumeOnFocus) {
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("online", onResume);
      window.addEventListener("focus", onResume);
    }

    // auth 변경 재구독
    let authSub: { unsubscribe: () => void } | null = null;
    if (resumeOnAuthChange) {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (cancelled) return;
        if (event === "SIGNED_OUT") {
          detach();
          fireStatus("down");
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // preflight 재실행을 위해 detach 후 재시작
          detach();
          void start();
        }
      });
      authSub = data.subscription;
    }

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (resumeOnFocus) {
        document.removeEventListener("visibilitychange", onVisible);
        window.removeEventListener("online", onResume);
        window.removeEventListener("focus", onResume);
      }
      authSub?.unsubscribe();
      detach();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key, bindingsKey, pollMs, resumeOnFocus, resumeOnAuthChange]);
}
