// WASMEngine — CPU fast-path with 4-wide loop unroll (SIMD-friendly).
// Pure TS today; future drop-in: hand-tuned wasm32 SIMD module with same API.
import type { CreateOptions, EngineBackend, EngineKind, EngineStats, HybridEngine } from "./types";

export class WASMEngine implements HybridEngine {
  readonly backend: EngineBackend;
  readonly kind: EngineKind;
  private seed: number;
  private base = 0;
  private samples: number[] = [];
  private produced = 0;
  private buf = new Float32Array(1024);

  constructor(opts: CreateOptions, public readonly simd: boolean) {
    this.kind = opts.kind;
    this.seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.backend = simd ? "wasm" : "cpu";
  }

  static create(opts: CreateOptions, simd: boolean): WASMEngine { return new WASMEngine(opts, simd); }

  read(n: number): Float32Array {
    n = Math.max(1, Math.min(65536, n | 0));
    if (n > this.buf.length) this.buf = new Float32Array(n);
    const t0 = performance.now();
    const out = this.buf.subarray(0, n);
    const seed = this.seed, base = this.base;
    const kf = this.kind === "crash" ? 1 : this.kind === "plinko" ? 2 : 0;
    let i = 0;
    for (; i + 4 <= n; i += 4) {
      out[i]     = mix(seed, base + i, kf);
      out[i + 1] = mix(seed, base + i + 1, kf);
      out[i + 2] = mix(seed, base + i + 2, kf);
      out[i + 3] = mix(seed, base + i + 3, kf);
    }
    for (; i < n; i++) out[i] = mix(seed, base + i, kf);
    this.base += n; this.produced += n;
    const ms = performance.now() - t0;
    this.samples.push(ms); if (this.samples.length > 60) this.samples.shift();
    return out.slice();
  }

  stats(): EngineStats {
    const avg = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 0;
    return { backend: this.backend, computeMs: +avg.toFixed(3), produced: this.produced };
  }

  dispose() { this.buf = new Float32Array(0); }
}

function mix(seed: number, idx: number, kind: number): number {
  let s = (((seed ^ idx) >>> 0) * 747796405 + 2891336453) >>> 0;
  const w = (((s >>> ((s >>> 28) + 4)) ^ s) * 277803737) >>> 0;
  const h = ((w >>> 22) ^ w) >>> 0;
  const u = h / 4294967295;
  if (kind === 1) return Math.pow(u, 1.6);
  if (kind === 2) return 0.5 + (u - 0.5) * 0.9;
  return u;
}
