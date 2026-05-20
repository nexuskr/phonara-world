// PR-P0-2 — Global Polling Manager (singleton)
//
// 모든 cosmetic/social polling 의 단일 진입점.
// - 5-단계 priority queue (critical/high/normal/low/cosmetic)
// - adaptive interval = base × activityMul × deviceMul × backoffMul
// - 동시 in-flight 캡 (concurrency ≤ 4)
// - money_flow 카테고리 등록 시 throw (fail-closed)
// - 내부적으로 setVisibleInterval 위에 동작 → visibility/governor 자동 적용
// - DEV ledger 호환 (`trackInterval` 은 setVisibleInterval 안에서 이미 수행)
//
// 머니플로 8경로는 절대 등록 금지. PollingManager 는 표시/소셜 전용.

import { setVisibleInterval } from "@/lib/util/visible-interval";
import type { RuntimeCategory } from "@pkg/runtime";

export type PollPriority = "critical" | "high" | "normal" | "low" | "cosmetic";

export type PollCategory =
  | "money_flow" // 금지 — 등록 시 throw
  | "wallet"
  | "game"
  | "market"
  | "chat"
  | "social"
  | "cosmetic"
  | "admin";

export type RegisterOpts = {
  /** 안정 고유 키. 같은 key 는 단일 인스턴스(ref-count). */
  key: string;
  /** 실행 본문. async OK. */
  fn: () => void | Promise<void>;
  /** 기본 주기 (ms). */
  baseMs: number;
  priority?: PollPriority; // default "cosmetic"
  category?: PollCategory; // default "cosmetic"
  /** 등록 시 즉시 1회 실행. */
  leading?: boolean;
  /** DEV ledger owner 식별자. */
  owner?: string;
};

export class MoneyFlowDenyError extends Error {
  constructor(key: string) {
    super(`[PollingManager] money_flow polling is forbidden (key=${key}). Use BEFORE INSERT triggers / RPCs.`);
    this.name = "MoneyFlowDenyError";
  }
}

type Entry = {
  key: string;
  fn: () => void | Promise<void>;
  baseMs: number;
  priority: PollPriority;
  category: PollCategory;
  owner: string;
  refCount: number;
  stop: () => void;
  // metrics
  lastRunAt: number;
  totalRuns: number;
  totalErrors: number;
  backoffMul: number;
  // adaptive helpers
  currentMs: number;
};

const PRIORITY_ORDER: Record<PollPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  cosmetic: 4,
};

// ──────────────────────────────────────────────────────────────────────────────
// Activity / device multipliers
// ──────────────────────────────────────────────────────────────────────────────
let lastUserActivity = Date.now();
if (typeof window !== "undefined") {
  const mark = () => { lastUserActivity = Date.now(); };
  ["pointerdown", "keydown", "wheel", "touchstart", "focus"].forEach((ev) => {
    window.addEventListener(ev, mark, { passive: true, capture: true });
  });
}

function activityMul(): number {
  // idle 60s+  → 1.5x, 5min+ → 3x (cosmetic 만 영향 크게)
  const idle = Date.now() - lastUserActivity;
  if (idle > 5 * 60_000) return 3;
  if (idle > 60_000) return 1.5;
  return 1;
}

function deviceMul(): number {
  if (typeof navigator === "undefined") return 1;
  // saveData / 2g / 3g 모드면 폴링 보수적
  const conn: any = (navigator as any).connection;
  if (conn?.saveData) return 2;
  if (conn?.effectiveType === "2g") return 3;
  if (conn?.effectiveType === "3g") return 1.5;
  // low memory 디바이스
  const mem = (navigator as any).deviceMemory;
  if (typeof mem === "number" && mem <= 2) return 1.5;
  return 1;
}

// ──────────────────────────────────────────────────────────────────────────────
// Singleton
// ──────────────────────────────────────────────────────────────────────────────
class PollingManagerImpl {
  private entries = new Map<string, Entry>();
  private inFlight = 0;
  private readonly maxConcurrency = 4;
  private savedRequests = 0; // adaptive 로 인해 스킵된 횟수

  register(opts: RegisterOpts): () => void {
    const category: PollCategory = opts.category ?? "cosmetic";
    const priority: PollPriority = opts.priority ?? "cosmetic";

    // Fail-closed: money_flow 는 등록 자체 금지
    if (category === "money_flow") {
      throw new MoneyFlowDenyError(opts.key);
    }

    const existing = this.entries.get(opts.key);
    if (existing) {
      existing.refCount += 1;
      return () => this.unregister(opts.key);
    }

    const entry: Entry = {
      key: opts.key,
      fn: opts.fn,
      baseMs: Math.max(500, opts.baseMs),
      priority,
      category,
      owner: opts.owner ?? `poll:${opts.key}`,
      refCount: 1,
      lastRunAt: 0,
      totalRuns: 0,
      totalErrors: 0,
      backoffMul: 1,
      currentMs: Math.max(500, opts.baseMs),
      stop: () => {},
    };

    // adaptive scheduler. RuntimeCategory 는 4-value enum.
    // money_flow 는 위에서 throw 되었으므로 여기서는 admin/그외만.
    const runtimeCat: RuntimeCategory = category === "admin" ? "admin" : "cosmetic";

    const tick = async () => {
      // adaptive interval gate
      const mul = activityMul() * deviceMul() * entry.backoffMul;
      const adjusted = Math.round(entry.baseMs * mul);
      entry.currentMs = adjusted;

      const due = Date.now() - entry.lastRunAt >= adjusted;
      if (!due) {
        this.savedRequests += 1;
        return;
      }

      // concurrency cap — cosmetic/low 는 양보
      if (this.inFlight >= this.maxConcurrency && PRIORITY_ORDER[priority] >= PRIORITY_ORDER.normal) {
        this.savedRequests += 1;
        return;
      }

      this.inFlight += 1;
      entry.lastRunAt = Date.now();
      try {
        await entry.fn();
        entry.totalRuns += 1;
        // 성공 → backoff 회복
        entry.backoffMul = Math.max(1, entry.backoffMul * 0.7);
      } catch (err) {
        entry.totalErrors += 1;
        // 실패 → exp backoff (cap 8x)
        entry.backoffMul = Math.min(8, Math.max(1.5, entry.backoffMul * 2));
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[PollingManager] ${opts.key} failed:`, err);
        }
      } finally {
        this.inFlight = Math.max(0, this.inFlight - 1);
      }
    };

    entry.stop = setVisibleInterval(tick, entry.baseMs, {
      leading: !!opts.leading,
      catchUpOnVisible: true,
      meta: { owner: entry.owner, category: runtimeCat },
    });

    this.entries.set(opts.key, entry);
    return () => this.unregister(opts.key);
  }

  private unregister(key: string) {
    const e = this.entries.get(key);
    if (!e) return;
    e.refCount -= 1;
    if (e.refCount <= 0) {
      try { e.stop(); } catch {}
      this.entries.delete(key);
    }
  }

  /** 수동 즉시 실행 (사용자 인터랙션 응답용). 캡/스로틀 무시. */
  async runNow(key: string): Promise<void> {
    const e = this.entries.get(key);
    if (!e) return;
    try {
      await e.fn();
      e.totalRuns += 1;
      e.lastRunAt = Date.now();
    } catch (err) {
      e.totalErrors += 1;
      throw err;
    }
  }

  snapshot() {
    const list = Array.from(this.entries.values()).map((e) => ({
      key: e.key,
      owner: e.owner,
      priority: e.priority,
      category: e.category,
      baseMs: e.baseMs,
      currentMs: e.currentMs,
      backoffMul: Number(e.backoffMul.toFixed(2)),
      refCount: e.refCount,
      totalRuns: e.totalRuns,
      totalErrors: e.totalErrors,
      lastRunAt: e.lastRunAt,
    }));

    // calls/min 추정 (현재 주기 기반)
    let callsPerMin = 0;
    for (const e of this.entries.values()) {
      if (e.currentMs > 0) callsPerMin += 60_000 / e.currentMs;
    }

    return {
      activeCount: this.entries.size,
      inFlight: this.inFlight,
      savedRequests: this.savedRequests,
      callsPerMin: Math.round(callsPerMin),
      pollers: list,
    };
  }
}

export const PollingManager = new PollingManagerImpl();

// DEV: window 노출 (디버깅 / Health Dock)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as any).__pollingManager = PollingManager;
}
