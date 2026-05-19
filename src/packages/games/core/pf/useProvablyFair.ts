/**
 * Phase 2 PF v2 — useProvablyFair hook.
 * Wraps imperial_pf_commit / imperial_pf_reveal / imperial_pf_verify RPCs.
 *
 * Realtime reveal broadcasts are reserved for Phase 3+ game engines, which
 * will publish via @pkg/realtime useGameChannel on key `game:pf:<game>:<round>`
 * once the round closes. The hook stays RPC-only here to keep the surface
 * minimal and money-flow safe.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sha256Hex, timingSafeEqualHex } from "./crypto";

export type PfGame =
  | "crash"
  | "plinko"
  | "roulette"
  | "blackjack"
  | "baccarat"
  | "powerball"
  | "wheel"
  | "mines"
  | "dice"
  | "limbo"
  | "keno";

export interface PfState {
  hash?: string;
  seed?: string;
  revealedAt?: string;
  verified?: boolean;
  loading: boolean;
  error?: string;
}

export interface UseProvablyFairResult {
  state: PfState;
  /** Commit (idempotent) — returns server_seed_hash. */
  commit: () => Promise<string | null>;
  /** Reveal the round's server seed (safe to call multiple times). */
  reveal: () => Promise<string | null>;
  /** Local sha256 + server RPC double-check. */
  verify: (seed?: string, hash?: string, nonce?: number) => Promise<boolean>;
}

export function useProvablyFair(
  game: PfGame,
  roundId: number | bigint | null | undefined,
): UseProvablyFairResult {
  const [state, setState] = useState<PfState>({ loading: false });
  const ridRef = useRef<number | null>(null);

  useEffect(() => {
    ridRef.current = roundId == null ? null : Number(roundId);
  }, [roundId]);

  const commit = useCallback<UseProvablyFairResult["commit"]>(async () => {
    const rid = ridRef.current;
    if (rid == null) return null;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    const { data, error } = await supabase.rpc("imperial_pf_commit", {
      p_game: game,
      p_round_id: rid,
    });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return null;
    }
    const hash = (data as unknown as string) ?? null;
    setState((s) => ({ ...s, loading: false, hash: hash ?? s.hash }));
    return hash;
  }, [game]);

  const reveal = useCallback<UseProvablyFairResult["reveal"]>(async () => {
    const rid = ridRef.current;
    if (rid == null) return null;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    const { data, error } = await supabase.rpc("imperial_pf_reveal", {
      p_game: game,
      p_round_id: rid,
    });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return null;
    }
    const seed = (data as unknown as string) ?? null;
    setState((s) => ({
      ...s,
      loading: false,
      seed: seed ?? s.seed,
      revealedAt: new Date().toISOString(),
    }));
    return seed;
  }, [game]);

  const verify = useCallback<UseProvablyFairResult["verify"]>(
    async (seed, hash, nonce) => {
      const s = (seed ?? state.seed ?? "").trim();
      const h = (hash ?? state.hash ?? "").trim();
      if (!s || !h) {
        setState((cur) => ({ ...cur, verified: false }));
        return false;
      }
      const localHash = await sha256Hex(s);
      const localOk = timingSafeEqualHex(localHash, h.toLowerCase());
      const { data, error } = await supabase.rpc("imperial_pf_verify", {
        p_seed: s,
        p_hash: h,
        p_nonce: Number(nonce ?? 0),
      });
      const serverOk = !error && data === true;
      const ok = localOk && serverOk;
      setState((cur) => ({ ...cur, verified: ok }));
      return ok;
    },
    [state.seed, state.hash],
  );

  return { state, commit, reveal, verify };
}
