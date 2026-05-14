/**
 * Risk Engine Level 4 — Bybit/Binance-lite, Phonara-compressed.
 * ALL math lives here. SQL RPC returns raw data only.
 *
 * Decision is PRIORITY-ORDERED via if/else-if. No `||` short-circuit logic
 * is allowed inside the decision branches (each tier is its own block).
 */

import { supabase } from "@/integrations/supabase/client";

export type RiskKernelInput = {
  /** available_balance (cross wallet equity) — single source of truth. */
  equity: number;
  /** qty × markPrice */
  positionValue: number;
  leverage: number;
  /** maintenance margin rate (e.g. 0.005 = 0.5%) */
  mmr: number;
};

export type RiskStatus = "PASS" | "WARN" | "REJECT";

export type RiskValidationResult = {
  status: RiskStatus;
  rpi: number;
  safetyDistance: number;
  /** machine-readable reason key */
  reason?: string;
  /** echo-back fields for UI */
  positionValue: number;
  initialMargin: number;
  maintenanceMargin: number;
};

/** Default maintenance margin rate when not provided per-symbol. */
export const DEFAULT_MMR = 0.005;

/**
 * Pure kernel — given input data + markPrice + qty, return PASS/WARN/REJECT.
 *
 * positionValue = qty × markPrice
 * IM            = positionValue / leverage
 * MM            = positionValue × mmr
 * RPI           = MM / equity
 * safetyDistance = (equity - MM) / equity   ← FIXED FORMULA, do not modify.
 */
export function calculateRiskKernel(
  input: RiskKernelInput,
  markPrice: number,
  qty: number,
): RiskValidationResult {
  const equity = Number(input.equity) || 0;
  const leverage = Math.max(1, Number(input.leverage) || 1);
  const mmr = Math.max(0, Number(input.mmr) || DEFAULT_MMR);

  const positionValue = Math.max(0, qty * markPrice);
  const initialMargin = positionValue / leverage;
  const maintenanceMargin = positionValue * mmr;

  if (equity <= 0 || positionValue <= 0) {
    return {
      status: "REJECT",
      rpi: 1,
      safetyDistance: 0,
      reason: "INSUFFICIENT_EQUITY",
      positionValue,
      initialMargin,
      maintenanceMargin,
    };
  }

  const rpi = maintenanceMargin / equity;
  const safetyDistance = (equity - maintenanceMargin) / equity;

  // PRIORITY-ORDERED — strict if / else-if. No `||` between tiers.
  // Tier 1: HARD REJECT
  if (rpi >= 0.95) {
    return { status: "REJECT", rpi, safetyDistance, reason: "RISK_TOO_HIGH",
      positionValue, initialMargin, maintenanceMargin };
  } else if (safetyDistance < 0.03) {
    return { status: "REJECT", rpi, safetyDistance, reason: "LIQUIDATION_TOO_CLOSE",
      positionValue, initialMargin, maintenanceMargin };
  }
  // Tier 2: SOFT REJECT
  else if (rpi >= 0.75) {
    return { status: "REJECT", rpi, safetyDistance, reason: "RISK_TOO_HIGH",
      positionValue, initialMargin, maintenanceMargin };
  }
  // Tier 3: WARN
  else if (rpi >= 0.5) {
    return { status: "WARN", rpi, safetyDistance, reason: "RISK_WARNING",
      positionValue, initialMargin, maintenanceMargin };
  } else if (safetyDistance < 0.07) {
    return { status: "WARN", rpi, safetyDistance, reason: "RISK_WARNING",
      positionValue, initialMargin, maintenanceMargin };
  }
  // Tier 4: PASS
  else {
    return { status: "PASS", rpi, safetyDistance,
      positionValue, initialMargin, maintenanceMargin };
  }
}

/**
 * Wrapper: call live_pre_trade_validate (raw data only) and run the kernel.
 * Returns { status, rpi, safetyDistance, reason } for the UI to act on.
 */
export async function preTradeValidate(args: {
  symbol: string;
  side: "long" | "short";
  leverage: number;
  margin: number;        // user-input margin (used to compute qty)
  markPriceFallback?: number;
}): Promise<RiskValidationResult & { markPrice: number; equity: number }> {
  const { data, error } = await supabase.rpc("live_pre_trade_validate", {
    p_symbol: args.symbol,
  } as never);

  let markPrice = args.markPriceFallback ?? 0;
  let equity = 0;
  let mmr = DEFAULT_MMR;

  if (!error && data && typeof data === "object") {
    const d = data as { mark_price?: number; equity?: number; mmr?: number };
    if (typeof d.mark_price === "number" && d.mark_price > 0) markPrice = d.mark_price;
    if (typeof d.equity === "number") equity = d.equity;
    if (typeof d.mmr === "number" && d.mmr > 0) mmr = d.mmr;
  }

  const qty = markPrice > 0 ? (args.margin * args.leverage) / markPrice : 0;
  const positionValue = qty * markPrice;

  const result = calculateRiskKernel(
    { equity, positionValue, leverage: args.leverage, mmr },
    markPrice,
    qty,
  );

  // Telemetry: log REJECT/WARN for admin dashboard (best-effort, fire-and-forget).
  if (result.status !== "PASS") {
    void supabase.rpc("risk_engine_log", {
      p_symbol: args.symbol,
      p_status: result.status,
      p_rpi: result.rpi,
      p_safety_distance: result.safetyDistance,
      p_leverage: args.leverage,
      p_reason: result.reason ?? null,
    } as never).then(() => {}, () => {});
  }

  return { ...result, markPrice, equity };
}
