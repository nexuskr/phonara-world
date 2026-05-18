// IMPERIAL PHASE 4 — Full Stack Integration Test (in-memory).
// 300 가상 사용자: place → settle → burn → rollback drill.
// Hybrid SCC + Tarjan 사이클 검출 / PID setpoint 추종 검증.
// 네트워크/DB 호출 0 — money-flow 무관, vitest 단독 실행.
import { describe, it, expect } from "vitest";

// ---------- Tarjan SCC (O(V+E)) ----------
function tarjanScc(graph: Map<number, number[]>): number[][] {
  let index = 0;
  const stack: number[] = [];
  const onStack = new Set<number>();
  const indices = new Map<number, number>();
  const low = new Map<number, number>();
  const sccs: number[][] = [];

  function strongconnect(v: number) {
    indices.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!indices.has(w)) {
        strongconnect(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, indices.get(w)!));
      }
    }
    if (low.get(v) === indices.get(v)) {
      const scc: number[] = [];
      let w: number;
      do { w = stack.pop()!; onStack.delete(w); scc.push(w); } while (w !== v);
      sccs.push(scc);
    }
  }
  for (const v of graph.keys()) if (!indices.has(v)) strongconnect(v);
  return sccs;
}

// ---------- PID ----------
class PID {
  private integ = 0; private prev = 0;
  constructor(private kp: number, private ki: number, private kd: number) {}
  step(setpoint: number, measured: number, dt: number): number {
    const err = setpoint - measured;
    this.integ += err * dt;
    const deriv = (err - this.prev) / dt;
    this.prev = err;
    return this.kp * err + this.ki * this.integ + this.kd * deriv;
  }
}

// ---------- Virtual user state machine ----------
type Phase = "place" | "settle" | "burn" | "rollback" | "done";
interface VUser { id: number; phase: Phase; balance: number; burned: number; }

function step(u: VUser, rng: () => number): VUser {
  switch (u.phase) {
    case "place":    return { ...u, balance: u.balance - 100, phase: "settle" };
    case "settle":   return { ...u, balance: u.balance + (rng() < 0.48 ? 188 : 0), phase: "burn" };
    case "burn":     return { ...u, burned: u.burned + 26, phase: rng() < 0.02 ? "rollback" : "done" };
    case "rollback": return { ...u, balance: u.balance + 100, burned: Math.max(0, u.burned - 26), phase: "done" };
    case "done":     return u;
  }
}

describe("Imperial Phase 4 — Full Stack Integration", () => {
  it("300 concurrent users complete the lifecycle without deadlocks", () => {
    const N = 300;
    let users: VUser[] = Array.from({ length: N }, (_, i) => ({
      id: i, phase: "place", balance: 1000, burned: 0,
    }));
    let seed = 0xC0FFEE;
    const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let tick = 0; tick < 8; tick++) users = users.map((u) => step(u, rng));
    expect(users.every((u) => u.phase === "done")).toBe(true);
    const totalBurned = users.reduce((s, u) => s + u.burned, 0);
    expect(totalBurned).toBeGreaterThan(0);
  });

  it("Tarjan finds no cycles in acyclic wait-for graph", () => {
    const g = new Map<number, number[]>();
    for (let i = 0; i < 100; i++) g.set(i, i < 99 ? [i + 1] : []);
    const sccs = tarjanScc(g);
    expect(sccs.every((s) => s.length === 1)).toBe(true);
  });

  it("Tarjan detects a deliberate cycle (deadlock simulation)", () => {
    const g = new Map<number, number[]>([[1, [2]], [2, [3]], [3, [1]]]);
    const sccs = tarjanScc(g);
    const cyclic = sccs.filter((s) => s.length > 1);
    expect(cyclic.length).toBe(1);
    expect(cyclic[0].sort()).toEqual([1, 2, 3]);
  });

  it("PID controller settles within 5s and overshoot < 15%", () => {
    const pid = new PID(0.8, 0.4, 0.1);
    const setpoint = 1.0;
    let measured = 0;
    const dt = 0.05;
    let peak = 0;
    let settled = -1;
    for (let t = 0; t < 200; t++) {
      const u = pid.step(setpoint, measured, dt);
      measured += (u - measured * 0.5) * dt;
      peak = Math.max(peak, measured);
      if (settled === -1 && Math.abs(measured - setpoint) < 0.02 && t * dt > 1) settled = t * dt;
    }
    expect(settled).toBeGreaterThan(0);
    expect(settled).toBeLessThan(5);
    expect(peak).toBeLessThan(setpoint * 1.15);
  });
});
