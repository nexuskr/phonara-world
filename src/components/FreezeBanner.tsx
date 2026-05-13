import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Snowflake } from "lucide-react";

type Freeze = {
  id: string;
  reason: string;
  severity: string;
  frozen_at: string;
  expires_at: string;
  source: string;
};

export default function FreezeBanner() {
  const [f, setF] = useState<Freeze | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setF(null); return; }
      const { data } = await (supabase as any).rpc("my_active_freeze");
      setF((data && data[0]) || null);
    }
    load();
    const t = setInterval(() => setNow(Date.now()), 2000);
    const ch = supabase
      .channel("freeze:self")
      .on("postgres_changes", { event: "*", schema: "public", table: "account_freezes" }, load)
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, []);

  if (!f) return null;
  const ms = Math.max(0, new Date(f.expires_at).getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  return (
    <div className="sticky top-0 z-40 bg-destructive/15 border-b border-destructive/40 backdrop-blur">
      <div className="container py-2 flex items-center gap-3 text-[11px]">
        <Snowflake className="w-4 h-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-destructive">계정 보호 동결: 출금이 일시 차단되었습니다</div>
          <div className="text-muted-foreground truncate">사유: {f.reason}</div>
        </div>
        <div className="font-mono text-destructive font-bold whitespace-nowrap">
          {h.toString().padStart(2, "0")}:{m.toString().padStart(2, "0")}:{s.toString().padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}
