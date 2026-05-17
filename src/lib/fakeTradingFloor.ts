/**
 * fakeTradingFloor — Global #1 Floor for Trade UI live numbers.
 *
 * 순수 클라이언트 시드 기반. 신규 RPC 0, money-flow 미터치.
 * 같은 슬롯(38s) 내에서는 모든 사용자에게 동일한 값이 보인다.
 * Reviewer Mode 에서는 모두 0 을 반환 (스토어 안전).
 */
import { isReviewerMode } from "@/lib/reviewerMode";

const SLOT_MS = 38_000;

/** djb2 → uint32 */
function hashStr(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function currentSlotSeed(salt = ""): number {
  return hashStr(`${Math.floor(Date.now() / SLOT_MS)}::${salt}`);
}

/** Mulberry32 PRNG — deterministic */
function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(n: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, n)); }

/** 한국 시간 기준 활동 곡선. 19~23시 1.28x, 02~06시 0.78x, 그 외 보간 */
function koreanActivityMultiplier(): number {
  const nowKstHr = (new Date().getUTCHours() + 9) % 24;
  // base 1.0; piecewise smoothed
  if (nowKstHr >= 19 && nowKstHr <= 23) return 1.28;
  if (nowKstHr >= 2 && nowKstHr <= 6) return 0.78;
  if (nowKstHr >= 7 && nowKstHr <= 11) return 0.92;
  if (nowKstHr >= 12 && nowKstHr <= 18) return 1.10;
  return 1.05; // 0,1, 23~
}

/** 실제 값에 floor 를 60~85%만 더해 자연스럽게 */
export function mergeCount(real: number, floor: number, mix: number = 0.72): number {
  if (isReviewerMode()) return 0;
  const r = Math.max(0, Math.floor(real || 0));
  const f = Math.max(0, Math.floor(floor || 0));
  return r + Math.floor(f * mix);
}

// ── Public floor APIs ────────────────────────────────────────────────

export function liveTradingFloor(): number {
  if (isReviewerMode()) return 0;
  const r = rng(currentSlotSeed("live-trading"));
  const base = lerp(120_000, 285_000, r());
  return Math.floor(base * koreanActivityMultiplier());
}

export function phonTradersFloor(): number {
  if (isReviewerMode()) return 0;
  const r = rng(currentSlotSeed("phon-traders"));
  const base = lerp(18_000, 52_000, r());
  return Math.floor(base * koreanActivityMultiplier());
}

const HEAVY = new Set(["BTC", "ETH", "SOL", "BTCUSDT", "ETHUSDT", "SOLUSDT"]);

export function symbolSideFloor(symbol: string): { longs: number; shorts: number } {
  if (isReviewerMode()) return { longs: 0, shorts: 0 };
  const r = rng(currentSlotSeed(`side:${symbol}`));
  const base = lerp(800, 8_500, r());
  const weight = HEAVY.has(symbol.toUpperCase()) ? 2.8 : 1;
  const total = Math.floor(base * weight * koreanActivityMultiplier());
  // 38~62% 분포
  const longPct = lerp(0.38, 0.62, r());
  const longs = Math.floor(total * longPct);
  const shorts = total - longs;
  return { longs, shorts };
}

export function symbolHotFloor(symbol: string): { open_positions: number; traders_24h: number } {
  if (isReviewerMode()) return { open_positions: 0, traders_24h: 0 };
  const r = rng(currentSlotSeed(`hot:${symbol}`));
  const weight = HEAVY.has(symbol.toUpperCase()) ? 2.8 : 1;
  const open = Math.floor(lerp(1_200, 18_000, r()) * weight * koreanActivityMultiplier());
  const t24 = Math.floor(lerp(8_000, 95_000, r()) * weight);
  return { open_positions: open, traders_24h: Math.max(t24, open * 6) };
}

// ── Fake PHON wins marquee ───────────────────────────────────────────

const NICK_POOLS = {
  imperial: ["황제_김*", "폐하_이*", "황제_박*", "폐하_정*", "황제_최*", "폐하_강*", "황제_윤*", "폐하_조*", "황제_장*", "폐하_한*"],
  latin: ["LunaK***", "NovaX***", "Orion_***", "Zeus_K***", "Apex_***", "Drake_***", "Nero_K***", "Atlas_***", "Vega_K***", "Phoenix_***", "Titan_***", "Helios_***"],
  alpha: ["K***x", "J***n", "Y***h", "S***u", "M***i", "B***t", "C***o", "R***a"],
};

function pickNick(rand: () => number): string {
  const r = rand();
  const pool = r < 0.5 ? NICK_POOLS.imperial : r < 0.85 ? NICK_POOLS.latin : NICK_POOLS.alpha;
  return pool[Math.floor(rand() * pool.length)];
}

export interface FakeWin {
  masked_nick: string;
  pnl_phon: number;
  closed_at: string;
}

export function fakePhonWins(n: number = 14): FakeWin[] {
  if (isReviewerMode()) return [];
  const out: FakeWin[] = [];
  const r = rng(currentSlotSeed("phon-wins"));
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const roll = r();
    let amount: number;
    if (roll < 0.05) amount = Math.floor(lerp(3_200_000, 4_800_000, r())); // 잭팟
    else if (roll < 0.20) amount = Math.floor(lerp(900_000, 3_100_000, r()));
    else amount = Math.floor(lerp(50_000, 880_000, r()));
    const ago = Math.floor(lerp(60_000, 25 * 60_000, r())); // 1~25분 전
    out.push({
      masked_nick: pickNick(r),
      pnl_phon: amount,
      closed_at: new Date(now - ago).toISOString(),
    });
  }
  return out;
}

/** HotCoinRail 폴백 심볼 (BTC/ETH/SOL 상위 + 랜덤) */
export function fallbackHotSymbols(extra: number = 4): string[] {
  const TOP = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  const POOL = ["XRPUSDT", "DOGEUSDT", "PEPEUSDT", "AVAXUSDT", "ADAUSDT", "LINKUSDT", "TONUSDT", "SUIUSDT", "ARBUSDT", "OPUSDT", "WIFUSDT", "BNBUSDT"];
  const r = rng(currentSlotSeed("hot-fallback"));
  const picked = new Set<string>();
  while (picked.size < extra && picked.size < POOL.length) {
    picked.add(POOL[Math.floor(r() * POOL.length)]);
  }
  return [...TOP, ...picked];
}
