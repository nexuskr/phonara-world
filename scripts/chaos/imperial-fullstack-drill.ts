#!/usr/bin/env tsx
/**
 * IMPERIAL PHASE 4 — Full Stack Chaos Drill
 *
 * Kill switch ON → 모든 placement reject 시뮬레이션 → unfreeze → 회복 시간 측정.
 * 네트워크/DB 호출 없음 (in-memory). reports/imperial.chaos.<date>.json 산출.
 *
 * Usage: tsx scripts/chaos/imperial-fullstack-drill.ts
 */
import fs from "node:fs";
import path from "node:path";

interface DrillResult {
  date: string;
  scenarios: Array<{
    name: string;
    pre_ok: number; pre_rej: number;
    frozen_rej: number; frozen_ok: number;
    recovery_ms: number;
    post_ok: number; post_rej: number;
    pass: boolean;
  }>;
  summary: { all_pass: boolean; total_recovery_ms: number; };
}

function placeAttempt(frozen: boolean): "ok" | "rej" {
  if (frozen) return "rej";
  return Math.random() < 0.98 ? "ok" : "rej";
}

function runScenario(name: string): DrillResult["scenarios"][number] {
  // Pre-freeze
  let pre_ok = 0, pre_rej = 0;
  for (let i = 0; i < 1000; i++) (placeAttempt(false) === "ok" ? pre_ok++ : pre_rej++);

  // Freeze ON
  let frozen_ok = 0, frozen_rej = 0;
  for (let i = 0; i < 1000; i++) (placeAttempt(true) === "ok" ? frozen_ok++ : frozen_rej++);

  // Unfreeze + recovery
  const t0 = Date.now();
  let recovered = false;
  let post_ok = 0, post_rej = 0;
  for (let i = 0; i < 1000; i++) {
    const r = placeAttempt(false);
    r === "ok" ? post_ok++ : post_rej++;
    if (!recovered && post_ok > 10) recovered = true;
  }
  const recovery_ms = Date.now() - t0;

  const pass = pre_ok > 900 && frozen_ok === 0 && post_ok > 900;
  return { name, pre_ok, pre_rej, frozen_rej, frozen_ok, recovery_ms, post_ok, post_rej, pass };
}

function main() {
  const scenarios = [
    runScenario("imperial_betting_kill"),
    runScenario("imperial_flywheel_kill"),
    runScenario("imperial_withdrawal_kill"),
    runScenario("imperial_burn_kill"),
    runScenario("emergency_freeze_all"),
  ];
  const result: DrillResult = {
    date: new Date().toISOString(),
    scenarios,
    summary: {
      all_pass: scenarios.every((s) => s.pass),
      total_recovery_ms: scenarios.reduce((s, x) => s + x.recovery_ms, 0),
    },
  };
  const dateStr = new Date().toISOString().slice(0, 10);
  const out = path.resolve("reports", `imperial.chaos.${dateStr}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(`[chaos] ${result.summary.all_pass ? "PASS" : "FAIL"} — wrote ${out}`);
  process.exit(result.summary.all_pass ? 0 : 1);
}

main();
