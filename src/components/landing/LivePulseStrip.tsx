import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Activity, UserPlus, Clock } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Pulse = {
  completed_24h: number;
  signups_24h: number;
  last_completed_at: string | null;
  hourly: { h: string; c: number }[];
} | null;

function minutesAgo(iso: string | null): number | null {
  if (!iso) return null;
  const diff = (Date.now() - new Date(iso).getTime()) / 60000;
  return Math.max(0, Math.floor(diff));
}

/**
 * Anonymized live activity ticker for landing page. No PII: only 24h aggregate
 * counts pulled via `public_live_pulse()`. Visible to anon visitors.
 */
export default function LivePulseStrip() {
  const { i18n } = useTranslation("landing");
  const lng = i18n.language?.startsWith("en") ? "en" : "ko";
  const [pulse, setPulse] = useState<Pulse>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const { data } = await (supabase as any).rpc("public_live_pulse");
        if (alive && data) setPulse(data as Pulse);
      } catch {}
      if (alive) setLoaded(true);
    };
    load();
    const stop = setVisibleInterval(load, 60_000);
    return () => { alive = false; stop(); };
  }, []);

  if (!loaded || !pulse) return null;
  if ((pulse.completed_24h ?? 0) === 0 && (pulse.signups_24h ?? 0) === 0) return null;

  const ago = minutesAgo(pulse.last_completed_at);
  const labels = lng === "en"
    ? {
        title: "Live · last 24h",
        payouts: "payouts settled",
        signups: "new members",
        last: ago == null ? "—" : ago < 1 ? "moments ago" : `${ago} min ago`,
        lastLabel: "last payout",
      }
    : {
        title: "실시간 · 최근 24시간",
        payouts: "출금 완료",
        signups: "신규 가입",
        last: ago == null ? "—" : ago < 1 ? "방금 전" : `${ago}분 전`,
        lastLabel: "최근 출금",
      };

  const maxC = Math.max(1, ...(pulse.hourly ?? []).map((x) => x.c));

  return (
    <div className="glass-strong rounded-2xl px-4 py-3 mt-3 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
        </span>
        <span className="text-[10px] tracking-[0.2em] font-black text-muted-foreground uppercase">
          {labels.title}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-secondary shrink-0" />
          <div className="min-w-0">
            <div className="font-display font-black text-lg tabular-nums text-secondary leading-none">
              {pulse.completed_24h.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{labels.payouts}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <UserPlus className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <div className="font-display font-black text-lg tabular-nums text-primary leading-none">
              {pulse.signups_24h.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{labels.signups}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-gold shrink-0" />
          <div className="min-w-0">
            <div className="font-display font-black text-sm tabular-nums text-gold leading-none">
              {labels.last}
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{labels.lastLabel}</div>
          </div>
        </div>
      </div>

      {/* Sparkline of last 24h hourly buckets */}
      {pulse.hourly && pulse.hourly.length > 0 && (
        <div className="mt-2 flex items-end gap-[2px] h-6" aria-hidden="true">
          {pulse.hourly.map((b, i) => (
            <div
              key={i}
              className="flex-1 bg-secondary/40 rounded-sm"
              style={{ height: `${(b.c / maxC) * 100}%`, minHeight: 2 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
