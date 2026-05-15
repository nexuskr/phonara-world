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
    paytable: pt(0.4, 1.0, 2.0, 4.0),
    scatterTrigger: 3,
    bonus: {
      kind: "sticky_multi",
      spins: 12,
      multWeights: [[2, 40], [3, 28], [5, 18], [10, 10], [25, 3], [100, 1]],
      collectChance: 0.32,
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
    paytable: pt(0.3, 0.8, 1.6, 3.0),
    scatterTrigger: 3,
    bonus: {
      kind: "hold88",
      spins: 3,
      respinReset: 3,
      coinChance: 0.10,
      coinWeights: [
        [2, 40], [4, 25], [8, 18], [15, 10], [40, 4], [88, 2], ["GRAND", 1],
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
    paytable: pt(0.5, 1.2, 2.5, 5.0),
    scatterTrigger: 3,
    bonus: {
      kind: "crash_cannon",
      growthPerTick: 0.08,    // faster growth
      crashHazard: 0.025,     // gentler hazard → higher EV per cashout
      autoCashoutMult: 8.0,   // sim cashout at 8x
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
    paytable: pt(0.5, 1.3, 2.7, 5.0),
    scatterTrigger: 3,
    bonus: {
      kind: "pick_reveal",
      picks: 3,
      prizeWeights: [
        [2, 40], [5, 25], [12, 15], [30, 10], [80, 6], [200, 3], ["JACKPOT", 1],
      ],
      jackpotWeights: [[40, 60], [120, 25], [400, 12], [1200, 2.5], [2500, 0.5]],
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
    paytable: pt(0.4, 1.0, 2.2, 4.5),
    scatterTrigger: 3,
    bonus: {
      kind: "three_path",
      paths: [
        { name: "Asgard", spins: 6, startMult: 5, wildBoostX: 1.5 },
        { name: "Midgard", spins: 10, startMult: 2, wildBoostX: 0.8 },
        { name: "Helheim", spins: 15, startMult: 1, wildBoostX: 0.5, xbombChance: 0.08 },
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
    paytable: pt(0.4, 1.0, 2.0, 4.0),
    scatterTrigger: 4,
    bonus: {
      kind: "cluster_tumble",
      spins: 10,
      cellMultLadder: [2, 4, 8, 16, 32, 64],
      tumbleClearMult: 1.0,
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
    paytable: pt(0.5, 1.5, 3.0, 6.0),
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
