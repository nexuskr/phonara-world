/**
 * @pkg/entropy/entropy.map — re-export classification helpers for convenience.
 *
 * The actual logic lives in @pkg/runtime/runtime.lattice (single source of truth).
 */
export { inferCategoryFromStack, inferOwnerFromStack } from "@pkg/runtime";

/**
 * Static ignorelist for false-positive `setInterval` text matches.
 * These tokens look like setInterval call sites to plain regex/grep but are NOT
 * native browser interval calls — they are local function names that happen to
 * be called `setInterval`. The DEV `window.setInterval` override never sees them.
 *
 * Pattern: "<path>:<line>" relative to repo root.
 */
export const SETINTERVAL_FALSE_POSITIVES: ReadonlyArray<string> = [
  // ChartWithHeader timeframe setter — local React state setter destructured as
  // `[interval, setInterval]`. Not a runtime loop. (Confirmed PR-E.)
  "src/components/trading/ChartWithHeader.tsx:97",
] as const;
