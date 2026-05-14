import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";
import { EmptyState } from "@/components/ui/empty-state";

type Row = { user_id: string; total_amount: number; deposit_count: number };

export function HotUsersCard() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_hot_users_1h" as any);
      if (on) setRows((data as any) ?? []);
    };
    load();
    const stop = setVisibleInterval(load, 60_000);
    return () => { on = false; stop(); };
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Flame className="h-3.5 w-3.5 text-orange-400" /> Hot Users · 1h
      </div>
      <div className="mt-2">
        {rows === null ? (
          <div className="text-xs text-muted-foreground">불러오는 중…</div>
        ) : rows.length === 0 ? (
          <EmptyState title="최근 1시간 입금 없음" />
        ) : (
          <ul className="space-y-1">
            {rows.map((r, i) => (
              <li key={r.user_id} className="flex items-center justify-between text-xs gap-2">
                <span className="font-mono opacity-70 w-5">{i + 1}.</span>
                <span className="font-mono truncate flex-1">{r.user_id.slice(0, 8)}…</span>
                <span className="font-bold tabular-nums">
                  ₩{r.total_amount.toLocaleString()}
                </span>
                <span className="text-muted-foreground tabular-nums">×{r.deposit_count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
