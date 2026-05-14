/**
 * Korean-friendly mapping for trading RPC errors.
 * Use mapTradingError(error.message) to convert raw Postgres / RPC strings
 * into a single user-facing line. Returns the original message unchanged
 * if no rule matches.
 */

const RULES: Array<{ test: RegExp; out: string }> = [
  { test: /시장가 동기화/, out: "시장가 동기화가 일시적으로 지연되었습니다. 5초 후 다시 시도해 주세요." },
  { test: /시장가와 차이가 너무 큽니다/, out: "현재 시장가와 차이가 큽니다. 가격이 안정된 후 다시 시도해 주세요." },
  { test: /54000/, out: "시장가 동기화 중입니다. 잠시 후 다시 시도해 주세요." },
  { test: /insufficient[_ ]?balance/i, out: "잔액이 부족합니다." },
  { test: /leverage_exceeds_phon_tier/i, out: "현재 PHON 보유량으로는 이 레버리지를 사용할 수 없습니다." },
  { test: /cross_position_not_adjustable/i, out: "Cross 마진 포지션은 개별 마진 조정이 불가능합니다." },
  { test: /allocated_below_minimum/i, out: "할당 마진이 최소치보다 작습니다." },
  { test: /position not found/i, out: "포지션을 찾을 수 없습니다." },
  { test: /account_frozen/i, out: "계정이 일시적으로 동결되어 있습니다." },
  { test: /rate[_ ]?limit/i, out: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
  { test: /not authenticated|42501/i, out: "로그인이 필요합니다." },
  { test: /max[_ ]?open[_ ]?positions/i, out: "동시에 보유 가능한 최대 포지션 수에 도달했습니다." },
];

export function mapTradingError(raw?: string | null): string {
  if (!raw) return "주문 처리 중 알 수 없는 오류가 발생했습니다.";
  for (const r of RULES) if (r.test.test(raw)) return r.out;
  return raw;
}

/** Per-symbol leverage memory (Bybit-style: leverage persists per symbol). */
const LEV_KEY = (sym: string) => `tradelev:${sym}`;
export function loadSymbolLeverage(symbol: string, fallback = 20): number {
  try {
    const v = localStorage.getItem(LEV_KEY(symbol));
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= 125 ? n : fallback;
  } catch { return fallback; }
}
export function saveSymbolLeverage(symbol: string, lev: number): void {
  try { localStorage.setItem(LEV_KEY(symbol), String(lev)); } catch { /* noop */ }
}
