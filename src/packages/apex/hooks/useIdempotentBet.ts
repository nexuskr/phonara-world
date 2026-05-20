/**
 * useIdempotentBet — wraps apex_place_bet_v2 with client-side dedup + cache.
 * Server is the source of truth for idempotency (advisory_xact_lock + idempotency_key).
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { notify, describeError } from "@/lib/notify";
import { newIdemKey, cacheIdem, readIdem, dedupeInflight } from "@/packages/apex/lib/idempotency";
import type { ApexGameCode, ApexPlayResult } from "@/packages/apex/games/useApexGame";

export interface PlaceBetArgs {
  gameCode: ApexGameCode;
  betPhon?: number;
  betUsdt?: number;
  params?: Record<string, unknown>;
  idemKey?: string;
}

export function useIdempotentBet() {
  const [pending, setPending] = useState(false);
  const [lastResult, setLastResult] = useState<ApexPlayResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const place = useCallback(async (args: PlaceBetArgs): Promise<ApexPlayResult | null> => {
    const key = args.idemKey ?? newIdemKey(args.gameCode);
    const cached = readIdem<ApexPlayResult>(key);
    if (cached) {
      setLastResult(cached);
      return cached;
    }
    setPending(true);
    setError(null);
    try {
      const res = await dedupeInflight(key, async () => {
        const { data, error } = await supabase.rpc("apex_place_bet_v2" as any, {
          _game_code: args.gameCode,
          _bet_phon: args.betPhon ?? 0,
          _bet_usdt: args.betUsdt ?? 0,
          _params: (args.params ?? {}) as any,
          _idem_key: key,
        });
        if (error) throw error;
        return data as unknown as ApexPlayResult;
      });
      if (!res?.ok) {
        const msg = res?.error ?? "베팅 실패";
        setError(msg);
        notify.warning(msg, {
          description: "잔액·일일 한도(50회)·정지 여부를 확인해 주세요.",
        });
        return null;
      }
      cacheIdem(key, res);
      setLastResult(res);
      return res;
    } catch (e) {
      const msg = describeError(e);
      setError(msg);
      notify.error("게임 오류", { description: msg });
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  return { place, pending, lastResult, error };
}
