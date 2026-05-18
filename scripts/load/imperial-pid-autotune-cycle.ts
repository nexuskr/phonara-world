#!/usr/bin/env tsx
/**
 * IMPERIAL PHASE 4 — PID Auto-Tune (Relay Feedback + Ziegler-Nichols)
 *
 * Full cycle: 1) Relay feedback로 Ku/Tu 측정 → 2) Ziegler-Nichols로 Kp/Ti/Td 산출
 *           → 3) PID 시뮬레이션으로 정착 시간/오버슈트 검증.
 */
import fs from "node:fs";
import path from "node:path";

function relayFeedback(): { Ku: number; Tu: number } {
  const dt = 0.01; const relayHeight = 1.0; let measured = 0; let u = relayHeight;
  const trace: number[] = [];
  for (let t = 0; t < 5000; t++) {
    u = measured > 0 ? -relayHeight : relayHeight;
    measured += (u - measured * 0.6) * dt;
    trace.push(measured);
  }
  // Find amplitude & period from last half of trace
  const tail = trace.slice(-2500);
  const amp = (Math.max(...tail) - Math.min(...tail)) / 2;
  // crude period: count zero crossings
  let crossings = 0;
  for (let i = 1; i < tail.length; i++) if (tail[i - 1] * tail[i] < 0) crossings++;
  const Tu = (tail.length * dt * 2) / Math.max(1, crossings);
  const Ku = (4 * relayHeight) / (Math.PI * Math.max(1e-6, amp));
  return { Ku, Tu };
}

function zieglerNichols(Ku: number, Tu: number) {
  return { Kp: 0.6 * Ku, Ti: 0.5 * Tu, Td: 0.125 * Tu };
}

function simulate(Kp: number, Ti: number, Td: number) {
  const dt = 0.05; let integ = 0, prev = 0, measured = 0; const setpoint = 1.0;
  let peak = 0, settled = -1;
  for (let t = 0; t < 400; t++) {
    const err = setpoint - measured;
    integ += err * dt;
    const deriv = (err - prev) / dt; prev = err;
    const u = Kp * err + (Kp / Ti) * integ + Kp * Td * deriv;
    measured += (u - measured * 0.5) * dt;
    peak = Math.max(peak, measured);
    if (settled === -1 && Math.abs(measured - setpoint) < 0.02 && t * dt > 1) settled = t * dt;
  }
  return { settled_s: settled, overshoot_pct: ((peak - setpoint) / setpoint) * 100 };
}

function main() {
  const { Ku, Tu } = relayFeedback();
  const gains = zieglerNichols(Ku, Tu);
  const sim = simulate(gains.Kp, gains.Ti, gains.Td);
  const pass = sim.settled_s > 0 && sim.settled_s < 8 && sim.overshoot_pct < 30;
  const report = { date: new Date().toISOString(), relay: { Ku, Tu }, gains, simulation: sim, pass };
  const dateStr = new Date().toISOString().slice(0, 10);
  const out = path.resolve("reports", `imperial.loadtest.pid.${dateStr}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`[pid] ${pass ? "PASS" : "FAIL"} Kp=${gains.Kp.toFixed(3)} Ti=${gains.Ti.toFixed(3)} Td=${gains.Td.toFixed(3)} settled=${sim.settled_s.toFixed(2)}s overshoot=${sim.overshoot_pct.toFixed(1)}% — ${out}`);
  process.exit(pass ? 0 : 1);
}

main();
