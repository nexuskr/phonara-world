/**
 * Phase 4 Sprint 2 — Cosmetic Worker Client + Graceful Degradation
 * --------------------------------------------------------------
 * 메인 스레드 어디서나 호출 가능한 thin API.
 *
 * 동작 우선순위:
 *   1. Web Worker 사용 가능 + feature flag ON + 생성 성공 → Worker
 *   2. Worker 생성 실패 / 비활성화 / 저사양 디바이스 → Main Thread fallback
 *   3. fallback 실패까지 발생 → 안전한 기본값(0, 빈 배열) 반환
 *
 * 절대 throw 하지 않는다. 우주 cosmetic은 앱을 죽이면 안 된다.
 */

const FEATURE_FLAG_KEY = "phonara:cosmetic_worker:v1";

let workerPromise: Promise<Worker | null> | null = null;
let nextId = 1;
const inflight = new Map<number, (msg: unknown) => void>();

function flagEnabled(): boolean {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(FEATURE_FLAG_KEY) : null;
    if (raw === "0" || raw === "off" || raw === "false") return false;
    return true; // default ON
  } catch {
    return true;
  }
}

function isLowEndDevice(): boolean {
  try {
    const nav = navigator as Navigator & { deviceMemory?: number; hardwareConcurrency?: number };
    if (typeof nav.deviceMemory === "number" && nav.deviceMemory > 0 && nav.deviceMemory < 2) return true;
    if (typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 && nav.hardwareConcurrency < 2) return true;
  } catch {
    /* noop */
  }
  return false;
}

function workerSupported(): boolean {
  try {
    return typeof Worker !== "undefined";
  } catch {
    return false;
  }
}

async function getWorker(): Promise<Worker | null> {
  if (!workerSupported() || !flagEnabled() || isLowEndDevice()) return null;
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    try {
      // Vite worker import. 실패해도 throw 잡아 fallback.
      const mod = await import("./imperial_cosmetic_worker.ts?worker");
      const W = (mod as { default: new () => Worker }).default;
      const w = new W();
      w.onmessage = (e: MessageEvent<{ id: number } & Record<string, unknown>>) => {
        const cb = inflight.get(e.data.id);
        if (cb) {
          inflight.delete(e.data.id);
          cb(e.data);
        }
      };
      w.onerror = () => {
        // Worker 자체 사망 → 큐 비우고 비활성화
        inflight.forEach((cb) => cb({ ok: false, error: "worker_dead" }));
        inflight.clear();
        workerPromise = Promise.resolve(null);
      };
      return w;
    } catch {
      return null;
    }
  })();
  return workerPromise;
}

function send<T>(payload: Record<string, unknown>, transfer: Transferable[] = []): Promise<T | null> {
  return new Promise((resolve) => {
    let id = -1;
    getWorker().then((w) => {
      if (!w) return resolve(null);
      id = nextId++;
      inflight.set(id, (msg) => resolve(msg as T));
      try {
        w.postMessage({ id, ...payload }, transfer);
      } catch {
        inflight.delete(id);
        resolve(null);
      }
      // 안전망: 1.5s 내 미응답 시 main fallback 으로 위임
      setTimeout(() => {
        if (inflight.has(id)) {
          inflight.delete(id);
          resolve(null);
        }
      }, 1500);
    });
  });
}

/* ──────────── Main-thread fallbacks ──────────── */

function fbNearMiss(reels: number[]): number {
  if (reels.length < 2) return 0;
  let c = 0;
  for (let i = 1; i < reels.length; i++) if (reels[i] === reels[0]) c++;
  return c / (reels.length - 1);
}

function fbMultiplier(from: number, to: number, frames: number): Float32Array {
  const n = Math.max(2, Math.min(240, frames | 0));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out[i] = from + (to - from) * (1 - Math.pow(1 - t, 3));
  }
  return out;
}

function fbParticle(count: number): { xy: Float32Array; vel: Float32Array } {
  const c = Math.max(0, Math.min(500, count | 0)); // fallback 시 cap 축소
  const xy = new Float32Array(c * 2);
  const vel = new Float32Array(c * 2);
  for (let i = 0; i < c; i++) {
    xy[i * 2] = Math.random();
    xy[i * 2 + 1] = Math.random();
    const a = Math.random() * Math.PI * 2;
    const s = 0.2 + Math.random() * 0.8;
    vel[i * 2] = Math.cos(a) * s;
    vel[i * 2 + 1] = Math.sin(a) * s;
  }
  return { xy, vel };
}

function fbFortune(weights: Float32Array, signals: Float32Array): number {
  const n = Math.min(weights.length, signals.length);
  let sum = 0;
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    sum += weights[i] * signals[i];
    wsum += Math.abs(weights[i]);
  }
  if (wsum === 0) return 0;
  return 1 / (1 + Math.exp(-(sum / wsum)));
}

/* ──────────── Public API ──────────── */

export async function calcNearMiss(reels: number[]): Promise<number> {
  const res = await send<{ ok: boolean; score?: number }>({ kind: "near_miss", reels });
  if (res?.ok && typeof res.score === "number") return res.score;
  try {
    return fbNearMiss(reels);
  } catch {
    return 0;
  }
}

export async function calcMultiplierFrames(from: number, to: number, frames = 60): Promise<Float32Array> {
  const res = await send<{ ok: boolean; frames?: Float32Array }>({ kind: "multiplier", from, to, frames });
  if (res?.ok && res.frames) return res.frames;
  try {
    return fbMultiplier(from, to, frames);
  } catch {
    return new Float32Array([from, to]);
  }
}

export async function calcParticles(count: number, seed = Date.now() & 0xffff): Promise<{ xy: Float32Array; vel: Float32Array }> {
  const res = await send<{ ok: boolean; xy?: Float32Array; vel?: Float32Array }>({ kind: "particle", count, seed });
  if (res?.ok && res.xy && res.vel) return { xy: res.xy, vel: res.vel };
  try {
    return fbParticle(count);
  } catch {
    return { xy: new Float32Array(0), vel: new Float32Array(0) };
  }
}

export async function calcFortuneScore(weights: Float32Array, signals: Float32Array): Promise<number> {
  const res = await send<{ ok: boolean; score?: number }>({ kind: "fortune_score", weights, signals }, [
    // 입력은 호출자 측에서 사용 중일 수 있어 transfer 하지 않음.
  ]);
  if (res?.ok && typeof res.score === "number") return res.score;
  try {
    return fbFortune(weights, signals);
  } catch {
    return 0;
  }
}

/** 디버그/관제용: 현재 worker 활성 여부 */
export async function isCosmeticWorkerActive(): Promise<boolean> {
  return (await getWorker()) !== null;
}

/** Kill switch: 런타임 강제 종료 (관제판 / 비상 시) */
export function disableCosmeticWorker(persist = true) {
  try {
    if (persist) localStorage.setItem(FEATURE_FLAG_KEY, "0");
  } catch {
    /* noop */
  }
  workerPromise = Promise.resolve(null);
  inflight.forEach((cb) => cb({ ok: false, error: "disabled" }));
  inflight.clear();
}
