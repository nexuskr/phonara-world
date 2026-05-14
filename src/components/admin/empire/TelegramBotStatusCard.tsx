import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export function TelegramBotStatusCard() {
  const [d, setD] = useState<any>(null);

  useEffect(() => {
    let on = true;
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_telegram_bot_status" as any);
      if (on) setD(data);
    };
    load();
    const stop = setVisibleInterval(load, 60_000);
    return () => { on = false; stop(); };
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 border border-cyan-500/30">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">
        <Bot className="h-3.5 w-3.5 text-cyan-400" /> Telegram Bot Status
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <Cell label="24h 봇 실행" value={d?.bot_runs?.recent_runs_24h ?? 0} />
        <Cell label="오늘 가입자" value={d?.today_signups ?? 0} />
        <Cell label="채널 연결" value={d?.channels_connected ?? "—"} />
        <Cell
          label="마지막 실행"
          value={d?.bot_runs?.last_run_at ? new Date(d.bot_runs.last_run_at).toLocaleTimeString("ko-KR") : "—"}
        />
      </div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className="font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}
