// Phase 4 S5 — Fire-and-forget VRF attestation.
// Calls apex-vrf-oracle, swallows all errors. Money-flow 0 touch.
import { supabase } from "@/integrations/supabase/client";

export type AttestArgs = {
  game: string;
  roundRef: string;
  clientSeed?: string;
};

export async function attestRound(args: AttestArgs): Promise<void> {
  try {
    await supabase.functions.invoke("apex-vrf-oracle", {
      body: {
        game: args.game,
        round_ref: args.roundRef,
        client_seed: args.clientSeed ?? null,
      },
    });
  } catch {
    // swallow — attestation is provenance-only
  }
}
