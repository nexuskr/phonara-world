/**
 * @pkg/games/core/ui — 12 God-Tier Primitives v1.0
 *
 * P1-01 GameShell           — IntersectionObserver auto-pause + imperial card surface
 * P1-02 GameCanvas          — DPR-clamped Canvas2D + ResizeObserver imperative handle
 * P1-03 GameHUD             — pure presentational overlay (left/center/right)
 * P1-04 SpinReel            — GPU translate3d virtualized reel (transform-only repaint)
 * P1-05 PayoutBurst         — object-pooled particles + reduced-motion fallback
 * P1-06 BetSlipBridge       — lazy adapter to RealBetSlip (ZERO money-flow diff)
 * P1-07 ProvablyFairBadge   — commit/reveal/verify dialog (Phase 2 wires RPCs)
 * P1-08 JackpotTicker       — useGameChannel broadcast counter (no raw channel)
 * P1-09 SoundDeck           — sanctioned wrapper over useSlotSound + Imperial Thunder
 * P1-10 HapticPulse         — navigator.vibrate gate via @/lib/haptics
 * P1-11 RNGVisualizer       — entropy bead row (fairness signal)
 * P1-12 GameErrorBoundary   — soft boundary with notify + imperial fallback
 */
export { GameShell, type GameShellProps } from "./GameShell";
export { GameCanvas, type GameCanvasHandle, type GameCanvasProps } from "./GameCanvas";
export { GameHUD, type GameHUDProps } from "./GameHUD";
export { SpinReel, type SpinReelProps } from "./SpinReel";
export { PayoutBurst, type PayoutBurstProps } from "./PayoutBurst";
export { BetSlipBridge, type BetSlipBridgeProps } from "./BetSlipBridge";
export {
  ProvablyFairBadge,
  type ProvablyFairBadgeProps,
} from "./ProvablyFairBadge";
export { JackpotTicker, type JackpotTickerProps } from "./JackpotTicker";
export { SoundDeck, type SoundDeckProps } from "./SoundDeck";
export { HapticPulse, type HapticPulseProps } from "./HapticPulse";
export { RNGVisualizer, type RNGVisualizerProps } from "./RNGVisualizer";
export { GameErrorBoundary } from "./GameErrorBoundary";
