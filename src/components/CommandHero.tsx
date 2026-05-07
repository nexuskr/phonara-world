import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Crown, Flame, Target, ChevronRight, TrendingUp } from "lucide-react";
import { useDB, formatKRW, DEFAULT_MISSIONS } from "@/lib/store";
import EmpireFoundingCounter from "@/components/EmpireFoundingCounter";
import throneBg from "@/assets/command-throne-bg.jpg";

/**
 * Phonara Command Hero — 로그인 직후 첫 영웅 카드
 * 잔고(거대 골드) + 추천 미션(우측) + Empire 30석(하단)
 */
export default function CommandHero() {
  const [db] = useDB();
  const user = db.user;
  const { t } = useTranslation("hubs");
  const [shown, setShown] = useState(false);
  const [count, setCount] = useState(0);

  // Balance count-up — once per session
  useEffect(() => {
    if (!user) return;
    const KEY = "phonara_balance_counted_v1";
    const target = user.balance ?? 0;
    if (typeof window !== "undefined" && sessionStorage.getItem(KEY)) {
      setCount(target);
      setShown(true);
      return;
    }
    setShown(true);
    const dur = 800;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else sessionStorage.setItem(KEY, "1");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [user]);

  if (!user) return null;
  const featured = DEFAULT_MISSIONS[0];
  const today = user.todayEarnings ?? 0;

  return (
    <section className="relative overflow-hidden rounded-3xl glass-strong neon-border animate-fade-up">
      {/* Background plate */}
      <div className="absolute inset-0 -z-10">
        <img
          src={throneBg}
          alt=""
          aria-hidden
          width={1920}
          height={1080}
          loading="eager"
          decoding="async"
          className="w-full h-full object-cover opacity-40 blur-[2px] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/90" />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-accent/15 blur-3xl animate-float-slow" />
      </div>

      <div className="relative p-5 md:p-7">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-primary font-bold mb-0.5">COMMAND</p>
            <h2 className="font-display font-bold text-base md:text-lg text-foreground/90">
              <span className="text-gradient-imperial">{user.nickname}</span>
              <span className="text-muted-foreground">, Commander</span>
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass border border-primary/30">
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold tabular-nums">{user.streak}일</span>
          </div>
        </div>

        {/* Hero content — split */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">
          {/* Balance (3/5) */}
          <Link
            to="/treasury"
            className={`md:col-span-3 group relative rounded-2xl p-4 md:p-5 glass border border-primary/20 hover:border-primary/50 transition press ${
              shown ? "animate-balance-in" : "opacity-0"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] tracking-[0.25em] text-muted-foreground font-bold">BALANCE</span>
              {today > 0 && (
                <span className="ml-auto flex items-center gap-1 text-[10px] text-secondary font-bold">
                  <TrendingUp className="w-3 h-3" /> +{formatKRW(today)}
                </span>
              )}
            </div>
            <div className="font-hud font-black text-3xl md:text-5xl text-gradient-imperial tabular-nums leading-none">
              {formatKRW(count)}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              탭하여 출금 · 입금 · 내역
            </div>
          </Link>

          {/* Featured mission (2/5) */}
          <Link
            to="/missions"
            className="md:col-span-2 group relative rounded-2xl p-4 md:p-5 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/30 hover:border-primary/60 transition tilt-card overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/30 blur-2xl group-hover:bg-primary/50 transition" />
            <div className="relative flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-imperial flex items-center justify-center glow-imperial">
                <Target className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[10px] tracking-[0.25em] text-primary font-bold">TODAY MISSION</span>
            </div>
            <p className="relative text-sm font-bold leading-snug line-clamp-2 mb-2">
              {featured?.title ?? "오늘의 미션 시작"}
            </p>
            <div className="relative flex items-center justify-between">
              <span className="text-gradient-imperial font-hud font-black text-base tabular-nums">
                +{formatKRW(featured?.reward ?? 3000)}
              </span>
              <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        </div>

        {/* Empire 30 seats — FOMO */}
        <div className="mt-4">
          <EmpireFoundingCounter />
        </div>
      </div>
    </section>
  );
}
