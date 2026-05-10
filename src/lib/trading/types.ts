export type Side = "long" | "short";
export type Mode = "paper" | "real";

export type MarginMode = "isolated" | "cross";

export interface LivePosition {
  id: string;
  user_id: string;
  symbol: string;
  side: Side;
  leverage: number;
  margin: number; // bigint (USDT integer credits)
  size: number;
  entry: number;
  liq_price: number;
  fee_open: number;
  status: "open" | "closed" | "liquidated";
  opened_at: string;
  // Margin mode + abs-price triggers (added in 2026-05 migration; nullable for legacy rows).
  margin_mode?: MarginMode;
  allocated_margin?: number | null;
  tp_price?: number | null;
  sl_price?: number | null;
  trailing_offset?: number | null;
  trailing_peak?: number | null;
  // Existing ROI%-based fields are mirrored on the row but not all consumers need them.
  tp_pct?: number | null;
  sl_pct?: number | null;
  trailing_pct?: number | null;
  trailing_active?: boolean;
  trailing_peak_roi_pct?: number | null;
}

export interface LiveTrade {
  id: string;
  user_id: string;
  symbol: string;
  side: Side;
  leverage: number;
  margin: number;
  size: number;
  entry: number;
  close_price: number;
  pnl: number;
  roi: number;
  fee_open: number;
  fee_close: number;
  reason: "manual" | "liquidation" | "adl";
  opened_at: string;
  closed_at: string;
}

/** 25 trading pairs — majors + meme coins. */
export const ARENA_SYMBOLS = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "MATICUSDT",
  "DOTUSDT", "TRXUSDT", "LTCUSDT", "NEARUSDT", "ATOMUSDT",
  "APTUSDT", "SUIUSDT", "ARBUSDT", "OPUSDT", "INJUSDT",
  "PEPEUSDT", "SHIB1000USDT", "WIFUSDT", "BONKUSDT", "FLOKIUSDT",
] as const;

export const FEE_RATE = 0.001; // 0.1%
export const SLIPPAGE = 0.0006; // 0.06% unfavorable
export const INSURANCE_CUT = 0.25;
export const MAX_LEVERAGE = 100;
export const MAX_OPEN_POSITIONS = 5;
