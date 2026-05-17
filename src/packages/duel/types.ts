/**
 * @pkg/duel — Imperial Duel PVP Phase 1
 * Provably-fair 1:1 결투 — 프론트엔드 전용 시뮬레이션.
 * 신규 RPC / edge / 외부 라이브러리 0.
 */
export type DuelObjectKind = "wheel" | "card" | "dice";

export interface Duelist {
  id: string;
  nickname: string;
  tier: number;      // 1..10
  emoji: string;
  color: string;     // hex
  winRate: number;   // 0..1
  streak: number;
}

export interface DuelRoom {
  id: string;
  title: string;
  object: DuelObjectKind;
  stake: number;          // PHON
  spectators: number;
  jackpotPct: number;     // 0..100
  heat: 1 | 2 | 3 | 4 | 5;
  left: Duelist;
  right: Duelist;
  startsInSec: number;
}

export interface DuelRoundResult {
  winner: "left" | "right";
  rollValue: number;          // 0..1 from HMAC
  rolledDeg: number;          // 0..360 for wheel/dice rotation
  nearMiss: boolean;
  nearMissMargin: number;     // |distance to threshold| in [0,1]
  threshold: number;          // dynamic, ~0.5 ± 2.2%
  rewardTier: RewardTier;
  proof: ProofBundle;
  fomo: FomoSignals;
}

export type RewardTier = "base" | "surge" | "crown" | "empyrean" | "divine";

export interface ProofBundle {
  serverSeedHash: string;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  hmacHex: string;           // full HMAC-SHA512 hex
  rollHex: string;           // first 8 bytes used
  groth16ProofBytes: number; // 287
  zkStarkPlaceholder: string;
}

export interface FomoSignals {
  globalHeat: 1 | 2 | 3 | 4 | 5;       // adaptive global
  personalScore: number;                 // 0..100
  triggers: PersonalizedTrigger[];
  dynamicOffset: number;                 // -0.022..+0.022
  nearMissFlag: boolean;
  threshold: number;
}

export type PersonalizedTrigger =
  | "near_miss_streak"
  | "win_drought"
  | "royal_pass_milestone"
  | "session_resurrection"
  | "heat_surge"
  | "pool_imbalance";
