import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminBadgeSource } from "@/pages/admin/_nav";

export type PendingCounts = Partial<Record<AdminBadgeSource, number>>;

/**
 * Realtime pending counts for admin sidebar/header badges.
 * Single channel per admin session, debounced refresh.
 */
export function useAdminPending(enabled: boolean): PendingCounts {
  const [counts, setCounts] = useState<PendingCounts>({});
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;

    const refresh = async () => {
      const [dep, wd, aml, refund, anom] = await Promise.all([
        supabase.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("aml_reviews" as any).select("id", { count: "exact", head: true }).eq("status", "pending").then(
          (r) => r,
          () => ({ count: 0 } as any),
        ),
        supabase.from("refund_requests" as any).select("id", { count: "exact", head: true }).eq("status", "pending").then(
          (r) => r,
          () => ({ count: 0 } as any),
        ),
        supabase.from("anomaly_events" as any).select("id", { count: "exact", head: true }).is("acknowledged_at", null).then(
          (r) => r,
          () => ({ count: 0 } as any),
        ),
      ]);
      if (!alive) return;
      setCounts({
        deposits_pending: dep.count ?? 0,
        withdrawals_pending: wd.count ?? 0,
        aml_pending: (aml as any).count ?? 0,
        refund_pending: (refund as any).count ?? 0,
        anomalies_unack: (anom as any).count ?? 0,
      });
    };

    const schedule = () => {
      if (tRef.current) window.clearTimeout(tRef.current);
      tRef.current = window.setTimeout(refresh, 800);
    };

    refresh();
    const ch = supabase
      .channel("admin:pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "deposit_requests" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "anomaly_events" }, schedule)
      .on("postgres_changes", { event: "*", schema: "public", table: "refund_requests" }, schedule)
      .subscribe();

    return () => {
      alive = false;
      if (tRef.current) window.clearTimeout(tRef.current);
      supabase.removeChannel(ch);
    };
  }, [enabled]);

  return counts;
}
