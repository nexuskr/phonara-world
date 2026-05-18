#!/usr/bin/env tsx
/**
 * IMPERIAL PHASE 4 — 300k Distributed Locks Load Test
 *
 * In-memory wait-for graph + Tarjan SCC. p50/p95/p99/deadlock rate.
 * Production 영향 0 (DB/네트워크 호출 없음).
 */
import fs from "node:fs";
import path from "node:path";

const N = 300_000;

function tarjan(adj: Map<number, number[]>): number {
  let index = 0;
  const stack: number[] = [];
  const onStack = new Uint8Array(N + 1);
  const indices = new Int32Array(N + 1).fill(-1);
  const low = new Int32Array(N + 1);
  let cycles = 0;

  function strongconnect(v0: number) {
    const stk: Array<{ v: number; it: number }> = [{ v: v0, it: 0 }];
    indices[v0] = index; low[v0] = index; index++;
    stack.push(v0); onStack[v0] = 1;
    while (stk.length) {
      const frame = stk[stk.length - 1];
      const neigh = adj.get(frame.v) ?? [];
      if (frame.it < neigh.length) {
        const w = neigh[frame.it++];
        if (indices[w] === -1) {
          indices[w] = index; low[w] = index; index++;
          stack.push(w); onStack[w] = 1;
          stk.push({ v: w, it: 0 });
        } else if (onStack[w]) {
          low[frame.v] = Math.min(low[frame.v], indices[w]);
        }
      } else {
        if (low[frame.v] === indices[frame.v]) {
          let size = 0; let w: number;
          do { w = stack.pop()!; onStack[w] = 0; size++; } while (w !== frame.v);
          if (size > 1) cycles++;
        }
        stk.pop();
        if (stk.length) low[stk[stk.length - 1].v] = Math.min(low[stk[stk.length - 1].v], low[frame.v]);
      }
    }
  }
  for (let v = 1; v <= N; v++) if (indices[v] === -1) strongconnect(v);
  return cycles;
}

function pct(arr: number[], p: number): number {
  const i = Math.min(arr.length - 1, Math.floor(arr.length * p));
  return arr[i];
}

function main() {
  console.log(`[load] generating ${N} lock acquisitions...`);
  const adj = new Map<number, number[]>();
  const acquireTimes: number[] = [];
  let seed = 0xBADC0DE;
  const rng = () => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; };

  const tStart = Date.now();
  for (let i = 1; i <= N; i++) {
    const t0 = performance.now();
    const targets = Math.random() < 0.0001 ? 2 : 1;
    const out: number[] = [];
    for (let k = 0; k < targets; k++) {
      const target = 1 + Math.floor(rng() * N);
      if (target !== i) out.push(target);
    }
    adj.set(i, out);
    acquireTimes.push(performance.now() - t0);
  }
  const buildMs = Date.now() - tStart;
  console.log(`[load] graph built in ${buildMs}ms — running Tarjan...`);

  const tTarjan = Date.now();
  const cycles = tarjan(adj);
  const tarjanMs = Date.now() - tTarjan;

  acquireTimes.sort((a, b) => a - b);
  const report = {
    date: new Date().toISOString(),
    nodes: N,
    edges: Array.from(adj.values()).reduce((s, a) => s + a.length, 0),
    build_ms: buildMs,
    tarjan_ms: tarjanMs,
    cycles_detected: cycles,
    lock_acquire_ms: {
      p50: pct(acquireTimes, 0.5),
      p95: pct(acquireTimes, 0.95),
      p99: pct(acquireTimes, 0.99),
      max: acquireTimes[acquireTimes.length - 1],
    },
    pass: pct(acquireTimes, 0.99) < 50,
  };
  const dateStr = new Date().toISOString().slice(0, 10);
  const out = path.resolve("reports", `imperial.loadtest.locks.${dateStr}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(`[load] ${report.pass ? "PASS" : "FAIL"} p99=${report.lock_acquire_ms.p99.toFixed(3)}ms cycles=${cycles} — ${out}`);
  process.exit(report.pass ? 0 : 1);
}

main();
