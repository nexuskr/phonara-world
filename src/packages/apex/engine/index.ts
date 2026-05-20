// ApexForge Hybrid Engine — public barrel (lazy-import friendly).
export type {
  EngineKind, EngineBackend, EngineTier,
  EngineStats, EngineCapsSnapshot, HybridEngine, CreateOptions,
} from "./types";
export { HybridRenderer } from "./HybridRenderer";
export { detectCaps, peekCaps } from "./EngineCaps";
export { useHybridEngine } from "./hooks";
