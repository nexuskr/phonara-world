import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type TopEmperor = {
  user_mask: string;
  total_crown: number;
  empire_level: number;
  flag: string;
};

function fmt(n: number) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Math.round(n).toLocaleString();
}

export default function TopEmperorBanner() {
  const [emp, setEmp] = useState<TopEmperor | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.rpc("get_top_emperor_24h" as any);
      if (alive && Array.isArray(data) && data[0]) setEmp(data[0] as TopEmperor);
    }
    load();
    const id = setVisibleInterval(load, 30_000 , { meta: { owner: "TopEmperorBanner", category: "cosmetic" } });
    return () => { alive = false; id(); };
  }, []);

  if (!emp) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-md border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-300/5 to-rose-500/10 px-3 py-2"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Crown className="w-4 h-4 text-amber-300" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
            Emperor of the Day
          </span>
        </div>
        <span className="text-2xl">{emp.flag}</span>
        <span className="font-bold text-foreground">{emp.user_mask}</span>
        <span className="text-xs text-muted-foreground">Tier {emp.empire_level}</span>
        <span className="ml-auto text-amber-200 font-bold tabular-nums">
          +{fmt(Number(emp.total_crown))} Crown / 24h
        </span>
      </div>
    </motion.div>
  );
}
