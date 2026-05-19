/**
 * @pkg/games/core — barrel
 * Primitives + manifest + perf hooks + object pool + Provably Fair v2.
 */
export * from "./ui";
export * from "./manifest";
export * from "./constants";
export { useViewportPause } from "./hooks/useViewportPause";
export { useGameFrame } from "./hooks/useGameFrame";
export { ObjectPool, type Poolable } from "./engine/objectPool";
export * from "./pf";
