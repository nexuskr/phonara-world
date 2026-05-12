import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Sparkles, Swords, Zap, Share2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useEmpireBooster } from "@/hooks/use-empire-booster";
import { useCrownWar, formatMSS } from "@/hooks/use-crown-war";
import Layout from "@/components/Layout";
import { LoadingList } from "@/components/ui/loading-state";


const EmpireHallScene = lazy(() => import("@/components/empire/EmpireHallScene"));

const TIER_NAMES = ["", "Citizen", "Squire", "Knight", "Guardian", "Lord", "Earl", "Baron", "Viscount", "Marquis", "Emperor"];
const TIER_COLOR: Record<number, string> = {
  1: "text-zinc-400", 2: "text-emerald-400", 3: "text-sky-400", 4: "text-indigo-400", 5: "text-violet-400",
  6: "text-amber-400", 7: "text-pink-400", 8: "text-fuchsia-400", 9: "text-cyan-300", 10: "text-gold",
};

type Profile = { id: string; nickname: string | null; empire_level: number; crown_score: number };

export default function EmpireHall() {
  const user = useRequireAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todayCrown, setTodayCrown] = useState(0);
  const [todayPractice, setTodayPractice] = useState(0);
  const { booster } = useEmpireBooster();
  const { snap: warSnap, remainingMs, isFinaleWindow } = useCrownWar(15000);

  useEffect(() => { document.title = "👑 나의 제국 · Empire Hall"; }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, nickname, empire_level, crown_score")
        .eq("id", authUser.id)
        .maybeSingle();
      if (!alive) return;
      if (prof) setProfile(prof as Profile);

      // today's crown sum + practice count
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { data: events } = await supabase
        .from("crown_events")
        .select("awarded_amount, event_type, created_at")
        .eq("user_id", authUser.id)
        .gte("created_at", since.toISOString())
        .limit(500);
      if (alive && events) {
        setTodayCrown(events.reduce((s, e: any) => s + (e.awarded_amount || 0), 0));
        setTodayPractice(events.filter((e: any) => e.event_type === "practice_win").length);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  if (!user) return null;
  if (!profile) {
    return <Layout><div className="p-6"><LoadingList rows={5} /></div></Layout>;
  }

  const lv = Math.max(1, Math.min(10, profile.empire_level));
  const isBaron = lv >= 7;
  const tierName = TIER_NAMES[lv];
  const tierColor = TIER_COLOR[lv];
  const boosterActive = !!booster && new Date(booster.expires_at).getTime() > Date.now();
  const myWarRank = warSnap?.me?.rank ?? null;

  return (
    <Layout>
      <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background via-background to-black">
        {/* Hero — 3D castle stage */}
        <div className="relative w-full" style={{ height: "min(70vh, 540px)" }}>
          <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-muted-foreground text-xs">제국 소환 중…</div>}>
            <EmpireHallScene level={lv} boosterActive={boosterActive} />
          </Suspense>

          {/* gradient overlays for legibility */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background" />

          {/* Top hero text */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7 }}
            className="absolute top-6 left-0 right-0 text-center px-4"
          >
            <div className="text-[10px] tracking-[0.5em] font-black text-gold/80">PHONARA · EMPIRE HALL</div>
            <div className="mt-2 font-display font-black text-4xl md:text-5xl bg-gradient-to-b from-gold via-yellow-200 to-gold/60 bg-clip-text text-transparent">
              {profile.nickname || "Empire●●●"}의 제국
            </div>
            <div className={`mt-1 text-xs font-bold tracking-[0.3em] ${tierColor}`}>
              LV.{lv} · {tierName?.toUpperCase()}
            </div>
          </motion.div>

          {/* Bottom — floating Crown counter */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl glass-strong border border-gold/40 shadow-[0_0_40px_-10px_hsl(var(--gold)/0.6)] flex items-center gap-3"
          >
            <Crown className="w-5 h-5 text-gold" />
            <div>
              <div className="text-[9px] tracking-[0.25em] font-black text-muted-foreground uppercase">내 제국의 Crown</div>
              <div className="font-display font-black text-2xl tabular-nums text-gold">
                {profile.crown_score.toLocaleString()} ₡
              </div>
            </div>
          </motion.div>
        </div>

        {/* HUD cards */}
        <div className="px-4 -mt-8 relative z-10 max-w-md mx-auto space-y-3 pb-24">
          {/* Booster card */}
          {boosterActive && (
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 border-gold/50 bg-gradient-to-r from-gold/15 to-transparent p-4 relative overflow-hidden"
            >
              <motion.div
                className="absolute -inset-px rounded-2xl"
                style={{ background: "linear-gradient(120deg, transparent 30%, hsl(var(--gold)/0.3) 50%, transparent 70%)" }}
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
              <div className="relative flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-gold" />
                <div className="flex-1">
                  <div className="text-[10px] tracking-[0.25em] font-black text-gold uppercase">EMPIRE BOOSTER 활성</div>
                  <div className="text-sm font-bold">수수료 -{Math.round((1 - booster!.fee_discount) * 100)}% · Crown ×{booster!.crown_multiplier} · 레버리지 {booster!.leverage}x</div>
                </div>
                <Zap className="w-5 h-5 text-gold animate-pulse" />
              </div>
            </motion.div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <Label icon={Crown} text="오늘 Crown" tone="gold" />
              <Value>+{todayCrown.toLocaleString()}</Value>
              <Sub>{todayPractice}회 Practice 승리</Sub>
            </Card>
            <Card>
              <Label icon={Swords} text="Crown War" tone={isFinaleWindow ? "destructive" : "primary"} />
              <Value>{myWarRank ? `#${myWarRank}` : "—"}</Value>
              <Sub>{warSnap?.war ? formatMSS(remainingMs) + " 남음" : "다음 라운드 대기"}</Sub>
            </Card>
          </div>

          {/* CTA */}
          <Link
            to="/dashboard"
            className="block rounded-2xl border border-primary/40 bg-primary/5 p-4 hover-scale"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-[0.25em] font-black text-primary uppercase">제국 강화</div>
                <div className="font-display font-black text-lg">다음 라운드 출정</div>
              </div>
              <ArrowRight className="w-5 h-5 text-primary" />
            </div>
          </Link>

          {!isBaron && (
            <Link
              to="/packages"
              className="block rounded-2xl border border-gold/30 bg-gradient-to-r from-gold/10 to-transparent p-4 hover-scale"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] tracking-[0.25em] font-black text-gold uppercase">BARON 승급</div>
                  <div className="font-display font-black text-lg">제국의 귀족이 되어 24시간 부스터를 잠금 해제</div>
                </div>
                <Crown className="w-5 h-5 text-gold" />
              </div>
            </Link>
          )}

          {/* Share Empire */}
          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={async () => {
                const url = `${window.location.origin}/empire/hall`;
                if ((navigator as any).share) {
                  try { await (navigator as any).share({ title: "나의 Phonara 제국", url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(url);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gold/90 to-gold/70 text-background font-black text-sm shadow-[0_0_24px_-6px_hsl(var(--gold)/0.7)] active:scale-95 transition"
            >
              <Share2 className="w-4 h-4" />
              제국 자랑하기
            </button>
          </div>

          <div className="pt-4 text-center text-[10px] text-muted-foreground/70">
            ₡는 SIM(시뮬레이션) 단위입니다. 실제 통화/수익을 의미하지 않습니다.
          </div>
        </div>
      </div>
    </Layout>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass-strong rounded-2xl border border-white/10 p-3">{children}</div>;
}
function Label({ icon: Icon, text, tone }: { icon: any; text: string; tone: "gold" | "primary" | "destructive" }) {
  const cls = tone === "gold" ? "text-gold" : tone === "destructive" ? "text-destructive" : "text-primary";
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={`w-3.5 h-3.5 ${cls}`} />
      <span className="text-[9px] tracking-[0.2em] font-black text-muted-foreground uppercase">{text}</span>
    </div>
  );
}
function Value({ children }: { children: React.ReactNode }) {
  return <div className="font-display font-black text-2xl tabular-nums text-foreground">{children}</div>;
}
function Sub({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] text-muted-foreground mt-0.5">{children}</div>;
}
