// P0.5 — 봇 시드 라이브 피드 훅
// 30초마다 get_bot_feed RPC 호출, 라이브 티커/알림 피드에 사용
// Reviewer Mode → 빈 배열 반환

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isReviewerMode, useReviewerMode } from "@/lib/reviewerMode";

export interface BotFeedItem {
  id: number;
  nickname: string;
  avatar_emoji: string;
  event_type: string;
  event_text: string;
  reward_amount: number | null;
  occurred_at: string;
}

export function useBotFeed(limit = 30): BotFeedItem[] {
  const [items, setItems] = useState<BotFeedItem[]>([]);
  const reviewer = useReviewerMode();

  useEffect(() => {
    if (reviewer || isReviewerMode()) { setItems([]); return; }
    let cancelled = false;
    async function tick() {
      const { data, error } = await supabase.rpc("get_bot_feed", { _limit: limit });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setItems(data as BotFeedItem[]);
    }
    void tick();
    const t = setInterval(tick, 10_000); // 10초 폴링 (서버 부하 vs 신선도 균형)
    return () => { cancelled = true; clearInterval(t); };
  }, [limit, reviewer]);

  return items;
}

/** 라이브 티커가 한 번에 한 줄씩 흘러갈 때 사용 */
export function useBotFeedRotator(items: BotFeedItem[], intervalMs = 3500): BotFeedItem | null {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (items.length === 0) return;
    const t = setInterval(() => setIdx(i => (i + 1) % items.length), intervalMs);
    return () => clearInterval(t);
  }, [items.length, intervalMs]);
  return items.length > 0 ? items[idx % items.length] : null;
}
