// ApexForge Hybrid Engine — public types.
// money-flow 0 터치: 엔진은 visual/numeric stream만 공급. RPC/payout과 완전 분리.

export type EngineKind = "particles" | "crash" | "dice" | "plinko";
export type EngineBackend = "webgpu" | "wasm" | "cpu";
export type EngineTier = "low" | "mid" | "high";

export interface EngineCapsSnapshot {
  webgpu: boolean;
  wasm: boolean;
  simd: boolean;
  cores: number;
  dpr: number;
  tier: EngineTier;
  vendor?: string;
  adapter?: string;
  reason?: string;
}

export interface EngineStats {
  backend: EngineBackend;
  computeMs: number;  // avg of last 60 reads
  produced: number;
}

export interface HybridEngine {
  readonly kind: EngineKind;
  readonly backend: EngineBackend;
  read(n: number): Float32Array;
  stats(): EngineStats;
  dispose(): void;
}

export interface CreateOptions {
  kind: EngineKind;
  prefer?: EngineBackend;
  seed?: number;
}
