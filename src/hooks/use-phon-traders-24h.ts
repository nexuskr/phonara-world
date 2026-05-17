/**
 * usePhonTraders24h — get_phon_traders_24h() 60초 폴링.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function usePhonTraders24h() {
  const [count, setCount] = useState<number>(0);
  useEffect(() => {
    let alive = true;
    const fetchOnce = async () => {
      const { data } = await (supabase as any).rpc("get_phon_traders_24h");
      if (alive && typeof data === "number") setCount(data);
    };
    void fetchOnce();
    const id = setInterval(fetchOnce, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return count;
}
