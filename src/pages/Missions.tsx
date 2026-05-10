import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import JackpotBanner from "@/components/JackpotBanner";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  useDB,
  DEFAULT_MISSIONS,
  TIER_RANK,
  formatKRW,
  JACKPOT_CHANCE,
  jackpotPayoutPct,
  randomFakeNick,
  DAILY_PLAY_LIMITS,
  todayStr,
  type Mission,
  type Tier,
} from "@/lib/store";
import { CheckCircle2, Sparkles, Lock, Crown, Upload, Gamepad2, X, Zap, Flame, Trophy, Heart } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { settleMission } from "@/lib/missions-rpc";
import { emitEarned } from "@/components/onboarding/EarnedToast";
import { supabase } from "@/integrations/supabase/client";
import AIBotCards from "@/components/AIBotCards";
import { usePersonaMissions, PERSONA_LABEL } from "@/hooks/use-persona-missions";
import { Sparkle } from "lucide-react";

const tierFilters: { key: Tier; tk: string; color: string }[] = [
  { key: "NORMAL", tk: "tierNormal", color: "text-secondary" },
  { key: "VIP", tk: "tierVIP", color: "text-primary" },
  { key: "GOD", tk: "tierGOD", color: "text-accent" },
  { key: "EMPIRE", tk: "tierEMPIRE", color: "text-gold" },
];

// Tier reward multiplier (reverse difficulty: higher tier = more boost)
const TIER_BOOST: Record<Tier, number> = { NORMAL: 1, VIP: 1.5, GOD: 2.5, EMPIRE: 4 };

export default function Missions() {
  const { t } = useTranslation("missions");
  const FAIL_MSGS = [t("failMsg1"), t("failMsg2"), t("failMsg3"), t("failMsg4")];
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const user = useRequireAuth() ?? db.user;
  const [tierTab, setTierTab] = useState<Tier>("NORMAL");
  const [completing, setCompleting] = useState<string | null>(null);
  const [ugcOpen, setUgcOpen] = useState<Mission | null>(null);
  const [gameOpen, setGameOpen] = useState<Mission | null>(null);
  const [catTab, setCatTab] = useState<"all" | "game">("game");
  const [jackpotWin, setJackpotWin] = useState<{ amount: number; type: "main" | "mini" } | null>(null);
  const { persona, recommended } = usePersonaMissions();

  if (!user) return null;
  const userTier = user.tier;
  const userTierRank = TIER_RANK[userTier];

  // Daily play limit (auto-reset by date)
  const today = todayStr();
  const playsUsed = user.playDate === today ? (user.playsUsed ?? 0) : 0;
  const playLimit = DAILY_PLAY_LIMITS[userTier];
  const playsLeft = Math.max(0, playLimit - playsUsed);
  const limitReached = playsLeft <= 0;

  const missions = [...DEFAULT_MISSIONS, ...db.customMissions];
  const list = missions.filter((m) => m.tier === tierTab && (catTab === "all" || m.category === "게임"));

  // Every game play contributes to jackpot + rolls for win
  function rollJackpot(): { won: boolean; amount: number; type: "main" | "mini" } | null {
    const ch = JACKPOT_CHANCE[userTier];
    const r = Math.random();
    if (r < ch.main) {
      const pct = jackpotPayoutPct();
      const amount = Math.floor(db.jackpot.amount * pct);
      setDb((d) => ({
        ...d,
        jackpot: {
          ...d.jackpot,
          amount: Math.max(20_000_000, d.jackpot.amount - amount),
          lastMainExplode: Date.now(),
          recentWins: [
            { nickname: d.user!.nickname, amount, tier: d.user!.tier, when: Date.now(), type: "main" as const },
            ...d.jackpot.recentWins,
          ].slice(0, 12),
        },
      }));
      return { won: true, amount, type: "main" };
    }
    if (r < ch.main + ch.mini) {
      const amount = Math.floor(db.jackpot.mini * (0.3 + Math.random() * 0.5));
      setDb((d) => ({
        ...d,
        jackpot: {
          ...d.jackpot,
          mini: Math.max(200_000, d.jackpot.mini - amount),
          lastMiniExplode: Date.now(),
          recentWins: [
            { nickname: d.user!.nickname, amount, tier: d.user!.tier, when: Date.now(), type: "mini" as const },
            ...d.jackpot.recentWins,
          ].slice(0, 12),
        },
      }));
      return { won: true, amount, type: "mini" };
    }
    // Local UI cache + server-authoritative pool contribution
    setDb((d) => ({ ...d, jackpot: { ...d.jackpot, amount: d.jackpot.amount + 1500, mini: d.jackpot.mini + 300 } }));
    void supabase.rpc("bump_jackpot", { _amount: 1500 }).then(() => {});
    return null;
  }

  function complete(m: Mission) {
    if (db.completedMissions.includes(m.id) && !m.game) {
      toast({ title: t("alreadyDone") });
      return;
    }
    if (TIER_RANK[m.tier] > userTierRank) {
      toast({ title: t("lockedTitle"), description: t("lockedDesc") });
      return;
    }
    if (m.game && limitReached) {
      toast({ title: t("capReached"), description: t("capDesc", { tier: userTier, n: playLimit }), variant: "destructive" });
      return;
    }
    if (m.game) {
      setGameOpen(m);
      return;
    }
    if (m.ugc) {
      setUgcOpen(m);
      return;
    }
    setCompleting(m.id);
    setTimeout(() => {
      setDb((d) => ({
        ...d,
        completedMissions: [...d.completedMissions, m.id],
        user: d.user
          ? {
              ...d.user,
              balance: d.user.balance + m.reward,
              todayEarnings: d.user.todayEarnings + m.reward,
              xp: d.user.xp + Math.floor(m.reward / 100),
            }
          : null,
      }));
      setCompleting(null);
      emitEarned(m.reward);
      toast({ title: t("earnedToast", { val: formatKRW(m.reward) }), description: t("earnedDesc", { title: m.title }) });
    }, 1200);
  }

  async function awardGame(m: Mission, won: boolean, bonus: number) {
    // Jackpot roll happens on EVERY play (win or lose) — local economy
    const jp = rollJackpot();

    const boost = m.boostable ? TIER_BOOST[userTier] : 1;
    const baseReward = won ? Math.floor((m.reward + bonus) * boost) : 0;
    const jpReward = jp?.amount ?? 0;
    const totalReward = baseReward + jpReward;

    // Persist play count + jackpot/momentum locally (these are local features)
    setDb((d) => {
      const newMomentum = won ? d.momentum + 1 : 0;
      const triggerRecovery = !won && d.momentum === 0;
      const t = todayStr();
      const prevPlays = d.user?.playDate === t ? (d.user?.playsUsed ?? 0) : 0;
      return {
        ...d,
        momentum: newMomentum,
        recoveryMission: triggerRecovery
          ? { id: m.id, reward: Math.floor(m.reward * 1.8), expiresAt: Date.now() + 1000 * 60 * 30 }
          : d.recoveryMission,
        user: d.user
          ? {
              ...d.user,
              balance: d.user.balance + totalReward,
              todayEarnings: d.user.todayEarnings + totalReward,
              xp: d.user.xp + (won ? Math.floor(totalReward / 100) : 0),
              playDate: t,
              playsUsed: prevPlays + 1,
            }
          : null,
      };
    });

    // Server-authoritative settlement (records mission_history, daily_stats, transactions, applies daily cap)
    if (totalReward > 0 || won) {
      settleMission(m.id, won, baseReward).catch(() => {});
    }

    if (jp) {
      setJackpotWin(jp);
    } else if (won) {
      const momentumBadge = db.momentum >= 2 ? ` · ${t("streakBadge", { n: db.momentum + 1 })}` : "";
      emitEarned(baseReward);
      toast({ title: `🎉 +${formatKRW(baseReward)}${momentumBadge}`, description: m.title });
    } else {
      toast({ title: t("failTitle"), description: FAIL_MSGS[Math.floor(Math.random() * FAIL_MSGS.length)] });
    }
    setGameOpen(null);
  }

  return (
    <Layout>
      <HubTabs hub="earn" />
      <div className="container pt-6 pb-10 animate-liquid-in">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial flex items-center gap-2 break-keep">
              <Sparkles className="w-5 h-5 text-primary" /> {t("title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 break-keep">{t("subtitle")}</p>
          </div>
          <div className={`text-right glass rounded-xl px-3 py-2 ${limitReached ? "border border-destructive/50" : ""}`}>
            <div className="text-[9px] tracking-widest text-muted-foreground font-bold">{t("todayPlays")}</div>
            <div className={`text-sm font-display font-black tabular-nums ${limitReached ? "text-destructive" : "text-gradient-primary"}`}>
              {playsUsed} / {playLimit}
            </div>
            <div className="text-[9px] text-muted-foreground">{userTier} {t("tierSuffix")}</div>
          </div>
        </div>

        {/* MEGA JACKPOT BANNER */}
        <div className="mb-5">
          <JackpotBanner />
        </div>

        {/* AI AUTO BOTS */}
        <div className="mb-6">
          <AIBotCards />
        </div>

        {/* Momentum + Recovery */}
        {(db.momentum > 0 || db.recoveryMission) && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {db.momentum > 0 && (
              <div className="glass rounded-2xl p-3 flex items-center gap-2 neon-border">
                <Flame className="w-5 h-5 text-primary animate-pulse" />
                <div>
                  <div className="text-[9px] tracking-widest text-primary font-black">{t("momentumLabel")}</div>
                  <div className="text-sm font-display font-black tabular-nums break-keep">
                    {t("momentumDesc", { n: db.momentum, pct: db.momentum * 5 })}
                  </div>
                </div>
              </div>
            )}
            {db.recoveryMission && (
              <div className="glass rounded-2xl p-3 flex items-center gap-2 neon-border">
                <Heart className="w-5 h-5 text-accent animate-pulse" />
                <div>
                  <div className="text-[9px] tracking-widest text-accent font-black">{t("recoveryLabel")}</div>
                  <div className="text-sm font-display font-black tabular-nums break-keep">{t("recoveryDesc", { val: formatKRW(db.recoveryMission.reward) })}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tier tabs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {tierFilters.map((tf) => {
            const active = tierTab === tf.key;
            const locked = TIER_RANK[tf.key] > userTierRank;
            const ch = JACKPOT_CHANCE[tf.key];
            return (
              <button
                key={tf.key}
                onClick={() => setTierTab(tf.key)}
                className={`relative min-h-[56px] py-3 rounded-2xl text-xs font-display font-black transition press ${active ? "bg-gradient-primary text-primary-foreground glow-primary" : "glass text-muted-foreground"}`}
              >
                {locked && <Lock className="absolute top-1.5 right-1.5 w-3 h-3 text-gold" />}
                {t(tf.tk)}
                <div className="text-[8px] opacity-70 mt-0.5 normal-case tabular-nums">
                  {t("jackpotPct", { pct: ((ch.main + ch.mini) * 100).toFixed(0) })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Category sub-tabs */}
        <div className="flex gap-2 mb-5">
          {([
            { key: "all", label: t("catAll") },
            { key: "game", label: t("catGame") },
          ] as const).map((c) => (
            <button
              key={c.key}
              onClick={() => setCatTab(c.key)}
              className={`px-4 min-h-[44px] py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition press ${catTab === c.key ? "bg-gradient-cyber text-primary-foreground" : "glass text-muted-foreground"}`}
            >
              {c.key === "game" && <Gamepad2 className="w-3.5 h-3.5" />} {c.label}
            </button>
          ))}
        </div>

        {TIER_RANK[tierTab] > userTierRank && (
          <div className="glass-strong rounded-2xl p-5 neon-border mb-5 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold/40 blur-3xl" />
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-gold flex items-center justify-center glow-gold">
                <Crown className="w-7 h-7 text-gold-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-[10px] tracking-widest text-gold font-black">{t("premiumLocked")}</div>
                <div className="font-display font-bold text-sm mt-0.5 break-keep">
                  {t("premiumLine", {
                    tier: t(tierFilters.find((tf) => tf.key === tierTab)?.tk ?? "tierNormal"),
                    pct: ((JACKPOT_CHANCE[tierTab].main + JACKPOT_CHANCE[tierTab].mini) * 100).toFixed(0),
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 break-keep">{t("packageHint")}</div>
              </div>
              <button
                onClick={() => nav("/packages")}
                className="press min-h-[44px] px-3 py-2 rounded-xl bg-gradient-gold text-gold-foreground text-xs font-bold glow-gold"
              >
                {t("upgrade")}
              </button>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {list.map((m) => {
            const done = !m.game && db.completedMissions.includes(m.id);
            const inProgress = completing === m.id;
            const locked = TIER_RANK[m.tier] > userTierRank;
            return (
              <div
                key={m.id}
                className={`glass-strong rounded-2xl p-4 neon-border tilt-card relative overflow-hidden ${locked ? "opacity-70" : ""}`}
              >
                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-primary blur-2xl opacity-30" />
                {done && (
                  <div className="absolute inset-0 bg-secondary/10 backdrop-blur-sm flex items-center justify-center">
                    <div className="flex items-center gap-2 text-secondary font-bold">
                      <CheckCircle2 className="w-5 h-5" /> {t("done")}
                    </div>
                  </div>
                )}
                {locked && (
                  <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
                    <Lock className="w-7 h-7 text-gold" />
                    <div className="text-xs font-bold text-gold">{t("tierOnly", { tier: m.tier })}</div>
                    <button
                      onClick={() => nav("/packages")}
                      className="press min-h-[44px] px-3 py-1.5 rounded-lg bg-gradient-gold text-gold-foreground text-[10px] font-bold"
                    >
                      {t("upgrade")}
                    </button>
                  </div>
                )}
                <div className="relative">
                  <div className="flex items-center justify-between text-[10px] mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">{m.category}</span>
                    <div className="flex items-center gap-1">
                      {m.fomoLimit && (
                        <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold animate-pulse tabular-nums">
                          🔥 {t("remaining", { n: Math.max(3, m.fomoLimit - Math.floor(Math.random() * (m.fomoLimit - 5))) })}
                        </span>
                      )}
                      {m.boostable && userTier !== "NORMAL" && (
                        <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold font-bold tabular-nums">
                          ×{TIER_BOOST[userTier]}
                        </span>
                      )}
                      {m.ugc && (
                        <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold">UGC</span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold ${m.difficulty === "VIP" ? "bg-gold/20 text-gold" : m.difficulty === "HARD" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"}`}
                      >
                        {m.difficulty}
                      </span>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm leading-snug break-keep">{m.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-1 break-keep">{m.desc}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <div className="font-display font-black text-xl text-money-strong tabular-nums">
                        +{formatKRW(m.boostable ? Math.floor(m.reward * TIER_BOOST[userTier]) : m.reward)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{t("duration", { val: m.duration })}</div>
                    </div>
                    <button
                      disabled={done || inProgress || locked || (!!m.game && limitReached)}
                      onClick={() => complete(m)}
                      className="press sheen min-h-[44px] px-4 py-2 rounded-xl bg-gradient-primary text-primary-foreground text-xs font-bold glow-primary disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {inProgress
                        ? t("btnInProgress")
                        : done
                          ? t("btnDone")
                          : m.game && limitReached
                            ? t("btnCap")
                            : m.game
                              ? t("btnPlay")
                              : m.ugc
                                ? t("btnSubmit")
                                : t("btnStart")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="col-span-full glass rounded-2xl p-10 text-center text-sm text-muted-foreground break-keep">
              {t("none")}
            </div>
          )}
        </div>
      </div>

      {ugcOpen && (
        <UGCModal
          mission={ugcOpen}
          onClose={() => setUgcOpen(null)}
          onSubmit={() => {
            setDb((d) => ({
              ...d,
              completedMissions: [...d.completedMissions, ugcOpen.id],
              user: d.user
                ? {
                    ...d.user,
                    balance: d.user.balance + ugcOpen.reward,
                    todayEarnings: d.user.todayEarnings + ugcOpen.reward,
                    xp: d.user.xp + Math.floor(ugcOpen.reward / 100),
                  }
                : null,
            }));
            toast({
              title: t("ugcPassTitle"),
              description: t("ugcPassDesc", { val: formatKRW(ugcOpen.reward) }),
            });
            setUgcOpen(null);
          }}
        />
      )}

      {gameOpen && (
        <GameModal
          mission={gameOpen}
          onClose={() => setGameOpen(null)}
          onResult={(won, bonus) => awardGame(gameOpen, won, bonus)}
        />
      )}

      {jackpotWin && <JackpotWinOverlay win={jackpotWin} onClose={() => setJackpotWin(null)} />}
    </Layout>
  );
}

/* ─────────── Jackpot win celebration overlay ─────────── */
function JackpotWinOverlay({ win, onClose }: { win: { amount: number; type: "main" | "mini" }; onClose: () => void }) {
  const { t } = useTranslation("missions");
  return (
    <div className="fixed inset-0 z-[60] bg-background/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-up">
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const tx = Math.cos(angle) * (200 + Math.random() * 200);
          const ty = Math.sin(angle) * (200 + Math.random() * 200);
          return (
            <span
              key={i}
              className="absolute left-1/2 top-1/2 text-3xl animate-money-burst"
              style={{
                ["--tx" as any]: `${tx}px`,
                ["--ty" as any]: `${ty}px`,
                ["--r" as any]: `${i * 18}deg`,
                animationDelay: `${i * 30}ms`,
              }}
            >
              {["💰", "💎", "👑", "🎰", "💸", "✨"][i % 6]}
            </span>
          );
        })}
      </div>
      <div className="relative w-full max-w-sm glass-strong rounded-3xl p-8 neon-border text-center animate-pulse-glow">
        <div className="text-[10px] tracking-[0.3em] text-gold font-black flex items-center justify-center gap-1">
          {win.type === "main" ? (
            <>
              <Trophy className="w-3 h-3" /> {t("megaJackpot")}
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3" /> {t("miniJackpot")}
            </>
          )}
        </div>
        <div className="mt-3 font-display font-black text-4xl text-money-strong tabular-nums">
          +{formatKRW(win.amount)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground break-keep">{t("addedNote")}</div>
        <button
          onClick={onClose}
          className="press sheen mt-6 w-full min-h-[56px] py-3 rounded-xl bg-gradient-gold text-gold-foreground font-display font-black glow-gold"
        >
          {t("receive")}
        </button>
      </div>
    </div>
  );
}

/* ─────────── UGC ─────────── */
function UGCModal({ mission, onClose, onSubmit }: { mission: Mission; onClose: () => void; onSubmit: () => void }) {
  const { t } = useTranslation("missions");
  const [file, setFile] = useState<string>();
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up">
        <h2 className="font-display font-black text-lg break-keep">{t("ugcSubmit", { title: mission.title })}</h2>
        <p className="text-[11px] text-muted-foreground mt-1 break-keep">{t("ugcSub")}</p>
        <label className="mt-4 block">
          <div className="glass rounded-2xl p-6 border-2 border-dashed border-border hover:border-primary text-center cursor-pointer">
            {file ? (
              <img src={file} className="max-h-40 mx-auto rounded-lg" alt="" />
            ) : (
              <>
                <Upload className="w-7 h-7 mx-auto text-muted-foreground" />
                <div className="text-xs mt-2 font-bold">{t("ugcUpload")}</div>
              </>
            )}
          </div>
          <input
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = new FileReader();
              r.onload = () => setFile(r.result as string);
              r.readAsDataURL(f);
            }}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={onClose} className="press min-h-[44px] py-3 rounded-xl glass text-sm font-bold">
            {t("cancel")}
          </button>
          <button
            onClick={onSubmit}
            disabled={!file}
            className="press sheen min-h-[44px] py-3 rounded-xl bg-gradient-primary text-primary-foreground text-sm font-bold glow-primary disabled:opacity-50"
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Game Modal ─────────── */
function GameModal({
  mission,
  onClose,
  onResult,
}: {
  mission: Mission;
  onClose: () => void;
  onResult: (won: boolean, bonus: number) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="font-display font-black text-lg flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-primary" /> {mission.title}
        </h2>
        <p className="text-[11px] text-muted-foreground mt-1">{mission.desc}</p>
        <div className="mt-5">
          {mission.game === "tap" && <TapGame reward={mission.reward} onResult={onResult} />}
          {mission.game === "lucky" && <LuckyGame reward={mission.reward} onResult={onResult} />}
          {mission.game === "memory" && <MemoryGame onResult={onResult} />}
          {mission.game === "reaction" && <ReactionGame reward={mission.reward} onResult={onResult} />}
          {mission.game === "scratch" && <ScratchGame reward={mission.reward} onResult={onResult} />}
          {mission.game === "dice" && <DiceGame reward={mission.reward} onResult={onResult} />}
          {mission.game === "slot" && <SlotGame reward={mission.reward} onResult={onResult} />}
          {mission.game === "highlow" && <HighLowGame reward={mission.reward} onResult={onResult} />}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Games ─────────── */
function ReactionGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "done" | "fail">("idle");
  const [start, setStart] = useState(0);
  const [ms, setMs] = useState(0);
  function begin() {
    setPhase("wait");
    const d = 1200 + Math.random() * 2200;
    setTimeout(() => {
      setStart(Date.now());
      setPhase("go");
    }, d);
  }
  function tap() {
    if (phase === "wait") {
      setPhase("fail");
      setTimeout(() => onResult(false, 0), 800);
      return;
    }
    if (phase === "go") {
      const tm = Date.now() - start;
      setMs(tm);
      setPhase("done");
    }
  }
  const bonus = phase === "done" ? Math.max(0, Math.floor((500 - ms) * (reward / 250))) : 0;
  return (
    <div className="text-center">
      <button
        onClick={phase === "idle" ? begin : tap}
        className={`press w-full h-44 rounded-2xl font-display font-black text-2xl glow-primary transition
          ${
            phase === "go"
              ? "bg-secondary text-secondary-foreground"
              : phase === "wait"
                ? "bg-destructive/80 text-destructive-foreground"
                : phase === "done"
                  ? "bg-gradient-gold text-gold-foreground"
                  : phase === "fail"
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-gradient-primary text-primary-foreground"
          }`}
      >
        {phase === "idle" && t("gStart")}
        {phase === "wait" && t("gWait")}
        {phase === "go" && t("gNow")}
        {phase === "done" && `${ms}ms · +${formatKRW(reward + bonus)}`}
        {phase === "fail" && t("gTooFast")}
      </button>
      {phase === "done" && (
        <button
          onClick={() => onResult(true, bonus)}
          className="press sheen mt-4 min-h-[56px] px-8 py-3 rounded-xl bg-gradient-gold text-gold-foreground font-bold glow-gold"
        >
          {t("gClaim")}
        </button>
      )}
    </div>
  );
}

function TapGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const [count, setCount] = useState(0);
  const [time, setTime] = useState(10);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    if (time <= 0) {
      const bonus = Math.min(count * 50, reward * 2);
      const won = count >= 25;
      setRunning(false);
      setTimeout(() => onResult(won, bonus), 400);
      return;
    }
    const tm = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(tm);
  }, [time, running]);
  return (
    <div className="text-center">
      <div className="font-display font-black text-5xl text-money-strong tabular-nums">{count}</div>
      <div className="text-xs text-muted-foreground mt-1 break-keep tabular-nums">
        {t("gTapLeft", { s: time, val: formatKRW(Math.min(count * 50, reward * 2)) })}
      </div>
      <button
        onClick={() => {
          if (!running) {
            setRunning(true);
            setCount(0);
            setTime(10);
          }
          setCount((c) => c + 1);
        }}
        className="press mt-5 w-40 h-40 rounded-full bg-gradient-cyber text-primary-foreground font-display font-black text-xl glow-primary mx-auto block"
      >
        {running ? t("gTap") : t("gStart")}
      </button>
    </div>
  );
}

function LuckyGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  function spin() {
    setSpinning(true);
    setTimeout(() => {
      const win = Math.random() > 0.25;
      const r = win ? Math.floor(reward * (0.5 + Math.random() * 4.5)) : 0;
      setResult(r);
      setSpinning(false);
    }, 1800);
  }
  return (
    <div className="text-center">
      <div
        className={`w-44 h-44 rounded-full bg-gradient-aurora mx-auto flex items-center justify-center relative overflow-hidden ${spinning ? "animate-spin-slow" : ""}`}
      >
        <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center font-display font-black text-xl text-center px-2">
          {result !== null ? (result > 0 ? `+${formatKRW(result)}` : t("gMiss")) : "🎁"}
        </div>
      </div>
      {result === null ? (
        <button
          onClick={spin}
          disabled={spinning}
          className="press sheen mt-5 px-8 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-50"
        >
          {spinning ? t("gSpinning") : t("gSpinWheel")}
        </button>
      ) : (
        <button
          onClick={() => onResult(result > 0, result)}
          className="press sheen mt-5 px-8 py-3 rounded-xl bg-gradient-gold text-gold-foreground font-bold glow-gold"
        >
          <Zap className="inline w-4 h-4" /> {t("claim")}
        </button>
      )}
    </div>
  );
}

function MemoryGame({ onResult }: { onResult: (w: boolean, b: number) => void }) {
  const symbols = ["🚀", "💎", "⚡", "🔥", "🌌", "👑"];
  const init = useRef(
    [...symbols, ...symbols]
      .map((s, i) => ({ id: i, s, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5),
  );
  const [cards, setCards] = useState(init.current);
  const [pick, setPick] = useState<number[]>([]);
  function tap(i: number) {
    if (pick.length === 2 || cards[i].flipped) return;
    const next = cards.map((c, j) => (j === i ? { ...c, flipped: true } : c));
    setCards(next);
    const np = [...pick, i];
    setPick(np);
    if (np.length === 2) {
      const [a, b] = np;
      if (next[a].s === next[b].s) {
        const matched = next.map((c, j) => (j === a || j === b ? { ...c, matched: true } : c));
        setCards(matched);
        setPick([]);
        if (matched.every((c) => c.matched)) setTimeout(() => onResult(true, 0), 600);
      } else {
        setTimeout(() => {
          setCards((cs) => cs.map((c, j) => (j === a || j === b ? { ...c, flipped: false } : c)));
          setPick([]);
        }, 700);
      }
    }
  }
  return (
    <div className="grid grid-cols-4 gap-2">
      {cards.map((c, i) => (
        <button
          key={c.id}
          onClick={() => tap(i)}
          className={`aspect-square rounded-xl text-3xl flex items-center justify-center font-bold transition ${c.flipped || c.matched ? "bg-gradient-cyber" : "glass"}`}
        >
          {c.flipped || c.matched ? c.s : "?"}
        </button>
      ))}
    </div>
  );
}

function ScratchGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const [scratched, setScratched] = useState<boolean[]>(Array(9).fill(false));
  const cells = useRef(
    Array.from({ length: 9 }, () => (Math.random() > 0.55 ? Math.floor(reward * (0.3 + Math.random() * 2)) : 0)),
  );
  function scratch(i: number) {
    setScratched((s) => s.map((v, j) => (j === i ? true : v)));
  }
  const allDone = scratched.filter(Boolean).length >= 6;
  const total = cells.current.reduce((a, b, i) => a + (scratched[i] ? b : 0), 0);
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {cells.current.map((v, i) => (
          <button
            key={i}
            onClick={() => scratch(i)}
            className={`aspect-square rounded-xl flex items-center justify-center font-display font-black text-sm transition ${scratched[i] ? (v > 0 ? "bg-gradient-gold text-gold-foreground" : "bg-muted text-muted-foreground") : "bg-gradient-primary text-primary-foreground glow-primary"}`}
          >
            {scratched[i] ? (v > 0 ? `+${(v / 1000).toFixed(0)}k` : t("gMiss")) : t("gScratch")}
          </button>
        ))}
      </div>
      {allDone && (
        <button
          onClick={() => onResult(total > 0, total)}
          className="press sheen mt-4 w-full py-3 rounded-xl bg-gradient-gold text-gold-foreground font-bold glow-gold"
        >
          {t("gClaimVal", { val: formatKRW(total) })}
        </button>
      )}
    </div>
  );
}

function DiceGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const [d, setD] = useState<[number, number] | null>(null);
  const [rolling, setRolling] = useState(false);
  function roll() {
    setRolling(true);
    let n = 0;
    const i = setInterval(() => {
      setD([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      n++;
      if (n > 12) {
        clearInterval(i);
        setRolling(false);
      }
    }, 80);
  }
  const sum = d ? d[0] + d[1] : 0;
  const won = sum >= 7;
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-4 my-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`w-24 h-24 rounded-2xl glass-strong neon-border flex items-center justify-center font-display font-black text-5xl ${rolling ? "animate-pulse" : ""}`}
          >
            {d ? d[i] : "?"}
          </div>
        ))}
      </div>
      <div className="text-sm text-muted-foreground break-keep tabular-nums">{t("gDiceLine", { sum })}</div>
      {!d || rolling ? (
        <button
          onClick={roll}
          disabled={rolling}
          className="press sheen mt-4 px-8 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-50"
        >
          {rolling ? t("gRolling") : t("gRollDice")}
        </button>
      ) : (
        <button
          onClick={() => onResult(won, won ? Math.floor(reward * (sum / 7)) : 0)}
          className={`press sheen mt-4 px-8 py-3 rounded-xl font-bold ${won ? "bg-gradient-gold text-gold-foreground glow-gold" : "bg-muted text-muted-foreground"}`}
        >
          {won ? `🎉 +${formatKRW(Math.floor(reward * (sum / 7)))}` : t("gNextTime")}
        </button>
      )}
    </div>
  );
}

function SlotGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const sym = ["💎", "🔥", "⚡", "👑", "🎰", "🌟"];
  const [reels, setReels] = useState<string[]>(["?", "?", "?"]);
  const [spinning, setSpinning] = useState(false);
  function spin() {
    setSpinning(true);
    let n = 0;
    const i = setInterval(() => {
      setReels([
        sym[Math.floor(Math.random() * sym.length)],
        sym[Math.floor(Math.random() * sym.length)],
        sym[Math.floor(Math.random() * sym.length)],
      ]);
      n++;
      if (n > 18) {
        clearInterval(i);
        // weighted: 22% triple match, 35% double
        const r = Math.random();
        let final: string[];
        if (r < 0.22) {
          const s = sym[Math.floor(Math.random() * sym.length)];
          final = [s, s, s];
        } else if (r < 0.55) {
          const s = sym[Math.floor(Math.random() * sym.length)];
          final = [s, s, sym[Math.floor(Math.random() * sym.length)]];
        } else {
          final = [
            sym[Math.floor(Math.random() * sym.length)],
            sym[Math.floor(Math.random() * sym.length)],
            sym[Math.floor(Math.random() * sym.length)],
          ];
        }
        setReels(final);
        setSpinning(false);
      }
    }, 70);
  }
  const isTriple = reels[0] !== "?" && reels[0] === reels[1] && reels[1] === reels[2];
  const isDouble =
    !isTriple && reels[0] !== "?" && (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]);
  const bonus = isTriple ? reward * 5 : isDouble ? Math.floor(reward * 1.5) : 0;
  const done = !spinning && reels[0] !== "?";
  return (
    <div className="text-center">
      <div className="grid grid-cols-3 gap-2 my-5">
        {reels.map((s, i) => (
          <div
            key={i}
            className={`aspect-square rounded-2xl glass-strong neon-border flex items-center justify-center text-5xl ${spinning ? "animate-pulse" : ""}`}
          >
            {s}
          </div>
        ))}
      </div>
      {isTriple && (
        <div className="font-display font-black text-2xl text-gradient-gold animate-pulse">⭐ TRIPLE! ×5 ⭐</div>
      )}
      {isDouble && <div className="font-display font-black text-lg text-secondary">DOUBLE! ×1.5</div>}
      {!done ? (
        <button
          onClick={spin}
          disabled={spinning}
          className="press sheen mt-4 px-8 py-3 rounded-xl bg-gradient-cyber text-primary-foreground font-bold glow-cyber disabled:opacity-50"
        >
          {spinning ? t("gSpinningSlot") : t("gSpin")}
        </button>
      ) : (
        <button
          onClick={() => onResult(bonus > 0, bonus)}
          className={`press sheen mt-4 px-8 py-3 rounded-xl font-bold ${bonus > 0 ? "bg-gradient-gold text-gold-foreground glow-gold" : "bg-muted text-muted-foreground"}`}
        >
          {bonus > 0 ? t("gReceiveVal", { val: formatKRW(bonus) }) : t("claim")}
        </button>
      )}
    </div>
  );
}

function HighLowGame({ reward, onResult }: { reward: number; onResult: (w: boolean, b: number) => void }) {
  const { t } = useTranslation("missions");
  const [card, setCard] = useState(() => 1 + Math.floor(Math.random() * 13));
  const [next, setNext] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [done, setDone] = useState(false);
  function pick(dir: "high" | "low") {
    const n = 1 + Math.floor(Math.random() * 13);
    setNext(n);
    const win = (dir === "high" && n > card) || (dir === "low" && n < card);
    setTimeout(() => {
      if (!win) {
        setDone(true);
      } else {
        setStreak((s) => s + 1);
        setCard(n);
        setNext(null);
      }
    }, 700);
  }
  const bonus = streak * Math.floor(reward * 0.4);
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-3 my-5">
        <div className="w-24 h-32 rounded-2xl glass-strong neon-border flex items-center justify-center font-display font-black text-4xl">
          {card}
        </div>
        {next !== null && (
          <div className="w-24 h-32 rounded-2xl bg-gradient-gold flex items-center justify-center font-display font-black text-4xl text-gold-foreground animate-fade-up">
            {next}
          </div>
        )}
      </div>
      <div className="text-xs text-muted-foreground">
        {t("gStreakBonus", { n: streak, val: formatKRW(bonus) })}
      </div>
      {!done ? (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => pick("low")}
            className="press py-3 rounded-xl bg-secondary text-secondary-foreground font-bold"
          >
            LOW ↓
          </button>
          <button
            onClick={() => pick("high")}
            className="press py-3 rounded-xl bg-primary text-primary-foreground font-bold glow-primary"
          >
            HIGH ↑
          </button>
          {streak > 0 && (
            <button
              onClick={() => onResult(true, bonus)}
              className="col-span-2 press sheen py-3 rounded-xl bg-gradient-gold text-gold-foreground font-bold glow-gold"
            >
              {t("gKeep", { val: formatKRW(bonus) })}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={() => onResult(streak > 0, bonus)}
          className="press sheen mt-4 px-8 py-3 rounded-xl bg-muted text-foreground font-bold"
        >
          {t("claim")}
        </button>
      )}
    </div>
  );
}
