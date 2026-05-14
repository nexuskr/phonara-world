import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export default function ActiveBoostCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.rpc("get_active_boost_count");
      if (mounted && typeof data === "number") setCount(data);
    };
    void load();
    const stop = setVisibleInterval(load, 15_000);
    return () => { mounted = false; stop(); };
  }, []);

  if (count === null) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground py-2">
      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
      <Activity className="w-3 h-3" />
      <span>지금 <span className="font-display font-black text-secondary tabular-nums">{count.toLocaleString()}</span>명이 부스트 진행 중</span>
    </div>
  );
}
