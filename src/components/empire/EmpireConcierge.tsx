// PR-A: Empire AI Concierge — floating bottom-left FOMO bubble.
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Crown, Zap } from "lucide-react";
import { useConcierge } from "@/hooks/use-concierge";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

const HIDE_ROUTES = ["/auth", "/secure-auth", "/auth/callback", "/forgot-password", "/reset-password"];

const CTA_LABEL: Record<string, string> = {
  practice: "Practice 입장",
  baron: "Baron 활성화",
  packages: "패키지 보기",
  missions: "미션 시작",
  wallet: "지갑 열기",
  guild: "길드 합류",
};

const TONE_RING: Record<string, string> = {
  hype: "ring-amber-400/60 shadow-[0_0_40px_hsl(45_100%_55%/0.45)]",
  urgent: "ring-rose-400/70 shadow-[0_0_40px_hsl(350_90%_60%/0.5)]",
  warm: "ring-primary/50 shadow-[0_0_36px_hsl(var(--primary)/0.35)]",
};

export default function EmpireConcierge() {
  const loc = useLocation();
  const nav = useNavigate();
  const { suggestion, open, setOpen, fetchSuggestion, dismiss, click } = useConcierge();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setAuthed(!!data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  if (!authed) return null;
  if (HIDE_ROUTES.some((r) => loc.pathname.startsWith(r))) return null;

  const tone = suggestion?.tone ?? "warm";
  const ring = TONE_RING[tone] ?? TONE_RING.warm;

  const handleClick = async () => {
    if (!suggestion) return;
    track("concierge_cta", { cta: suggestion.cta, tone: suggestion.tone, level: suggestion.ctx.level });
    await click();
    nav(suggestion.route);
  };

  const handleBubble = () => {
    if (open) { setOpen(false); return; }
    if (suggestion) { setOpen(true); return; }
    void fetchSuggestion(true);
  };

  return (
    <div
      className="fixed z-[60] left-3 md:left-5 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      <div className="relative pointer-events-auto">
        <AnimatePresence>
          {open && suggestion && (
            <motion.div
              key="card"
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="absolute bottom-16 left-0 w-[19rem] max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-4 shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  Empire Concierge
                </div>
                <button
                  onClick={() => void dismiss(false)}
                  className="text-muted-foreground hover:text-foreground transition"
                  aria-label="닫기"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Message */}
              <p className="text-sm text-foreground leading-relaxed mb-3">
                {suggestion.message}
              </p>

              {/* Mini context */}
              <div className="flex items-center gap-2 mb-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Crown className="h-3 w-3 text-amber-400" />
                  Lv.{suggestion.ctx.level} · {suggestion.ctx.crown}₡
                </span>
                {suggestion.ctx.boosterActive && (
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Zap className="h-3 w-3" />
                    Booster {suggestion.ctx.boosterRemMin}m
                  </span>
                )}
                {suggestion.ctx.crownToNext > 0 && (
                  <span className="ml-auto">→ {suggestion.ctx.nextLevelName} {suggestion.ctx.crownToNext}₡</span>
                )}
              </div>

              {/* CTA */}
              <button
                onClick={handleClick}
                className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-semibold text-sm py-2.5 px-4 shadow-[0_0_24px_hsl(45_100%_55%/0.45)] hover:scale-[1.02] active:scale-[0.98] transition"
              >
                <span className="relative z-10">{CTA_LABEL[suggestion.cta] ?? "지금 시작"}</span>
                <motion.span
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
                />
              </button>
              <button
                onClick={() => void dismiss(true)}
                className="w-full mt-2 text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition"
              >
                오늘은 그만 보기
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble */}
        <motion.button
          onClick={handleBubble}
          className={`relative h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 text-black flex items-center justify-center ring-2 ${ring} hover:scale-110 active:scale-95 transition`}
          aria-label="Empire Concierge"
          animate={open ? { rotate: 0 } : { rotate: [0, -6, 6, 0] }}
          transition={open ? {} : { duration: 4, repeat: Infinity, repeatDelay: 2 }}
        >
          <Crown className="h-5 w-5" />
          {suggestion && !open && (
            <motion.span
              className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-background"
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>
    </div>
  );
}
