import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";

export default function EmpireFoundingCounter({ compact }: { compact?: boolean }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase.rpc("get_empire_seats_remaining");
        if (mounted && typeof data === "number") setRemaining(data);
      } catch { /* silent — endpoint unreachable */ }
    };
    void load();
    let ch: any;
    try {
      ch = supabase
        .channel(`empire-seats-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "empire_founding_seats" },
          () => void load()
        )
        .subscribe((_s: string, err?: unknown) => { if (err) { /* swallow */ } });
    } catch { /* realtime unreachable */ }
    const i = setInterval(load, 30_000);
    return () => {
      mounted = false;
      try { if (ch) supabase.removeChannel(ch); } catch { /* noop */ }
      clearInterval(i);
    };
  }, []);

  if (remaining === null) return null;
  const claimed = 30 - remaining;
  const pct = Math.min(100, (claimed / 30) * 100);

  const urgent = remaining <= 5;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
          urgent
            ? "border-primary/60 bg-primary/15 text-primary animate-pulse"
            : "border-primary/30 bg-primary/5 text-primary/90"
        }`}
      >
        <Crown className="w-3 h-3" />
        <span className="tabular-nums">{remaining}</span>
        <span className="opacity-60">/30</span>
      </span>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 border transition ${
        urgent
          ? "border-primary/60 bg-primary/10 glow-imperial"
          : "border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent"
      }`}
    >
      {urgent && (
        <div className="absolute inset-0 bg-primary/10 animate-pulse pointer-events-none" />
      )}
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-imperial flex items-center justify-center glow-imperial shrink-0">
            <Crown className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-[10px] tracking-[0.25em] text-primary font-bold">EMPIRE FOUNDING</div>
            <div className="text-[10px] text-muted-foreground">창립멤버 한정 좌석</div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-hud font-black text-2xl text-money-strong tabular-nums">{remaining}</span>
          <span className="text-muted-foreground text-xs font-bold ml-0.5">/30</span>
        </div>
      </div>
      <div className="relative h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-imperial transition-all duration-700 glow-imperial" style={{ width: `${pct}%` }} />
      </div>
      <p className="relative text-[10px] text-muted-foreground mt-2">
        {urgent ? "⚠ 마감 임박 — 다음 시즌까지 대기" : "DB 강제 한정 · 마감 시 다음 시즌 대기"}
      </p>
    </div>
  );
}
