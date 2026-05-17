/**
 * Gamification constants — single source of truth for client-side UI.
 * Server values are authoritative; these mirror them for previews/tooltips.
 */

export const STREAK_MILESTONE_DAYS = [7, 14, 30, 100] as const;

export const PHON_MAX_LEVEL = 100;

/** Mirror of public.phon_xp_to_next(level). */
export function xpToNext(level: number): number {
  if (level >= PHON_MAX_LEVEL) return 0;
  return Math.max(100, Math.floor(100 * Math.pow(1.15, Math.max(1, level) - 1)));
}

export type ChestTier = "bronze" | "silver" | "gold" | "legendary";

export function chestTierForStreak(streak: number): ChestTier {
  if (streak >= 14) return "legendary";
  if (streak >= 7) return "gold";
  if (streak >= 3) return "silver";
  return "bronze";
}

export const DAILY_CHEST_REWARDS: Record<
  ChestTier,
  { phonRange: [number, number]; xp: number; boosterHours: number; label: string; tone: string }
> = {
  bronze:    { phonRange: [500, 2000],     xp: 50,   boosterHours: 0,  label: "황실 보물상자 · Bronze",   tone: "from-amber-700 to-amber-900" },
  silver:    { phonRange: [2000, 6000],    xp: 150,  boosterHours: 0,  label: "황실 보물상자 · Silver",   tone: "from-slate-300 to-slate-500" },
  gold:      { phonRange: [6000, 15000],   xp: 400,  boosterHours: 6,  label: "황실 보물상자 · Gold",     tone: "from-yellow-400 to-amber-600" },
  legendary: { phonRange: [15000, 50000],  xp: 1000, boosterHours: 24, label: "전설의 보물상자 · Legend", tone: "from-rose-400 via-fuchsia-500 to-violet-600" },
};

/** Display tier ordering for badge collection sorting. */
export const BADGE_TIER_ORDER: Record<string, number> = {
  bronze: 1, silver: 2, gold: 3, platinum: 4, legend: 5, legendary: 5, diamond: 6, mythic: 7,
};

export const BADGE_TIER_COLORS: Record<string, string> = {
  bronze:    "from-amber-700 to-amber-900",
  silver:    "from-slate-300 to-slate-500",
  gold:      "from-yellow-400 to-amber-600",
  platinum:  "from-cyan-300 to-blue-500",
  legend:    "from-rose-400 via-fuchsia-500 to-violet-600",
  legendary: "from-rose-400 via-fuchsia-500 to-violet-600",
  diamond:   "from-fuchsia-400 to-purple-600",
  mythic:    "from-rose-400 via-fuchsia-500 to-violet-600",
};

/** Curated 30 gamification achievement keys (for filtering/display only). */
export const ACHIEVEMENT_LIST = [
  "g_chest_open_1", "g_chest_open_7", "g_chest_open_30", "g_chest_legendary",
  "g_level_5", "g_level_10", "g_level_25", "g_level_50", "g_level_75", "g_level_100",
  "g_xp_10k", "g_xp_100k", "g_xp_1m",
  "g_badges_5", "g_badges_15", "g_badges_30",
  "g_streak_3", "g_streak_14",
  "g_earn_1m", "g_earn_10m", "g_stake_100k", "g_trade_profit_50",
  "g_first_dep", "g_first_wd",
  "g_founding_seat", "g_vip_subscribed", "g_crown_war_winner",
  "g_referral_10", "g_concierge_chat", "g_share_5",
] as const;
