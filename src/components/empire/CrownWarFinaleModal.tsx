// PR-C: Crown Wars Finale Modal — fullscreen FOMO when <5min left and user is participating.
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Swords, Crown, X } from "lucide-react";
import { useCrownWar, formatMSS } from "@/hooks/use-crown-war";
import { track } from "@/lib/analytics";

const SHOWN_KEY_PREFIX = "crown_war_finale_shown_";

export default function CrownWarFinaleModal() {
  const { snap, isFinaleWindow, remainingMs } = useCrownWar(8000);
  const [open, setOpen] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!isFinaleWindow || !snap?.war) return;
    // Show only once per round per device
    const key = SHOWN_KEY_PREFIX + snap.war.id;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {}
    setOpen(true);
    track("crown_war_finale_view", { war_id: snap.war.id, my_rank: snap.me.rank });
  }, [isFinaleWindow, snap]);

  if (!open || !snap?.war) return null;

  const me = snap.me;
  const top1Score = snap.leaderboard[0]?.score ?? 0;
  const gapToTop = me.rank && me.rank > 1 ? Math.max(0, top1Score - me.score) : 0;

  const close = () => setOpen(false);
  const go = () => {
    track("crown_war_finale_cta", { war_id: snap.war?.id });
    setOpen(false);
    nav("/practice");
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] bg-background/92 backdrop-blur-xl flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="relative w-full max-w-md rounded-3xl border border-rose-400/50 bg-gradient-to-b from-card to-background p-6 shadow-[0_0_60px_hsl(350_90%_60%/0.45)]"
        >
          <button onClick={close} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>

          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="mx-auto h-16 w-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center mb-3 shadow-[0_0_30px_hsl(350_90%_60%/0.7)]"
          >
            <Swords className="h-8 w-8" />
          </motion.div>

          <div className="text-center">
            <div className="text-[10px] uppercase tracking-[0.3em] text-rose-300 mb-1">Crown Wars · Finale</div>
            <h2 className="text-2xl font-extrabold mb-2">남은 시간 <span className="font-mono text-rose-300">{formatMSS(remainingMs)}</span></h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              지금 제국 전체가 Crown을 놓고 전쟁 중입니다.<br />
              당신의 자리는 어디인가?
            </p>

            {/* Status grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <Stat label="내 순위" value={me.rank ? `${me.rank}위` : "미참여"} accent={me.rank && me.rank <= 3} />
              <Stat label="내 점수" value={`${me.score}`} accent={me.score > 0} />
              <Stat label="1위 차이" value={gapToTop > 0 ? `-${gapToTop}` : me.rank === 1 ? "🏆" : "—"} accent={me.rank === 1} />
            </div>

            <p className="text-xs text-amber-300/90 mb-4">
              Top 3 → <span className="font-bold">+200₡ × 0.55~2.9 변동성</span> 보너스
            </p>

            <button
              onClick={go}
              className="relative overflow-hidden w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-bold text-base py-3 shadow-[0_0_28px_hsl(45_100%_55%/0.55)] hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <Crown className="h-5 w-5" />
                지금 Practice로 Crown 사냥
              </span>
              <motion.span
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
              />
            </button>
            <button
              onClick={close}
              className="mt-2 w-full text-[11px] text-muted-foreground/70 hover:text-muted-foreground"
            >
              나중에 보기
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean | null }) {
  return (
    <div className={`rounded-xl border ${accent ? "border-amber-400/50 bg-amber-500/10" : "border-border/40 bg-muted/30"} px-2 py-2`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-bold ${accent ? "text-amber-200" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
