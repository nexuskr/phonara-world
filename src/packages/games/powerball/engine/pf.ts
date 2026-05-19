/** Powerball — Phase 2 PF v2 integration shell. */
import { supabase } from "@/integrations/supabase/client";
import type { PfGame } from "@pkg/games/core";

export const PF_GAME: PfGame = "powerball";

export async function preparePfRound(roundId: number): Promise<{ hash: string | null }> {
  const { data, error } = await supabase.rpc("imperial_pf_commit", {
    p_game: PF_GAME,
    p_round_id: roundId,
  });
  return { hash: error ? null : ((data as unknown as string) ?? null) };
}

export async function revealPfRound(roundId: number): Promise<{ seed: string | null }> {
  const { data, error } = await supabase.rpc("imperial_pf_reveal", {
    p_game: PF_GAME,
    p_round_id: roundId,
  });
  return { seed: error ? null : ((data as unknown as string) ?? null) };
}
