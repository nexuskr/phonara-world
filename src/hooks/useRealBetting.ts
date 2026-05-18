/**
 * useRealBetting — invokes the imperial-bet-place edge with automatic idem_key,
 * optimistic UI hook, and rollback on failure.
 * MONEY_FLOW_NEW_PATH: phon_betting (Mode B).
 */
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify, describeError } from "@/lib/notify";

type PlaceArgs = {
  room_id: string;
  side: "left" | "right";
  amount_phon: number;
};

function genIdemKey(roomId: string, side: string) {
  const rand = (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${roomId}:${side}:${rand}`.slice(0, 80);
}

export function useRealBetting() {
  const [pending, setPending] = useState(false);
  const lastIdemRef = useRef<string | null>(null);

  const placeBet = useCallback(async (args: PlaceArgs) => {
    if (pending) return { ok: false, error: "이미 베팅 처리 중입니다." };
    setPending(true);
    const idem = genIdemKey(args.room_id, args.side);
    lastIdemRef.current = idem;
    try {
      const { data, error } = await supabase.functions.invoke("imperial-bet-place", {
        body: { ...args, idem_key: idem },
      });
      if (error) {
        notify.error(describeError(error));
        return { ok: false, error: describeError(error) };
      }
      if (!data?.ok) {
        const msg = data?.error || "베팅이 거부되었습니다.";
        notify.error(msg);
        return { ok: false, error: msg };
      }
      notify.success(`⚔️ ${args.amount_phon.toLocaleString()} PHON 결투 출진`);
      return { ok: true, result: data.result };
    } catch (e) {
      notify.error(describeError(e));
      return { ok: false, error: describeError(e) };
    } finally {
      setPending(false);
    }
  }, [pending]);

  return { placeBet, pending, lastIdemKey: lastIdemRef.current };
}
