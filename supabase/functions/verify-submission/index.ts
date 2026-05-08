// PR3 v6 — verify-submission
// Deterministic rule verdict + bounded AI observation (no reward context).
// AI never affects verdict. Circuit-open => AI skipped. Drift/error => event recorded.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// AI output strict enum (no reward / value / credit / ltv tokens)
const ALLOWED_REASONS = new Set([
  "pattern_match",
  "timing_anomaly",
  "device_collision",
  "velocity_spike",
  "chain_anomaly",
  "proof_quality_low",
  "normal",
]);

type AiOutcome =
  | "observed"
  | "fallback_rule_only"
  | "circuit_open"
  | "skipped";

interface BoundedAIResponse {
  risk_score: number;
  reasons: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const submission_id: string | undefined = body?.submission_id;

    if (!submission_id || typeof submission_id !== "string") {
      return json({ error: "missing_submission_id" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // 1) Circuit state (read-only)
    const { data: circuit, error: circuitErr } = await supabase
      .from("viral_ai_circuit_state")
      .select("state")
      .eq("id", 1)
      .single();

    if (circuitErr) throw circuitErr;

    // 2) RULE FIRST — deterministic verdict, always
    const { data: rule, error: ruleErr } = await supabase.rpc(
      "rule_verify_submission",
      { p_submission_id: submission_id },
    );

    if (ruleErr) throw ruleErr;

    const verdict =
      (rule as { status: "valid" | "invalid" | "suspect" }).status;

    // 3) AI — observation only, never affects verdict
    let ai_outcome: AiOutcome = "skipped";

    if (circuit?.state === "open") {
      ai_outcome = "circuit_open";
      await recordEvent(supabase, submission_id, "ai_skipped_circuit_open", {
        telemetry: { state: "open" },
      });
    } else {
      try {
        const aiResp = await callBoundedAI(submission_id);

        const drift =
          !aiResp ||
          typeof aiResp.risk_score !== "number" ||
          !Number.isFinite(aiResp.risk_score) ||
          aiResp.risk_score < 0 ||
          aiResp.risk_score > 100 ||
          !Array.isArray(aiResp.reasons) ||
          aiResp.reasons.some(
            (r) => typeof r !== "string" || !ALLOWED_REASONS.has(r),
          ) ||
          Object.keys(aiResp).some(
            (k) => k !== "risk_score" && k !== "reasons",
          );

        if (drift) {
          ai_outcome = "fallback_rule_only";
          await recordEvent(supabase, submission_id, "ai_drift_alert", {
            telemetry: {
              reason: "schema_drift",
              raw: JSON.stringify(aiResp).slice(0, 500),
            },
          });
        } else {
          ai_outcome = "observed";
          await recordEvent(supabase, submission_id, "ai_signal", {
            telemetry: aiResp,
          });
        }
      } catch (err) {
        ai_outcome = "fallback_rule_only";
        await recordEvent(supabase, submission_id, "ai_error", {
          telemetry: {
            message: String((err as Error)?.message ?? err).slice(0, 300),
          },
        });
      }
    }

    // 4) Response — verdict is 100% rule-derived
    return json({
      submission_id,
      verdict,
      ai_outcome,
    });
  } catch (err) {
    console.error("verify-submission error:", err);
    return json(
      { error: (err as Error)?.message ?? "internal_error" },
      500,
    );
  }
});

// ---------- helpers ----------

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function recordEvent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  submission_id: string,
  event_type: string,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from("viral_verification_events").insert({
    submission_id,
    event_type,
    signals_raw: {
      ...payload,
      observed_at: new Date().toISOString(),
    },
  });
  if (error) {
    console.error("event_insert_failed", event_type, error);
  }
}

// Bounded AI call — placeholder. Replace with real model call when wiring up.
// Must NEVER receive reward/value/credit/ltv/revenue context.
async function callBoundedAI(
  _submission_id: string,
): Promise<BoundedAIResponse> {
  return {
    risk_score: Math.floor(Math.random() * 50),
    reasons: ["normal"],
  };
}
