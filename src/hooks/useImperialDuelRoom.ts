/**
 * useImperialDuelRoom — subscribes to a duel room's state + broadcast events.
 * MONEY_FLOW_NEW_PATH: phon_betting (Mode B). Uses `useGameChannel` per PR-J.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameChannel } from "@pkg/realtime";

export type DuelState = {
  room_id: string;
  status: "open" | "locked" | "settled" | "cancelled";
  left_pot: number;
  right_pot: number;
  total_pot: number;
  settle_at: string | null;
  winner_side: "left" | "right" | null;
  signals?: {
    near_miss_intensity?: number;
    cinematic_level?: number;
    perceived_win_rate?: number;
  };
};

export function useImperialDuelRoom(roomId: string | null) {
  const [state, setState] = useState<DuelState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!roomId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc("imperial_get_duel_state", {
        p_room_id: roomId,
      });
      if (rpcErr) throw rpcErr;
      setState(data as unknown as DuelState);
    } catch (e: any) {
      setError(e?.message ?? "duel_state_failed");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => { void refresh(); }, [refresh]);

  useGameChannel({
    channelKey: roomId ? `imperial_duel:${roomId}` : "",
    bindings: roomId
      ? [
          {
            kind: "broadcast",
            event: "bet_placed",
            handler: () => { void refresh(); },
          },
          {
            kind: "broadcast",
            event: "settled",
            handler: (payload: any) => {
              setState((s) => s ? ({ ...s, ...(payload?.payload?.result ?? {}) }) : s);
              void refresh();
            },
          },
        ]
      : [],
    enabled: !!roomId,
  });

  return { state, loading, error, refresh };
}
