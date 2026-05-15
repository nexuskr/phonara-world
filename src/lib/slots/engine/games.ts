import type { GameConfig } from "./types";

// Paytable scalars — multiplied by ×4 vs initial draft to lift base RTP into ~30-40% range.
const pt = (low: number, mid: number, hi: number, top: number) =>
  [
    [low * 0.4, low * 1.2, low * 3.2],
    [low * 0.4, low * 1.2, low * 3.2],
    [low * 0.6, low * 1.6, low * 4.0],
    [low * 0.6, low * 1.6, low * 4.0],
    [low * 0.8, low * 2.0, low * 4.8],
    [mid * 2.0, mid * 6.0, mid * 16],
    [mid * 2.4, mid * 8.0, mid * 20],
    [hi * 3.2, hi * 10, hi * 28],
    [top * 4.0, top * 16, top * 48],
    [0, 0, 0],
    [0, 0, 0],
  ] as const;

// Boosted scatter weights so bonus triggers more often (was hitting 1/400+).
// [10, J, Q, K, A, p1, p2, p3, p4, WILD, SCATTER]
const W_LOW       = [22, 22, 18, 18, 16, 12, 10, 7, 5, 4, 5];
const W_MID       = [24, 24, 20, 20, 17, 11, 9, 6, 4, 3, 4.5];
const W_HIGH      = [25, 25, 22, 22, 18, 9, 7, 5, 3, 3, 4];
const W_VERY_HIGH = [26, 26, 24, 24, 20, 8, 6, 4, 2.5, 2.5, 3.5];

export const GAMES: GameConfig[] = [
  {
    code: "cosmic_forge_5000",
    title: "Cosmic Forge",
    volatility: "high",
    rtpTarget: 0.96,
    maxMultiplier: 5000,
    reels: 5, rows: 3,
    symbolWeights: W_HIGH,
    paytable: pt(0.665, 1.66, 3.32, 6.65),
    scatterTrigger: 3,
    bonus: {
      kind: "sticky_multi",
      spins: 13,
      multWeights: [[2, 47.5], [3, 28], [5, 14.9], [10, 7.2], [25, 2.4], [100, 0.50]],
      collectChance: 0.42,
      maxCells: 13,
    },
  },
  {
    code: "neon_tokyo_88",
    title: "Neon Tokyo 88",
    volatility: "very_high",
    rtpTarget: 0.96,
    maxMultiplier: 8888,
    reels: 5, rows: 3,
    symbolWeights: W_VERY_HIGH,
    paytable: pt(1.14, 2.88, 5.78, 11.05),
    scatterTrigger: 3,
    bonus: {
      kind: "hold88",
      spins: 3,
      respinReset: 3,
      coinChance: 0.065,
      coinWeights: [
        [2, 53.7], [4, 28], [8, 12.4], [15, 4.83], [40, 1.51], [88, 0.575], ["GRAND", 0.040]],
      ],
      grandValue: 8888,
      cells: 15,
    },
  },
  {
    code: "pirates_curse_1500",
    title: "Pirate's Curse",
    volatility: "mid",
    rtpTarget: 0.96,
    maxMultiplier: 1500,
    reels: 5, rows: 3,
    symbolWeights: W_MID,
    paytable: pt(1.08, 2.55, 5.30, 10.6),
    scatterTrigger: 3,
    bonus: {
      kind: "crash_cannon",
      growthPerTick: 0.105,
      crashHazard: 0.012,
      autoCashoutMult: 28.0,
    },
  },
  {
    code: "pharaohs_vault_2500",
    title: "Pharaoh's Vault",
    volatility: "mid",
    rtpTarget: 0.96,
    maxMultiplier: 2500,
    reels: 5, rows: 3,
    symbolWeights: W_MID,
    paytable: pt(0.92, 2.17, 4.58, 9.14),
    scatterTrigger: 3,
    bonus: {
      kind: "pick_reveal",
      picks: 3,
      prizeWeights: [
        [2, 55], [5, 32], [12, 16], [30, 7], [80, 2.5], [200, 1.0], ["JACKPOT", 0.20],
      ],
      jackpotWeights: [[40, 65], [120, 25], [400, 8], [1200, 1.7], [2500, 0.3]],
      morePicksAdd: 0,
    },
  },
  {
    code: "viking_thunder_4000",
    title: "Viking Thunder",
    volatility: "high",
    rtpTarget: 0.96,
    maxMultiplier: 4000,
    reels: 5, rows: 3,
    symbolWeights: W_HIGH,
    paytable: pt(0.84, 1.97, 4.15, 8.30),
    scatterTrigger: 3,
    bonus: {
      kind: "three_path",
      paths: [
        { name: "Asgard", spins: 7, startMult: 7.6, wildBoostX: 1.85 },
        { name: "Midgard", spins: 12, startMult: 3.4, wildBoostX: 1.25 },
        { name: "Helheim", spins: 16, startMult: 1.0, wildBoostX: 0.7, xbombChance: 0.11 },
      ],
    },
  },
  {
    code: "aztec_sun_1200",
    title: "Aztec Sun",
    volatility: "mid",
    rtpTarget: 0.96,
    maxMultiplier: 1200,
    reels: 5, rows: 3,
    symbolWeights: W_MID,
    paytable: pt(0.69, 1.62, 3.42, 6.85),
    scatterTrigger: 3,
    bonus: {
      kind: "cluster_tumble",
      spins: 8,
      cellMultLadder: [2, 3, 5, 8, 16, 32],
      tumbleClearMult: 0.78,
    },
  },
  {
    code: "cherry_sakura_500",
    title: "Cherry Sakura",
    volatility: "low",
    rtpTarget: 0.96,
    maxMultiplier: 500,
    reels: 5, rows: 3,
    symbolWeights: W_LOW,
    paytable: pt(0.74, 2.1, 4.4, 8.8),
    scatterTrigger: 3,
    bonus: {
      kind: "mission_trail",
      steps: 100,
      moveDistWeights: [[1, 35], [2, 30], [3, 20], [4, 10], [5, 5]],
      checkpoints: { 5: 1, 15: 3, 30: 8, 50: 18, 80: 50, 100: "JACKPOT" },
    },
  },
];

export const GAMES_BY_CODE: Record<string, GameConfig> = Object.fromEntries(
  GAMES.map((g) => [g.code, g]),
);
