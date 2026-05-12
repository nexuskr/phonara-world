// V17 Recommendation Engine — client RPC wrappers.
import { supabase } from "@/integrations/supabase/client";

export type FeedEvent = "view" | "3s" | "complete" | "share" | "like" | "skip";

export type FeedRecommendation = {
  video_id: string;
  score: number;
  mode: string;
  served_at: string;
};

/** Record a feed engagement event (own user, SECURITY DEFINER server-side). */
export async function recordFeedEvent(
  videoId: string,
  event: FeedEvent,
  dwellMs = 0,
  region?: string,
): Promise<void> {
  const { error } = await (supabase as any).rpc("record_feed_event", {
    _video_id: videoId,
    _event: event,
    _dwell_ms: dwellMs,
    _region: region ?? null,
  });
  if (error) throw error;
}

/** Fetch personalized ranked feed for the current user. */
export async function rankFeedForUser(limit = 20): Promise<FeedRecommendation[]> {
  const { data, error } = await (supabase as any).rpc("rank_feed_for_user", {
    _limit: limit,
  });
  if (error) throw error;
  return (data ?? []) as FeedRecommendation[];
}

/**
 * Pure score formula (TikTok FYP-style).
 * Mirrors plan §10.1 — used client-side for re-ordering when needed.
 */
export function rankContent<
  T extends {
    watch_time?: number;
    share_rate?: number;
    like_rate?: number;
    recent_boost?: number;
  },
>(videos: T[]): (T & { score: number })[] {
  return videos
    .map((v) => ({
      ...v,
      score:
        (v.watch_time ?? 0) * 0.4 +
        (v.share_rate ?? 0) * 0.3 +
        (v.like_rate ?? 0) * 0.2 +
        (v.recent_boost ?? 0) * 0.1,
    }))
    .sort((a, b) => b.score - a.score);
}

/** Persona → feed mode mapping (plan §2 + §10.1). */
export function personalizeFeedMode(age?: number | null): "high-viral" | "performance" | "stable-income" {
  if (age == null) return "performance";
  if (age < 25) return "high-viral";
  if (age < 40) return "performance";
  return "stable-income";
}
