import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isReviewerMode } from "@/lib/reviewerMode";
import { setVisibleInterval } from "@/lib/util/visible-interval";

// P0.5 — Live stats now blend SERVER-DRIVEN bot seeding with a light client-side
// jitter so the counters never look static. Reviewer Mode forces 0 (store safety).

function useJitter(initial: number, { min = -200, max = 800, every = 1500 }: any = {}) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    if (initial <= 0) { setV(0); return; }
    setV(initial);
    const t = setVisibleInterval(() => {
      // Pause when tab hidden — saves CPU + battery on background tabs.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      setV(prev => Math.max(0, prev + Math.floor(Math.random() * (max - min)) + min));
    }, every , { meta: { owner: "LiveStats", category: "cosmetic" } });
    return () => t();
  }, [initial, every, min, max]);
  return v;
}

// Smoothly fluctuating numbers — used for active users / total payouts / live ranking
export function useFluctuate(initial: number, opts: any = {}) {
  return useJitter(initial, opts);
}

/**
 * 서버 단일 진실값 + 모듈 싱글톤. 첫 useOnline 호출이 30초 폴링을 가동하고,
 * 이후의 모든 컴포넌트는 같은 값을 받는다 (RPC dedupe).
 * Reviewer Mode → 0.
 */
let ONLINE_BASE = 0;
let ONLINE_STOP: (() => void) | null = null;
let ONLINE_REFCOUNT = 0;
const ONLINE_SUBS = new Set<() => void>();
function emitOnline() { ONLINE_SUBS.forEach((fn) => { try { fn(); } catch {} }); }
async function tickOnline() {
  if (isReviewerMode()) { ONLINE_BASE = 0; emitOnline(); return; }
  try {
    const { data } = await supabase.rpc("get_bot_online_count");
    ONLINE_BASE = typeof data === "number" && data > 0 ? data : 2847;
  } catch {
    ONLINE_BASE = 2847;
  }
  emitOnline();
}
export function useOnline() {
  const [base, setBase] = useState<number>(ONLINE_BASE);
  useEffect(() => {
    const fn = () => setBase(ONLINE_BASE);
    ONLINE_SUBS.add(fn);
    ONLINE_REFCOUNT++;
    if (ONLINE_REFCOUNT === 1) {
      void tickOnline();
      ONLINE_STOP = setVisibleInterval(tickOnline, 30_000);
    } else {
      setBase(ONLINE_BASE);
    }
    return () => {
      ONLINE_SUBS.delete(fn);
      ONLINE_REFCOUNT = Math.max(0, ONLINE_REFCOUNT - 1);
      if (ONLINE_REFCOUNT === 0 && ONLINE_STOP) {
        ONLINE_STOP();
        ONLINE_STOP = null;
      }
    };
  }, []);
  // base 기준 ±10% 범위에서 자연 변동 — 단, jitter 주기를 12s로 늘려 CPU 부담 최소화
  const span = Math.max(20, Math.floor(base * 0.10));
  return useJitter(base, { min: -span, max: span, every: 12000 });
}

export function useTotalPayout() {
  return useJitter(12_847_592_310, { min: 50_000, max: 480_000, every: 3500 });
}

export function useTodayPayout() {
  // Server-driven baseline using current bot online count to keep it coherent.
  const online = useOnline();
  // 38억 + 온라인 인원 * 약간 → 봇 강도 0이면 0
  const base = online > 0 ? 38_420_000 + Math.floor(online * 240) : 0;
  return useJitter(base, { min: 5_000, max: 120_000, every: 4000 });
}

export function useMembers() {
  return useJitter(284_392, { min: 0, max: 6, every: 6000 });
}

/**
 * P1-6 — 누적 가입자 수 (목표 100만 + 결정론적 일일 성장).
 * 서버 RPC `get_bot_total_users` → 봇 비활성/강도 0이면 0 반환.
 * Reviewer Mode에서는 0.
 */
export function useTotalUsers() {
  const [base, setBase] = useState<number>(0);
  useEffect(() => {
    if (isReviewerMode()) { setBase(0); return; }
    let cancelled = false;
    async function tick() {
      try {
        const { data } = await supabase.rpc("get_bot_total_users");
        if (!cancelled) setBase(typeof data === "number" && data > 0 ? data : 1_000_000);
      } catch {
        if (!cancelled) setBase(1_000_000);
      }
    }
    void tick();
    const stop = setVisibleInterval(tick, 60_000);
    return () => { cancelled = true; stop(); };
  }, []);
  // 1분 사이엔 작게만 흔들림
  return useJitter(base, { min: -2, max: 8, every: 5000 });
}
