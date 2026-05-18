/**
 * Phase 4 Sprint 2 — Imperial Cosmetic Worker
 * --------------------------------------------------------------
 * 순수 시각 계산만 수행. 머니플로/RPC/DB 접근 절대 금지.
 *
 * 처리 항목 (모두 cosmetic, 결과는 표시용 숫자/좌표 배열):
 *  - near_miss      : 슬롯 릴 결과의 "아슬아슬" 점수 (0..1)
 *  - multiplier     : 카운트업 보간 프레임 (ease-out)
 *  - particle       : 파티클 초기 좌표/속도 (Float32Array)
 *  - fortune_score  : AI Fortune 가벼운 가중 합산
 *
 * Transferable 우선: 입력/출력 Float32Array 는 transfer list 로 전달.
 * 메인 스레드와 GC/jank 를 공유하지 않는 것이 목표.
 */

type Job =
  | { id: number; kind: "near_miss"; reels: number[] }
  | { id: number; kind: "multiplier"; from: number; to: number; frames: number }
  | { id: number; kind: "particle"; count: number; seed: number }
  | { id: number; kind: "fortune_score"; weights: Float32Array; signals: Float32Array };

type Result =
  | { id: number; ok: true; kind: "near_miss"; score: number }
  | { id: number; ok: true; kind: "multiplier"; frames: Float32Array }
  | { id: number; ok: true; kind: "particle"; xy: Float32Array; vel: Float32Array }
  | { id: number; ok: true; kind: "fortune_score"; score: number }
  | { id: number; ok: false; error: string };

// Simple deterministic PRNG (Mulberry32) — UI에만 쓰이므로 보안성 무관.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nearMiss(reels: number[]): number {
  if (reels.length < 2) return 0;
  let close = 0;
  for (let i = 1; i < reels.length; i++) {
    if (reels[i] === reels[0]) close++;
  }
  // 0..1: 첫 릴과 같은 릴 비율
  return close / (reels.length - 1);
}

function multiplierFrames(from: number, to: number, frames: number): Float32Array {
  const n = Math.max(2, Math.min(240, frames | 0));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    // ease-out cubic
    const e = 1 - Math.pow(1 - t, 3);
    out[i] = from + (to - from) * e;
  }
  return out;
}

function particles(count: number, seed: number): { xy: Float32Array; vel: Float32Array } {
  const c = Math.max(0, Math.min(2000, count | 0));
  const xy = new Float32Array(c * 2);
  const vel = new Float32Array(c * 2);
  const rnd = mulberry32(seed || 1);
  for (let i = 0; i < c; i++) {
    xy[i * 2] = rnd();
    xy[i * 2 + 1] = rnd();
    const angle = rnd() * Math.PI * 2;
    const speed = 0.2 + rnd() * 0.8;
    vel[i * 2] = Math.cos(angle) * speed;
    vel[i * 2 + 1] = Math.sin(angle) * speed;
  }
  return { xy, vel };
}

function fortune(weights: Float32Array, signals: Float32Array): number {
  const n = Math.min(weights.length, signals.length);
  let sum = 0;
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    sum += weights[i] * signals[i];
    wsum += Math.abs(weights[i]);
  }
  if (wsum === 0) return 0;
  // squashed to [0,1]
  const raw = sum / wsum;
  return 1 / (1 + Math.exp(-raw));
}

self.onmessage = (e: MessageEvent<Job>) => {
  const job = e.data;
  try {
    switch (job.kind) {
      case "near_miss": {
        const res: Result = { id: job.id, ok: true, kind: "near_miss", score: nearMiss(job.reels) };
        (self as unknown as Worker).postMessage(res);
        return;
      }
      case "multiplier": {
        const frames = multiplierFrames(job.from, job.to, job.frames);
        const res: Result = { id: job.id, ok: true, kind: "multiplier", frames };
        (self as unknown as Worker).postMessage(res, [frames.buffer]);
        return;
      }
      case "particle": {
        const { xy, vel } = particles(job.count, job.seed);
        const res: Result = { id: job.id, ok: true, kind: "particle", xy, vel };
        (self as unknown as Worker).postMessage(res, [xy.buffer, vel.buffer]);
        return;
      }
      case "fortune_score": {
        const res: Result = { id: job.id, ok: true, kind: "fortune_score", score: fortune(job.weights, job.signals) };
        (self as unknown as Worker).postMessage(res);
        return;
      }
      default: {
        const res: Result = { id: (job as { id: number }).id, ok: false, error: "unknown_kind" };
        (self as unknown as Worker).postMessage(res);
      }
    }
  } catch (err) {
    const res: Result = {
      id: (job as { id: number }).id,
      ok: false,
      error: err instanceof Error ? err.message : "worker_exception",
    };
    (self as unknown as Worker).postMessage(res);
  }
};

export {};
