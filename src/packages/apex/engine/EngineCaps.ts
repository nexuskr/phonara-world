// EngineCaps — WebGPU + WASM SIMD + tier detection. Never throws, cached.
import type { EngineCapsSnapshot, EngineTier } from "./types";

// Minimal SIMD probe (v128 const + drop). WebAssembly.validate-only.
const SIMD_PROBE = new Uint8Array([
  0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11,
]);

let cached: EngineCapsSnapshot | null = null;
let inflight: Promise<EngineCapsSnapshot> | null = null;

function detectSIMD(): boolean {
  try { return typeof WebAssembly === "object" && WebAssembly.validate(SIMD_PROBE); }
  catch { return false; }
}

function classifyTier(cores: number, dpr: number, gpu: boolean): EngineTier {
  if (gpu && cores >= 8) return "high";
  if (gpu || cores >= 4) return "mid";
  if (cores <= 2 || (dpr <= 1 && cores <= 4)) return "low";
  return "mid";
}

export async function detectCaps(force = false): Promise<EngineCapsSnapshot> {
  if (cached && !force) return cached;
  if (inflight && !force) return inflight;
  inflight = (async () => {
    const nav = navigator as any;
    const wasm = typeof WebAssembly !== "undefined";
    const simd = wasm && detectSIMD();
    const cores = Math.max(1, navigator.hardwareConcurrency || 2);
    const dpr = window.devicePixelRatio || 1;

    let webgpu = false, vendor: string | undefined, adapter: string | undefined, reason: string | undefined;
    if (nav.gpu && typeof nav.gpu.requestAdapter === "function") {
      try {
        const ad = await nav.gpu.requestAdapter({ powerPreference: "high-performance" });
        if (ad) {
          webgpu = true;
          const info = (ad as any).info ?? {};
          vendor = info.vendor; adapter = info.architecture;
        } else { reason = "no-adapter"; }
      } catch (e: any) { reason = `adapter-error:${e?.message ?? "unknown"}`; }
    } else { reason = "no-gpu-api"; }

    const snap: EngineCapsSnapshot = {
      webgpu, wasm, simd, cores, dpr,
      tier: classifyTier(cores, dpr, webgpu),
      vendor, adapter, reason,
    };
    cached = snap; inflight = null; return snap;
  })();
  return inflight;
}

export function peekCaps(): EngineCapsSnapshot | null { return cached; }
