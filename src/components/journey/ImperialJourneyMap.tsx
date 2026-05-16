import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { notify } from "@/lib/notify";
import { track } from "@/lib/telemetry";
import { Crown, Rocket, Coins, Sparkles, Flame, CheckCircle2, Sun, TrendingUp, Lock, ChevronRight } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type ActState = {
  id: number;
  name: string;
  emoji: string;
  locked: boolean;
  unlock_hint?: string;
  completed_steps: number;
  total_steps: number;
};
type NextAction = {
  title: string;
  sub: string;
  cta_label: string;
  cta_href: string;
  icon_key: string;
  progress_hint?: string | null;
};
type Progress = {
  current_step: number;
  total_steps: number;
  current_act: number;
  act_name: string;
  act_emoji: string;
  next_action: NextAction;
  acts: ActState[];
};

const ICON_MAP: Record<string, React.ElementType> = {
  rocket: Rocket,
  coin: Coins,
  trade: TrendingUp,
  sparkles: Sparkles,
  flame: Flame,
  check: CheckCircle2,
  crown: Crown,
  sun: Sun,
};

export default function ImperialJourneyMap() {
  const user = useRequireAuth();
  const nav = useNavigate();
  const [data, setData] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOnce = useCallback(async () => {
    if (!user) return;
    const { data: res, error } = await supabase.rpc("get_my_journey_progress");
    if (!error && res) setData(res as unknown as Progress);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let active = true;
    void fetchOnce();
    const id = setVisibleInterval(() => {
      if (document.visibilityState === "visible" && active) void fetchOnce();
    }, 60_000 , { meta: { owner: "ImperialJourneyMap", category: "cosmetic" } });
    const onFocus = () => { if (active) void fetchOnce(); };
    window.addEventListener("focus", onFocus);
    return () => { active = false; id(); window.removeEventListener("focus", onFocus); };
  }, [fetchOnce]);

  const pct = useMemo(() => {
    if (!data) return 0;
    return Math.min(100, Math.round((data.current_step / Math.max(1, data.total_steps)) * 100));
  }, [data]);

  if (!user) return null;
  if (loading || !data) {
    return (
      <section
        aria-label="Imperial Journey"
        className="relative rounded-3xl border border-primary/20 bg-card/40 backdrop-blur-md p-5 min-h-[220px] animate-pulse"
      />
    );
  }

  const NextIcon = ICON_MAP[data.next_action.icon_key] ?? Sparkles;

  function handleCtaClick() {
    track("cta_click", {
      surface: "imperial_journey",
      variant: data!.next_action.icon_key,
      meta: { step: data!.current_step, act: data!.current_act, href: data!.next_action.cta_href },
    });
    nav(data!.next_action.cta_href);
  }

  function handleLockedActClick(act: ActState) {
    notify.info(`🔒 ${act.name} 잠금 단계`, {
      description: act.unlock_hint ?? "더 많은 황제들이 도달 중입니다.",
    });
    track("cta_click", { surface: "imperial_journey", variant: "act_locked", meta: { act_id: act.id } });
  }

  return (
    <section
      aria-label="Imperial Journey"
      className="relative rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card/60 to-background/40 backdrop-blur-xl p-4 sm:p-5 overflow-hidden shadow-[0_20px_80px_-30px_hsl(var(--primary)/0.4)]"
    >
      {/* glow */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative">
        {/* header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-[10px] tracking-[0.3em] font-black text-primary/90">IMPERIAL JOURNEY</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold">
            <span className="tabular-nums text-foreground">[{data.current_step}/{data.total_steps}]</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground/90">{data.act_emoji} {data.act_name}</span>
          </div>
        </div>

        {/* progress bar */}
        <div className="mt-2.5">
          <div className="h-2 bg-muted/50 rounded-full overflow-hidden relative">
            <motion.div
              key={pct}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary via-accent to-primary glow-imperial"
            />
            <div aria-hidden className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent,hsl(0_0%_100%_/_0.18),transparent)] bg-[length:200%_100%]" />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
            <span>{pct}%</span>
            <span>{data.total_steps - data.current_step} 단계 남음</span>
          </div>
        </div>

        {/* next-action card */}
        <AnimatePresence mode="wait">
          <motion.button
            key={data.next_action.title}
            type="button"
            onClick={handleCtaClick}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-4 w-full text-left rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-4 sm:p-5 hover:border-primary/70 transition-all press group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-gradient-imperial flex items-center justify-center shrink-0 glow-imperial">
                  <NextIcon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.25em] font-black text-primary/80">⚡ 다음 행동</div>
                  <div className="font-imperial font-black text-base sm:text-lg leading-tight mt-0.5 break-keep">
                    {data.next_action.title}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className="mt-2 text-xs sm:text-sm text-muted-foreground break-keep">{data.next_action.sub}</div>
            {data.next_action.progress_hint && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-full px-2.5 py-1">
                <Sparkles className="w-3 h-3" />
                {data.next_action.progress_hint}
              </div>
            )}
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-primary group-hover:gap-2.5 transition-all">
              {data.next_action.cta_label} →
            </div>
          </motion.button>
        </AnimatePresence>

        {/* act chips */}
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {data.acts.map((a) => {
            const done = a.completed_steps >= a.total_steps;
            const inProgress = !done && a.completed_steps > 0;
            const status = a.locked ? "locked" : done ? "done" : inProgress ? "active" : "todo";
            return (
              <button
                key={a.id}
                type="button"
                onClick={a.locked ? () => handleLockedActClick(a) : undefined}
                aria-label={`${a.name}: ${done ? "완료" : a.locked ? "잠금" : `${a.completed_steps}/${a.total_steps}`}`}
                className={`relative flex flex-col items-center gap-0.5 py-2 rounded-xl border transition press ${
                  status === "done"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : status === "active"
                      ? "border-primary/60 bg-primary/15 animate-pulse-soft"
                      : status === "locked"
                        ? "border-gold/30 bg-gradient-to-br from-gold/10 to-transparent shadow-[inset_0_0_20px_-8px_hsl(var(--gold)/0.4)] cursor-pointer hover:border-gold/60"
                        : "border-border/40 bg-background/30"
                }`}
              >
                <span className="text-base sm:text-lg leading-none">
                  {a.emoji}
                </span>
                <span className={`text-[8px] sm:text-[9px] font-bold tracking-wide truncate max-w-full px-0.5 ${
                  status === "done" ? "text-emerald-300" :
                  status === "active" ? "text-primary" :
                  status === "locked" ? "text-gold" : "text-muted-foreground"
                }`}>
                  {a.name}
                </span>
                {status === "locked" && (
                  <Lock className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-gold opacity-80" />
                )}
                {status === "done" && (
                  <CheckCircle2 className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
