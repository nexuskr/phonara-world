// PR-3: Crown award client wrapper + Reward Prediction Error toast.
// Always call via this wrapper so RPE toast and idempotency dedupe work consistently.
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";

export type CrownEventType =
  | "practice_win"
  | "first_win"
  | "big_win"
  | "streak"
  | "mission"
  | "trade_close"
  | "share"
  | "viral"
  | "checkin";

export type AwardResult = {
  awarded: number;
  expected: number;
  rpe: number;
  variance?: number;
  level_mult?: number;
  streak_mult?: number;
  type_mult?: number;
  vip_bonus?: boolean;
  vip_mult?: number;
  level: number;
  level_up?: boolean;
  duplicate?: boolean;
  event_id?: string;
};

export async function awardCrown(
  type: CrownEventType,
  base: number,
  opts: { meta?: Record<string, any>; dedupeKey?: string; silent?: boolean } = {}
): Promise<AwardResult | null> {
  const { data, error } = await supabase.rpc("award_crown", {
    _type: type,
    _base: Math.max(0, Math.min(10000, Math.round(base))),
    _meta: opts.meta ?? {},
    _dedupe_key: opts.dedupeKey ?? null,
  });
  if (error) {
    if (error.message?.includes("rate_limited")) {
      // silent — too fast
      return null;
    }
    notify.error("Crown 지급 실패", { description: error.message });
    return null;
  }
  const r = data as unknown as AwardResult;
  if (r.duplicate || opts.silent) return r;

  // Reward Prediction Error toast — bigger surprise = bigger dopamine
  const ratio = r.rpe;
  let title = `+${r.awarded.toLocaleString()} Crown`;
  if (ratio >= 0.8)      title = `🔥 JACKPOT +${r.awarded.toLocaleString()} Crown`;
  else if (ratio >= 0.3) title = `✨ 보너스 +${r.awarded.toLocaleString()} Crown`;
  else if (ratio <= -0.3) title = `+${r.awarded.toLocaleString()} Crown (다음을 노려보세요)`;

  notify.success(title, {
    description: r.level_up
      ? `🎉 Empire Level ${r.level} 승급!`
      : `예측 ${r.expected.toLocaleString()} · 실제 ${r.awarded.toLocaleString()} (RPE ${(ratio * 100).toFixed(0)}%)`,
  });

  // Week 3 Viral — Forced Share triggers
  try {
    const { useForcedShare } = await import("@/lib/viralShare");
    if (r.level_up && r.level >= 7) {
      useForcedShare.getState().fire({
        trigger: "baron_promotion",
        title: `👑 BARON 승급! Level ${r.level}`,
        subtitle: "제국에 자랑할 시간입니다 — 1탭으로 친구를 초대하면 +Crown",
        hashtag: "#PhonaraEmpire #BaronPromoted",
      });
    } else if (r.awarded >= 50 && ratio >= 0.8) {
      useForcedShare.getState().fire({
        trigger: "crown_jackpot",
        title: `🔥 ${r.awarded.toLocaleString()} Crown JACKPOT!`,
        subtitle: "방금 폭발한 보상을 1탭으로 공유하세요",
        hashtag: "#PhonaraEmpire #CrownJackpot",
      });
    }
  } catch { /* non-fatal */ }


  // PR-F Viral Loop v2 — auto-mint replay for variance >= 2.0
  if ((r.variance ?? 0) >= 2.0) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ev } = await supabase
          .from("crown_events")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const eventId = (ev as any)?.id as string | undefined;
        if (eventId) {
          const { data: rep } = await supabase.rpc("create_crown_replay", { _event_id: eventId });
          const token = (rep as any)?.token as string | undefined;
          if (token) {
            notify.success("👑 제국에 자랑할 시간!", {
              description: `×${(r.variance ?? 0).toFixed(2)} Crown 폭발 — 공유하면 더 많은 Crown을 노립니다.`,
              action: {
                label: "공유",
                onClick: () => {
                  window.dispatchEvent(new CustomEvent("phonara:share-replay", { detail: { token } }));
                },
              },
            });
          }
        }
      }
    } catch { /* non-fatal */ }
  }

  return r;
}
