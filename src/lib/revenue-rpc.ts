// V17 Revenue Engine — admin-only RPC wrappers + pure helpers.
import { supabase } from "@/integrations/supabase/client";

export type RevenueSource = "subscription" | "ad" | "fee" | "other";

export async function recordRevenueEvent(args: {
  userId?: string | null;
  source: RevenueSource;
  amountKrw: number;
  attributionVideoId?: string | null;
  attributionReferrer?: string | null;
  meta?: Record<string, unknown>;
}): Promise<number> {
  const { data, error } = await (supabase as any).rpc("record_revenue_event", {
    _user_id: args.userId ?? null,
    _source: args.source,
    _amount_krw: args.amountKrw,
    _attribution_video_id: args.attributionVideoId ?? null,
    _attribution_referrer: args.attributionReferrer ?? null,
    _meta: args.meta ?? {},
  });
  if (error) throw error;
  return data as number;
}

/** Plan §10.3 pure formula: revenue = clicks * conversion * arpu_per_click. */
export function calculateRevenue(clicks: number, conversion: number, arpuPerClick = 0.02): number {
  return clicks * conversion * arpuPerClick;
}
