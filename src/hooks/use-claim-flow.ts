/**
 * useClaimFlow — shared claim handler for the AI bot cards.
 * Runs the RPC, classifies the outcome (success / partial / cap_reached),
 * logs analytics, refreshes the daily cap, and exposes modal state for the UI.
 */
import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { classifyClaim, buildClaimTelemetry, type ClaimOutcome } from "@/lib/claim-result";
import { track } from "@/lib/telemetry";
import { notify } from "@/lib/notify";

export interface ClaimFlowResult {
  ok: boolean;
  reward: number;
  pnl_pct: number | null;
}

export interface ClaimContext {
  /** Bot kind (content / trading / image). */
  kind: string;
  /** Frontend-computed expected reward (BASE * boost). */
  expected: number;
  /** Daily cap remaining BEFORE the claim — used for telemetry. */
  capLeftBefore: number | null;
}

export interface ClaimModalState {
  open: boolean;
  outcome: ClaimOutcome;
  expected: number;
  actual: number;
  pnl_pct: number | null;
  capRemaining: number;
  shared: boolean;
  /** Frozen run snapshot for sharing after the modal opens. */
  runId: string | null;
}

const DEFAULT_STATE: ClaimModalState = {
  open: false, outcome: "success", expected: 0, actual: 0,
  pnl_pct: null, capRemaining: 0, shared: false, runId: null,
};

export function useClaimFlow(opts: {
  reloadCap: () => Promise<void>;
  capRemainingAfter: () => number;
  errorTitle: string;
}) {
  const [modal, setModal] = useState<ClaimModalState>(DEFAULT_STATE);

  const runClaim = useCallback(async (
    runId: string,
    ctx: ClaimContext,
  ): Promise<ClaimFlowResult | null> => {
    try {
      const { data, error } = await supabase.rpc("claim_ai_bot_run", { _run_id: runId });
      if (error) {
        const m = error.message || "";
        if (m.includes("not_ready")) throw new Error("not_ready");
        if (m.includes("already_claimed")) throw new Error("already_claimed");
        throw error;
      }
      const r = data as unknown as ClaimFlowResult;
      const outcome = classifyClaim({
        expected: ctx.expected,
        actual: r?.reward ?? 0,
        capLeftBefore: ctx.capLeftBefore,
      });

      // Fire-and-forget structured telemetry — never blocks UI.
      void track("convert", {
        surface: "ai_bot_claim",
        variant: outcome,
        meta: buildClaimTelemetry(ctx.kind, {
          expected: ctx.expected,
          actual: r?.reward ?? 0,
          capLeftBefore: ctx.capLeftBefore,
        }, outcome, { run_id: runId, pnl_pct: r?.pnl_pct ?? null }),
      });

      // Console breadcrumb for support-side debugging.
      console.info("[claim_ai_bot_run]", {
        run_id: runId, kind: ctx.kind, outcome,
        expected: ctx.expected, actual: r?.reward ?? 0,
        cap_left_before: ctx.capLeftBefore, pnl_pct: r?.pnl_pct ?? null,
      });

      await opts.reloadCap();

      setModal({
        open: true,
        outcome,
        expected: ctx.expected,
        actual: r?.reward ?? 0,
        pnl_pct: r?.pnl_pct ?? null,
        capRemaining: opts.capRemainingAfter(),
        shared: false,
        runId,
      });

      return r;
    } catch (e: any) {
      notify.error(opts.errorTitle, { description: e?.message ?? String(e) });
      return null;
    }
  }, [opts]);

  const closeModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);
  const markShared = useCallback(() => setModal((m) => ({ ...m, shared: true })), []);

  return { modal, runClaim, closeModal, markShared };
}
