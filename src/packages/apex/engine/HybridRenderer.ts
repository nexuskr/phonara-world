// HybridRenderer — WebGPU → WASM-SIMD → CPU auto-router. Never throws.
import type { CreateOptions, HybridEngine } from "./types";
import { detectCaps } from "./EngineCaps";
import { WebGPUEngine } from "./WebGPUEngine";
import { WASMEngine } from "./WASMEngine";

export const HybridRenderer = {
  async create(opts: CreateOptions): Promise<HybridEngine> {
    const caps = await detectCaps();
    const want = opts.prefer;
    if (want !== "wasm" && want !== "cpu" && caps.webgpu) {
      const e = await WebGPUEngine.create(opts);
      if (e) return e;
    }
    if (want !== "cpu" && caps.wasm) return WASMEngine.create(opts, caps.simd);
    return WASMEngine.create(opts, false);
  },
};

export type { HybridEngine, CreateOptions } from "./types";
