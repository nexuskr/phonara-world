// Phase 4 S5 — Hook: fire VRF attestation when a round settles.
// Game money-flow code remains untouched; this only requires the round id.
import { useEffect, useRef } from "react";
import { attestRound } from "./attestRound";

export function useAttestOnSettle(opts: {
  game: string;
  roundRef: string | null | undefined;
  clientSeed?: string;
  enabled?: boolean;
}) {
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (opts.enabled === false) return;
    if (!opts.roundRef) return;
    if (fired.current === opts.roundRef) return;
    fired.current = opts.roundRef;
    attestRound({ game: opts.game, roundRef: opts.roundRef, clientSeed: opts.clientSeed });
  }, [opts.game, opts.roundRef, opts.clientSeed, opts.enabled]);
}
