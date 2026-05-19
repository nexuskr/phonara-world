/**
 * @pkg/games/core/constants — Imperial Game System v1.0
 *
 * Design tokens reference (HSL via index.css). No raw hex anywhere.
 */
export const GAME_FRAME_TARGET_MS = 1000 / 60; // 60fps budget
export const GAME_FRAME_HIGH_MS = 1000 / 120; // high-tier target
export const GAME_VIEWPORT_PAUSE_THRESHOLD = 0.05; // <5% visible → pause

/** Per-game bundle budget (kb gz). Enforced via size-limit.config.json later. */
export const GAME_BUNDLE_BUDGET_KB = 60;

/** Object-pool defaults for particle/burst primitives. */
export const POOL_DEFAULTS = {
  particle: 256,
  burst: 64,
  reelSymbol: 128,
} as const;

/** Tailwind variant gates (Foundation A). */
export type PerfTier = "low" | "mid" | "high";

/** Provably Fair v2 (Phase 2) — RPC names locked. */
export const PF_RPC = {
  commit: "pf_commit",
  reveal: "pf_reveal",
  verify: "pf_verify",
} as const;

/** Bet currencies — 표시 통화 레이어와 1:1 매핑. */
export type BetCurrency = "PHON" | "USDT";

/** Game session lifecycle. */
export type GameSessionStatus =
  | "idle"
  | "armed"
  | "spinning"
  | "settling"
  | "won"
  | "lost"
  | "frozen";
