/**
 * Stress Test Simulator — Phonara Risk Engine V5
 *
 * STRICT ISOLATION RULES (do not violate):
 *  - Mock data lives ONLY in module-scope memory of THIS file (per-tab session).
 *  - Never mutates oracle_prices, live_open_position, or any production RPC.
 *  - Never reaches REAL execution path. SIM events are tagged + logged via
 *    risk_engine_log_sim() with event_type='SIM_*' (schema-level separation).
 *  - Toggleable via setStressEnabled(); when off, getMockOverrides() returns null.
 *  - Pure paper/sandbox harness — calls calculateRiskKernel() directly.
 */
import { supabase } from "@/integrations/supabase/client";
import { calculateRiskKernel, DEFAULT_MMR, type RiskValidationResult } from "./risk-engine";

/* ---------- Per-session in-memory state (NEVER persisted) ---------- */

type Overrides = {
  oracleDelayMs: number;          // 0 = no spike
  equityVolatilityPct: number;    // 0..100
  liquidationLeverage: number;    // 0 = off
  liquidationNearMissPct: number; // 0..100
};

const state: { enabled: boolean; overrides: Overrides; metrics: {
  lastLatencyMs: number;
  equityVolatility: number;
  totalRuns: number;
  rejects: number;
  warns: number;
  passes: number;
  nearMisses: number;
}} = {
  enabled: false,
  overrides: {
    oracleDelayMs: 0,
    equityVolatilityPct: 0,
    liquidationLeverage: 0,
    liquidationNearMissPct: 0,
  },
  metrics: {
    lastLatencyMs: 0,
    equityVolatility: 0,
    totalRuns: 0,
    rejects: 0,
    warns: 0,
    passes: 0,
    nearMisses: 0,
  },
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => { try { l(); } catch {} }); }

export function subscribeStress(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function getStressState() { return { ...state, overrides: { ...state.overrides }, metrics: { ...state.metrics } }; }
export function isStressEnabled() { return state.enabled; }

export function setStressEnabled(on: boolean) {
  state.enabled = on;
  if (!on) {
    state.overrides = { oracleDelayMs: 0, equityVolatilityPct: 0, liquidationLeverage: 0, liquidationNearMissPct: 0 };
  }
  emit();
}

export function resetStressMetrics() {
  state.metrics = { lastLatencyMs: 0, equityVolatility: 0, totalRuns: 0, rejects: 0, warns: 0, passes: 0, nearMisses: 0 };
  emit();
}

/* ---------- Helpers ---------- */

async function logSim(args: {
  symbol: string;
  result: RiskValidationResult;
  leverage: number;
  eventType: "SIM_oracle_spike" | "SIM_equity_volatility" | "SIM_liquidation_pressure" | "SIM_full_flow";
}) {
  // best-effort fire-and-forget; never throws into caller
  void supabase.rpc("risk_engine_log_sim" as any, {
    p_symbol: args.symbol,
    p_status: args.result.status,
    p_rpi: args.result.rpi,
    p_safety_distance: args.result.safetyDistance,
    p_leverage: args.leverage,
    p_event_type: args.eventType,
    p_reason: args.result.reason ?? null,
  }).then(() => {}, () => {});
}

function bumpMetrics(r: RiskValidationResult) {
  state.metrics.totalRuns += 1;
  if (r.status === "REJECT") state.metrics.rejects += 1;
  else if (r.status === "WARN") state.metrics.warns += 1;
  else state.metrics.passes += 1;
  if (r.rpi >= 0.94 && r.rpi < 0.96) state.metrics.nearMisses += 1;
  emit();
}

/* ---------- Public simulation primitives ---------- */

/**
 * Simulate an oracle latency spike: pause `delayMs`, then run a paper
 * validation against a synthetic mark price. Pure mock — does NOT touch
 * oracle_refresh or oracle_prices.
 */
export async function oracleSpikeSimulator(opts: {
  delayMs: 2000 | 8000 | 15000;
  symbol?: string;
  markPrice?: number;
  leverage?: number;
  margin?: number;
}): Promise<RiskValidationResult & { latencyMs: number }> {
  if (!state.enabled) throw new Error("stress disabled");
  const symbol = opts.symbol ?? "BTCUSDT";
  const markPrice = opts.markPrice ?? 65000;
  const leverage = opts.leverage ?? 25;
  const margin = opts.margin ?? 100;
  state.overrides.oracleDelayMs = opts.delayMs;
  emit();
  const t0 = performance.now();
  await new Promise((r) => setTimeout(r, opts.delayMs));
  const latencyMs = performance.now() - t0;
  state.metrics.lastLatencyMs = Math.round(latencyMs);
  const qty = (margin * leverage) / markPrice;
  // Stale oracle proxy: heavier MMR penalty proportional to staleness.
  const mmrPenalty = DEFAULT_MMR * (1 + opts.delayMs / 5000);
  const result = calculateRiskKernel(
    { equity: margin * 10, positionValue: qty * markPrice, leverage, mmr: mmrPenalty },
    markPrice,
    qty,
  );
  bumpMetrics(result);
  void logSim({ symbol, result, leverage, eventType: "SIM_oracle_spike" });
  return { ...result, latencyMs };
}

/**
 * Inject equity volatility — runs validation against an equity value
 * randomly perturbed by ±volatilityPercent.
 */
export async function equityVolatilityInjector(opts: {
  volatilityPercent: number; // 0..100
  symbol?: string;
  markPrice?: number;
  leverage?: number;
  margin?: number;
}): Promise<RiskValidationResult & { equityUsed: number }> {
  if (!state.enabled) throw new Error("stress disabled");
  const v = Math.min(100, Math.max(0, opts.volatilityPercent));
  state.overrides.equityVolatilityPct = v;
  state.metrics.equityVolatility = v;
  emit();
  const symbol = opts.symbol ?? "BTCUSDT";
  const markPrice = opts.markPrice ?? 65000;
  const leverage = opts.leverage ?? 25;
  const margin = opts.margin ?? 100;
  const baseEquity = margin * 10;
  const perturb = (Math.random() * 2 - 1) * (v / 100);
  const equity = Math.max(margin, baseEquity * (1 + perturb));
  const qty = (margin * leverage) / markPrice;
  const result = calculateRiskKernel(
    { equity, positionValue: qty * markPrice, leverage, mmr: DEFAULT_MMR },
    markPrice,
    qty,
  );
  bumpMetrics(result);
  void logSim({ symbol, result, leverage, eventType: "SIM_equity_volatility" });
  return { ...result, equityUsed: equity };
}

/**
 * Drive RPI toward 0.94..0.96 (near-miss zone) by tightening equity to
 * approach the maintenance margin boundary. Pure synthetic.
 */
export async function liquidationPressureSimulator(opts: {
  leverage: number;
  nearMissPercent?: number; // bias toward near-miss (0..100)
  symbol?: string;
  markPrice?: number;
  margin?: number;
}): Promise<RiskValidationResult> {
  if (!state.enabled) throw new Error("stress disabled");
  const leverage = Math.max(1, opts.leverage);
  const nearMiss = Math.min(100, Math.max(0, opts.nearMissPercent ?? 47));
  state.overrides.liquidationLeverage = leverage;
  state.overrides.liquidationNearMissPct = nearMiss;
  emit();
  const symbol = opts.symbol ?? "BTCUSDT";
  const markPrice = opts.markPrice ?? 65000;
  const margin = opts.margin ?? 100;
  const qty = (margin * leverage) / markPrice;
  const positionValue = qty * markPrice;
  const mm = positionValue * DEFAULT_MMR;
  // Target RPI uniformly in [0.94, 0.96] with `nearMiss` probability,
  // else random in [0.30, 0.92].
  const targetRpi = Math.random() * 100 < nearMiss
    ? 0.94 + Math.random() * 0.02
    : 0.30 + Math.random() * 0.62;
  const equity = mm / targetRpi;
  const result = calculateRiskKernel(
    { equity, positionValue, leverage, mmr: DEFAULT_MMR },
    markPrice,
    qty,
  );
  bumpMetrics(result);
  void logSim({ symbol, result, leverage, eventType: "SIM_liquidation_pressure" });
  return result;
}

/**
 * Full-flow auto test — repeats LONG/SHORT validations across a synthetic
 * matrix of leverage/equity. PAPER ONLY. Never touches live_open_position.
 */
export async function fullFlowAutoTest(opts: {
  repeatCount: number;
  symbol?: string;
  markPrice?: number;
  onTick?: (i: number, total: number, r: RiskValidationResult) => void;
}): Promise<{ pass: number; warn: number; reject: number; nearMiss: number }> {
  if (!state.enabled) throw new Error("stress disabled");
  const total = Math.min(500, Math.max(1, opts.repeatCount));
  const symbol = opts.symbol ?? "BTCUSDT";
  const markPrice = opts.markPrice ?? 65000;
  const acc = { pass: 0, warn: 0, reject: 0, nearMiss: 0 };
  for (let i = 0; i < total; i++) {
    const leverage = [5, 10, 25, 50, 100][i % 5];
    const margin = 50 + (i % 7) * 25;
    const equityFactor = 2 + Math.random() * 18;
    const qty = (margin * leverage) / markPrice;
    const r = calculateRiskKernel(
      { equity: margin * equityFactor, positionValue: qty * markPrice, leverage, mmr: DEFAULT_MMR },
      markPrice,
      qty,
    );
    if (r.status === "PASS") acc.pass++;
    else if (r.status === "WARN") acc.warn++;
    else acc.reject++;
    if (r.rpi >= 0.94 && r.rpi < 0.96) acc.nearMiss++;
    bumpMetrics(r);
    void logSim({ symbol, result: r, leverage, eventType: "SIM_full_flow" });
    opts.onTick?.(i + 1, total, r);
    // yield to keep 60fps
    if (i % 10 === 9) await new Promise((res) => setTimeout(res, 0));
  }
  return acc;
}
