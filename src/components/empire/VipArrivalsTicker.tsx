/**
 * VipArrivalsTicker — shows masked nicknames of VIPs that arrived in last 60s.
 * Visible to all authenticated users. Polls every 15s. Hidden when empty.
 * Social proof: "황제가 방금 입장했다."
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hasVerifiedSession } from "@/lib/auth-recovery";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Arrival = { arrived_at: string; nick: string };

export default function VipArrivalsTicker() {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const ok = await hasVerifiedSession();
        if (!ok) return;
        const { data, error } = await supabase.rpc("get_recent_vip_arrivals", { _limit: 6 });
        if (error || !mounted) return;
        setArrivals((data as Arrival[]) ?? []);
      } catch {
        /* ignore */
      }
    }
    load();
    const stop = setVisibleInterval(load, 15_000, { meta: { owner: "VipArrivalsTicker", category: "cosmetic" } });
    return () => {
      mounted = false;
      stop();
    };
  }, []);

  if (arrivals.length === 0) return null;

  return (
    <div className="w-full overflow-hidden border-y border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/10 py-1.5">
      <div className="mx-auto max-w-6xl px-3 flex items-center gap-3">
        <div className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-imperial tracking-widest text-amber-200">
          <Sparkles className="w-3 h-3" /> VIP 입장
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-3 text-xs text-amber-100/90">
            <AnimatePresence mode="popLayout">
              {arrivals.slice(0, 6).map((a) => (
                <motion.span
                  key={a.arrived_at + a.nick}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="whitespace-nowrap"
                >
                  👑 <span className="font-bold">{a.nick}</span>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
