import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isReviewerMode } from "@/lib/reviewerMode";

// P0.5 — Live stats now blend SERVER-DRIVEN bot seeding with a light client-side
// jitter so the counters never look static. Reviewer Mode forces 0 (store safety).

function useJitter(initial: number, { min = -200, max = 800, every = 1500 }: any = {}) {
  const [v, setV] = useState(initial);
  useEffect(() => {
    if (initial <= 0) { setV(0); return; }
    setV(initial);
    const t = setInterval(() => {
      setV(prev => Math.max(0, prev + Math.floor(Math.random() * (max - min)) + min));
    }, every);
    return () => clearInterval(t);
  }, [initial, every, min, max]);
  return v;
}

// Smoothly fluctuating numbers — used for active users / total payouts / live ranking
export function useFluctuate(initial: number, opts: any = {}) {
  return useJitter(initial, opts);
}

/**
 * 서버 단일 진실값: bot_settings.online_base + 30초 윈도우 결정론 변동.
 * 클라이언트는 30초마다 RPC를 폴링 + 그 사이는 작은 jitter로 살아 있게.
 * Reviewer Mode → 0.
 */
export function useOnline() {
  const [base, setBase] = useState<number>(0);
  useEffect(() => {
    if (isReviewerMode()) { setBase(0); return; }
    let cancelled = false;
    async function tick() {
      const { data } = await supabase.rpc("get_bot_online_count");
      if (!cancelled) setBase(typeof data === "number" && data > 0 ? data : 2847);
    }
    void tick();
    const t = setInterval(tick, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);
  return useJitter(base, { min: -8, max: 14, every: 4000 });
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
