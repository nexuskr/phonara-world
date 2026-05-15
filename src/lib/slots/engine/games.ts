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
    paytable: pt(0.66, 1.65, 3.3, 6.6),
    scatterTrigger: 3,
    bonus: {
      kind: "sticky_multi",
      spins: 14,
      multWeights: [[2, 42], [3, 28], [5, 17], [10, 9], [25, 3], [100, 1]],
      collectChance: 0.42,
      maxCells: 15,
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
    paytable: pt(0.78, 2.0, 4.0, 7.6),
    scatterTrigger: 3,
    bonus: {
      kind: "hold88",
      spins: 3,
      respinReset: 3,
      coinChance: 0.062,
      coinWeights: [
        [2, 55], [4, 28], [8, 12], [15, 4.5], [40, 1.4], [88, 0.5], ["GRAND", 0.05],
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
    paytable: pt(1.05, 2.5, 5.2, 10.4),
    scatterTrigger: 3,
    bonus: {
      kind: "crash_cannon",
      growthPerTick: 0.10,
      crashHazard: 0.011,
      autoCashoutMult: 30.0,
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
    paytable: pt(0.80, 1.9, 4.0, 8.0),
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
    paytable: pt(0.85, 2.0, 4.2, 8.5),
    scatterTrigger: 3,
    bonus: {
      kind: "three_path",
      paths: [
        { name: "Asgard", spins: 8, startMult: 10, wildBoostX: 2.5 },
        { name: "Midgard", spins: 12, startMult: 4, wildBoostX: 1.5 },
        { name: "Helheim", spins: 18, startMult: 1, wildBoostX: 0.8, xbombChance: 0.12 },
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
    paytable: pt(0.55, 1.3, 2.8, 5.6),
    scatterTrigger: 3,
    bonus: {
      kind: "cluster_tumble",
      spins: 6,
      cellMultLadder: [2, 3, 5, 8, 16, 32],
      tumbleClearMult: 0.55,
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
