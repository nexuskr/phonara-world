/**
 * useFairnessBadge — PF commit/reveal lifecycle convenience wrapper.
 * Wraps useProvablyFair with auto commit on `armed`, auto reveal on `revealed`.
 */
import { useEffect } from "react";
import { useProvablyFair, type PfGame } from "@pkg/games/core";

export function useFairnessBadge(
  game: PfGame,
  roundId: number | null | undefined,
  armed: boolean,
  revealed: boolean,
) {
  const pf = useProvablyFair(game, roundId ?? null);

  useEffect(() => {
    if (!armed || !roundId) return;
    pf.commit().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, roundId]);

  useEffect(() => {
    if (!revealed || !roundId) return;
    pf.reveal().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, roundId]);

  return pf;
}
