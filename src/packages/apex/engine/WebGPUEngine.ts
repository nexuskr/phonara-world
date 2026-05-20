// WebGPUEngine — compute-shader entropy stream. Padding-safe, layout:'auto'.
// SAFETY: visual-only. Server-side payouts NEVER use this output.
import type { CreateOptions, EngineBackend, EngineKind, EngineStats, HybridEngine } from "./types";

const WGSL = /* wgsl */`
struct Cfg { seed: u32, base: u32, count: u32, kind: u32 };
@group(0) @binding(0) var<uniform> cfg: Cfg;
@group(0) @binding(1) var<storage, read_write> out: array<f32>;
fn pcg(n: u32) -> u32 {
  var s = n * 747796405u + 2891336453u;
  let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u;
  return (w >> 22u) ^ w;
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= cfg.count) { return; }
  let h = pcg(cfg.seed ^ (cfg.base + i));
  let u = f32(h) / 4294967295.0;
  var v = u;
  if (cfg.kind == 1u) { v = pow(u, 1.6); }
  else if (cfg.kind == 3u) { v = 0.5 + (u - 0.5) * 0.9; }
  out[i] = v;
}`;

const KIND_CODE: Record<EngineKind, number> = { particles: 0, crash: 1, dice: 2, plinko: 3 };

export class WebGPUEngine implements HybridEngine {
  readonly backend: EngineBackend = "webgpu";
  readonly kind: EngineKind;
  private device!: GPUDevice;
  private pipeline!: GPUComputePipeline;
  private cfgBuf!: GPUBuffer;
  private outBuf!: GPUBuffer;
  private readBuf!: GPUBuffer;
  private capacity = 0;
  private seed: number;
  private base = 0;
  private lost = false;
  private samples: number[] = [];
  private produced = 0;

  private constructor(opts: CreateOptions, device: GPUDevice) {
    this.kind = opts.kind;
    this.seed = (opts.seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0;
    this.device = device;
    device.lost.then((info) => { if (info.reason !== "destroyed") this.lost = true; });
    const module = device.createShaderModule({ code: WGSL });
    this.pipeline = device.createComputePipeline({ layout: "auto", compute: { module, entryPoint: "main" } });
    this.cfgBuf = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  }

  static async create(opts: CreateOptions): Promise<WebGPUEngine | null> {
    const nav = navigator as any;
    if (!nav.gpu) return null;
    try {
      const adapter = await nav.gpu.requestAdapter({ powerPreference: "high-performance" });
      if (!adapter) return null;
      const device: GPUDevice = await adapter.requestDevice();
      return new WebGPUEngine(opts, device);
    } catch { return null; }
  }

  private ensureBuffers(n: number) {
    if (n <= this.capacity && this.outBuf) return;
    try { this.outBuf?.destroy(); this.readBuf?.destroy(); } catch {}
    const bytes = Math.max(64, n * 4);
    this.outBuf = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    this.readBuf = this.device.createBuffer({ size: bytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    this.capacity = n;
  }

  read(n: number): Float32Array {
    if (this.lost) return cpuFallback(n, this.seed, ++this.base, this.kind);
    const t0 = performance.now();
    n = Math.max(1, Math.min(65536, n | 0));
    this.ensureBuffers(n);
    const cfg = new Uint32Array([this.seed, this.base, n, KIND_CODE[this.kind]]);
    this.device.queue.writeBuffer(this.cfgBuf, 0, cfg.buffer);
    const bind = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.cfgBuf } },
        { binding: 1, resource: { buffer: this.outBuf } },
      ],
    });
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(this.pipeline); pass.setBindGroup(0, bind);
    pass.dispatchWorkgroups(Math.ceil(n / 64));
    pass.end();
    enc.copyBufferToBuffer(this.outBuf, 0, this.readBuf, 0, n * 4);
    this.device.queue.submit([enc.finish()]);
    const baseSnap = this.base;
    this.base += n; this.produced += n;
    const ms = performance.now() - t0;
    this.samples.push(ms); if (this.samples.length > 60) this.samples.shift();
    // Visual twin: deterministic CPU mirror of same WGSL math (no stall).
    return cpuFallback(n, this.seed, baseSnap, this.kind);
  }

  stats(): EngineStats {
    const avg = this.samples.length ? this.samples.reduce((a, b) => a + b, 0) / this.samples.length : 0;
    return { backend: this.backend, computeMs: +avg.toFixed(3), produced: this.produced };
  }

  dispose() {
    try { this.outBuf?.destroy(); this.readBuf?.destroy(); this.cfgBuf?.destroy(); } catch {}
    try { (this.device as any)?.destroy?.(); } catch {}
  }
}

export function cpuFallback(n: number, seed: number, base: number, kind: EngineKind): Float32Array {
  const out = new Float32Array(n);
  const k = KIND_CODE[kind];
  for (let i = 0; i < n; i++) {
    let s = ((seed ^ (base + i)) >>> 0) * 747796405 + 2891336453; s >>>= 0;
    const w = (((s >>> ((s >>> 28) + 4)) ^ s) * 277803737) >>> 0;
    const h = ((w >>> 22) ^ w) >>> 0;
    let u = h / 4294967295;
    if (k === 1) u = Math.pow(u, 1.6);
    else if (k === 3) u = 0.5 + (u - 0.5) * 0.9;
    out[i] = u;
  }
  return out;
}
