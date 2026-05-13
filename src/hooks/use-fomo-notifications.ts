import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { subscribePostgres } from "@/lib/realtime-bus";

const FOMO_RPC_DISABLED_KEY = "phonara_disable_fomo_rpc";

export type FomoNotification = {
  id: string;
  kind: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  priority: number;
  read_at: string | null;
  created_at: string;
  expires_at: string;
};

export function useFomoNotifications() {
  const user = useRequireAuth();
  const [items, setItems] = useState<FomoNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (typeof window !== "undefined" && sessionStorage.getItem(FOMO_RPC_DISABLED_KEY) === "1") {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_my_fomo_notifications", { _limit: 10 });
      if (error) {
        if ((error as { code?: string }).code === "PGRST301" || /401|400|unauthorized|bad request/i.test(error.message ?? "")) {
          try { sessionStorage.setItem(FOMO_RPC_DISABLED_KEY, "1"); } catch { /* noop */ }
        }
        setItems([]);
        setLoading(false);
        return;
      }
      setItems((data ?? []) as FomoNotification[]);
    } catch {
      setItems([]); // fallback when backend unreachable
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(FOMO_RPC_DISABLED_KEY) === "1") return;
    return subscribePostgres(
      {
        key: `fomo:user:${user.id}`,
        table: "fomo_notifications",
        event: "INSERT",
        filter: `user_id=eq.${user.id}`,
      },
      () => void load(),
    );
  }, [user, load]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)));
    await supabase.rpc("mark_fomo_notification_read", { _id: id });
  }, []);

  const unread = items.filter((x) => !x.read_at);
  return { items, unread, loading, markRead, reload: load };
}
