/**
 * useVipRoom — VIP Trading Room 노출 게이트.
 * VIP Pass 활성 OR Empire level >= 7 (Baron+).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVipPass } from "@/hooks/use-vip-pass";

export interface VipRoomGate {
  unlocked: boolean;
  reason: "vip" | "baron" | null;
  empireLevel: number;
  loading: boolean;
}

export function useVipRoom(): VipRoomGate {
  const vip = useVipPass();
  const [empireLevel, setEmpireLevel] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (alive) { setLoading(false); } return; }
        const { data } = await supabase
          .from("profiles")
          .select("empire_level")
          .eq("id", user.id)
          .maybeSingle();
        if (!alive) return;
        setEmpireLevel(Number((data as any)?.empire_level) || 0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const isVip = !!vip?.active;
  const isBaron = empireLevel >= 7;
  return {
    unlocked: isVip || isBaron,
    reason: isVip ? "vip" : isBaron ? "baron" : null,
    empireLevel,
    loading: loading || vip?.loading,
  };
}
