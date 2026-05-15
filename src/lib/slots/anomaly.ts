import { supabase } from "@/integrations/supabase/client";

export type SlotAnomalyKind =
  | "spin_failed"
  | "sound_init_failed"
  | "payout_mismatch"
  | "overlay_timeout";

export async function logSlotAnomaly(
  kind: SlotAnomalyKind,
  gameCode: string | null,
  expected: number | null,
  actual: number | null,
  meta: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { data: u } = await supabase.auth.getUser();
    const user_id = u?.user?.id ?? null;
    await (supabase as any).from("slot_anomaly_log").insert({
      user_id,
      game_code: gameCode,
      kind,
      expected,
      actual,
      meta,
    });
  } catch {
    // best-effort; never throw from telemetry
  }
}
