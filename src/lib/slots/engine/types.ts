// Slot engine types — pure data, no React/DOM deps so we can sim in Node.
// Symbol layout (shared across all 7 games):
//   0..4  = low cards (10/J/Q/K/A)
//   5..8  = premium 4 (theme-specific art)
//   9     = WILD
//   10    = SCATTER

export type Volatility = "low" | "mid" | "high" | "very_high";

export type WeightedItem<T> = readonly [value: T, weight: number];

export type BonusSpec =
  | {
      kind: "sticky_multi";
      // Cosmic Forge — Money Train style. Free spins with persistent multiplier slots.
      spins: number;
      multWeights: ReadonlyArray<WeightedItem<number>>; // mult value → weight
      collectChance: number; // chance per spin a wild lands & adds a sticky cell
      maxCells: number;
    }
  | {
      kind: "hold88";
      // Neon Tokyo 88 — Big Bass style hold & spin.
      spins: number;
      respinReset: number; // respins reset on coin land
      coinChance: number;
      coinWeights: ReadonlyArray<WeightedItem<number | "GRAND">>;
      grandValue: number;
      cells: number; // grid cells = 15 (5x3)
    }
  | {
      kind: "crash_cannon";
      // Pirate's Curse — Crash-as-bonus. House edge embedded in expected cashout.
      growthPerTick: number; // multiplicative growth per 100ms tick
      crashHazard: number;   // per-tick chance of crash (geometric)
      autoCashoutMult?: number; // sim cashes out here for fairness comparison
    }
  | {
      kind: "pick_reveal";
      // Pharaoh's Vault — Pick & Reveal + jackpot wheel.
      picks: number;
      prizeWeights: ReadonlyArray<WeightedItem<number | "JACKPOT" | "MORE_PICKS" | "STOP">>;
      jackpotWeights: ReadonlyArray<WeightedItem<number>>; // mini..mega
      morePicksAdd: number;
    }
  | {
      kind: "three_path";
      // Viking Thunder — user picks 1 of 3 free-spin paths.
      paths: ReadonlyArray<{
        name: string;
        spins: number;
        startMult: number;
        wildBoostX: number; // every wild adds this to running mult
        xbombChance?: number; // Helheim only
      }>;
    }
  | {
      kind: "cluster_tumble";
      // Aztec Sun — cluster pays + cell-multiplier upgrade per tumble.
      spins: number;
      cellMultLadder: ReadonlyArray<number>; // [2,4,8,16,32,64]
      tumbleClearMult: number; // base symbol-payout multiplier per chain
    }
  | {
      kind: "mission_trail";
      // Cherry Sakura — Slingo-style trail with checkpoint rewards.
      steps: number;
      moveDistWeights: ReadonlyArray<WeightedItem<number>>; // 1..5 squares
      checkpoints: Readonly<Record<number, number | "JACKPOT">>; // step → reward x bet
    };

export interface GameConfig {
  code: string;
  title: string;
  volatility: Volatility;
  rtpTarget: number;       // 0.96
  maxMultiplier: number;   // theoretical cap, used for cap clipping in sim
  reels: 5;
  rows: 3;
  // 11 symbol weights; sum doesn't need to be 1.
  symbolWeights: readonly number[];
  // paytable[symbolIdx][matchCount-3] = multiplier on bet
  paytable: readonly (readonly number[])[];
  scatterTrigger: number;  // # of SCATTER symbols to trigger bonus (usu. 3)
  bonus: BonusSpec;
}

export interface SpinOutcome {
  bet: number;
  baseWin: number;
  bonusWin: number;
  totalWin: number;
  bonusTriggered: boolean;
  scatterCount: number;
}

export interface SimReport {
  game: string;
  rounds: number;
  rtp: number;
  baseRtp: number;
  bonusRtp: number;
  bonusHitFreq: number;     // 1/N
  maxObservedX: number;
  bigWinRate: number;       // ≥100x rate
  ultraWinRate: number;     // ≥1000x rate
}
