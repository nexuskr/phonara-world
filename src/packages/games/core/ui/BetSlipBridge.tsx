import { lazy, Suspense, type ComponentProps } from "react";

/**
 * P1-06 BetSlipBridge — ZERO-MONEY-FLOW-DIFF adapter.
 *
 * Forwards every prop to the existing `<RealBetSlip />` used by Imperial Duel.
 * This means:
 *   - kill-switch (`imperial_kill_switches`) → already enforced server-side trigger
 *   - frozen flag (`isDuelFrozen`) → already enforced inside RealBetSlip
 *   - leverage gate (`trg_enforce_leverage_gate`) → already enforced server-side
 *   - house-edge split 45/35/15/5 → `_apply_house_edge_split` (unchanged)
 *   - PHON & USDT routing → `imperial_place_phon_bet` family (unchanged)
 *
 * Games NEVER call `supabase.rpc("imperial_place_phon_bet")` directly. They
 * mount `<BetSlipBridge />` and supply only context (`gameSlug`, `round_id`).
 *
 * NOTE: lazy-loaded so games-* chunks don't drag the slip dependency tree.
 */
const RealBetSlip = lazy(() =>
  import("@/components/duel/RealBetSlip").then((m) => ({
    default: m.RealBetSlip ?? (m as any).default,
  })),
);

export type BetSlipBridgeProps = ComponentProps<typeof RealBetSlip> & {
  /** Game slug (manifest). Reserved for future telemetry tagging. */
  gameSlug?: string;
};

export function BetSlipBridge({ gameSlug: _gameSlug, ...rest }: BetSlipBridgeProps) {
  return (
    <Suspense
      fallback={
        <div
          className="imperial-card h-40 animate-pulse rounded-2xl border border-border/40"
          aria-busy
        />
      }
    >
      {/* pass-through; real surface owned by RealBetSlip */}
      <RealBetSlip {...(rest as any)} />
    </Suspense>
  );
}
