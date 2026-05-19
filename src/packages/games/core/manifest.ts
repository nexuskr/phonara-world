/**
 * AETHER 7 Game Registry — single source of truth for routing,
 * lazy-load, manualChunks, KPI labels.
 *
 * Source: https://aetherbet.lovable.app
 */
export type GameSlug =
  | "crash"
  | "mines"
  | "plinko"
  | "limbo"
  | "dice"
  | "wheel"
  | "hilo";

export interface GameDescriptor {
  slug: GameSlug;
  /** PascalCase used for page filename and import. */
  pascal: string;
  /** Display name (imperial copy). */
  title: string;
  /** One-liner FOMO subtitle. */
  tagline: string;
  /** Min/max house edge expected (sanity bound, 5000-spin sim must land here). */
  edgeBounds: readonly [number, number];
  /** Reduced-motion friendly default tier. */
  defaultTier: "low" | "mid" | "high";
  /** Provably Fair scheme version. */
  pfVersion: 2;
  /** ETA bucket for the Phase 3+ import order. */
  phase: 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export const AETHER_7: readonly GameDescriptor[] = [
  {
    slug: "crash",
    pascal: "Crash",
    title: "Imperial Crash",
    tagline: "황제의 로켓이 추락하기 전 탈출하라",
    edgeBounds: [0.058, 0.064],
    defaultTier: "high",
    pfVersion: 2,
    phase: 3,
  },
  {
    slug: "mines",
    pascal: "Mines",
    title: "Imperial Mines",
    tagline: "보석 그리드에서 황금만 캐내라",
    edgeBounds: [0.055, 0.062],
    defaultTier: "mid",
    pfVersion: 2,
    phase: 4,
  },
  {
    slug: "plinko",
    pascal: "Plinko",
    title: "Imperial Plinko",
    tagline: "16열 황금핀, 256배 분기",
    edgeBounds: [0.058, 0.063],
    defaultTier: "high",
    pfVersion: 2,
    phase: 5,
  },
  {
    slug: "limbo",
    pascal: "Limbo",
    title: "Imperial Limbo",
    tagline: "1,000,000x 목표, 단 한 번의 호흡",
    edgeBounds: [0.058, 0.062],
    defaultTier: "low",
    pfVersion: 2,
    phase: 6,
  },
  {
    slug: "dice",
    pascal: "Dice",
    title: "Imperial Dice",
    tagline: "황제의 주사위, 0.01% 단위 정밀",
    edgeBounds: [0.058, 0.062],
    defaultTier: "low",
    pfVersion: 2,
    phase: 7,
  },
  {
    slug: "wheel",
    pascal: "Wheel",
    title: "Imperial Wheel",
    tagline: "운명의 황금 휠, 50x 슬롯",
    edgeBounds: [0.058, 0.064],
    defaultTier: "mid",
    pfVersion: 2,
    phase: 8,
  },
  {
    slug: "hilo",
    pascal: "Hilo",
    title: "Imperial Hi-Lo",
    tagline: "카드 한 장, 연승의 황제",
    edgeBounds: [0.058, 0.063],
    defaultTier: "low",
    pfVersion: 2,
    phase: 9,
  },
] as const;

export const GAMES_BY_SLUG: Readonly<Record<GameSlug, GameDescriptor>> =
  Object.fromEntries(AETHER_7.map((g) => [g.slug, g])) as Readonly<
    Record<GameSlug, GameDescriptor>
  >;

export function getGame(slug: GameSlug): GameDescriptor {
  return GAMES_BY_SLUG[slug];
}
