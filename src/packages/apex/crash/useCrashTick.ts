// useCrashTick — server-authoritative Crash V2 state via market:apex_crash channel.
// Money flow 0 touch. Bets go via apex_crash_place_bet / apex_crash_cashout RPCs only.
import { useEffect, useRef, useState } from "react";
import { useMarketChannel } from "@/packages/realtime";

export type CrashPhase = "idle" | "pending" | "running" | "busted";

export interface CrashRoundState {
  roundId: string | null;
  roundNo: number | null;
  phase: CrashPhase;
  multiplier: number;
  crashX: number | null;
  serverSeedHash: string | null;
  publicSeed: string | null;
  nonce: number | null;
  serverSeed: string | null; // revealed at bust
  signature: string | null;
  rttMs: number;
  jitterMs: number;
}

const INITIAL: CrashRoundState = {
  roundId: null, roundNo: null, phase: "idle", multiplier: 1, crashX: null,
  serverSeedHash: null, publicSeed: null, nonce: null, serverSeed: null,
  signature: null, rttMs: 0, jitterMs: 0,
};

export function useCrashTick(): CrashRoundState {
  const [state, setState] = useState<CrashRoundState>(INITIAL);
  const lastTickAt = useRef<number>(0);

  useMarketChannel({
    key: "apex_crash",
    bindings: [
      { type: "broadcast", event: "round_pending", handler: (p: any) => setState((s) => ({
        ...s, phase: "pending", roundId: p.payload.round_id, roundNo: p.payload.round_no,
        serverSeedHash: p.payload.server_seed_hash, publicSeed: p.payload.public_seed,
        nonce: p.payload.nonce, serverSeed: null, signature: null, multiplier: 1, crashX: null,
      })) },
      { type: "broadcast", event: "round_running", handler: (p: any) => setState((s) => ({
        ...s, phase: "running", roundId: p.payload.round_id, roundNo: p.payload.round_no, multiplier: 1,
      })) },
      { type: "broadcast", event: "tick", handler: (p: any) => {
        const now = performance.now();
        const dt = lastTickAt.current ? now - lastTickAt.current : 0;
        lastTickAt.current = now;
        setState((s) => ({ ...s, multiplier: Number(p.payload.m), jitterMs: Math.abs(dt - 200) }));
      } },
      { type: "broadcast", event: "round_busted", handler: (p: any) => setState((s) => ({
        ...s, phase: "busted", crashX: Number(p.payload.crash_x), multiplier: Number(p.payload.crash_x),
        serverSeed: p.payload.server_seed ?? null, signature: p.payload.signature ?? null,
      })) },
    ],
  });

  useEffect(() => () => { lastTickAt.current = 0; }, []);
  return state;
}
