/**
 * Empire Overview — Mission Control (Day 1 Final)
 *
 * 레이아웃
 *   ┌─ Hero: 월 500억 progress + Today Crown + 온라인 황제
 *   ├─ Main Grid (xl:3-col)
 *   │    Left  (col-span-2): 2x2 dashboard
 *   │      • Live Ghost Empire   • Hot Whale Feed
 *   │      • Crown Moments       • Quick Stats
 *   │    Right (col-span-1): God Mode Panel (sticky)
 *   └─ Bot Console (collapsed strip)
 *
 * 성능 포인트
 *   • 모든 카드 60s/30s 폴링 — Realtime 구독 ZERO (어드민이 직접 새로고침 부담 X)
 *   • Hero 글로우/Crown 글로우는 정적 CSS — JS 애니메이션 없음
 *   • count-up은 단일 rAF 훅, prefers-reduced-motion 자동 비활성
 *   • Bot Console 카드들은 below-the-fold → IntersectionObserver로 mount 지연
 *   • 봇 카드 5개는 Suspense 경계 분리 → 1개 실패해도 나머지 표시
 *   • 무거운 라이브러리(차트/Three) 일체 미사용 — lucide + framer 1회만
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Zap, Users, TrendingUp, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingCard } from "@/components/ui/loading-state";
import { useCountUp } from "@/hooks/use-count-up";
import { LiveGhostEmpireStatus } from "./LiveGhostEmpireStatus";
import { HotUsersCard } from "./HotUsersCard";
import { CrownMomentsCard } from "./CrownMomentsCard";
import { QuickStatsCard } from "./QuickStatsCard";
import { GodModePanel } from "./GodModePanel";

// Bot Console — below-the-fold, 별도 chunk
const TodaysCrownExplosionCard = lazy(() =>
  import("./TodaysCrownExplosionCard").then(m => ({ default: m.TodaysCrownExplosionCard })));
const DemoBiasPerformanceCard = lazy(() =>
  import("./DemoBiasPerformanceCard").then(m => ({ default: m.DemoBiasPerformanceCard })));
const TelegramBotStatusCard = lazy(() =>
  import("./TelegramBotStatusCard").then(m => ({ default: m.TelegramBotStatusCard })));

type RevenueProgress = { goal_krw: number; total_krw: number; progress_pct: number };
type CrownTotal = { count: number; total_awarded: number; explosions: number };
type EmpireRealtime = { online_now: number; open_positions: number; total_phon: number; last_crown_at: string | null };

const fmtKRW = (n: number) => new Intl.NumberFormat("ko-KR").format(Math.round(n));

export default function EmpireOverview() {
  const [revenue, setRevenue] = useState<RevenueProgress | null>(null);
  const [crown, setCrown] = useState<CrownTotal | null>(null);
  const [realtime, setRealtime] = useState<EmpireRealtime | null>(null);

  useEffect(() => {
    let on = true;
    const refresh = async () => {
      const [r1, r2, r3] = await Promise.all([
        supabase.rpc("admin_get_monthly_revenue_progress" as any),
        supabase.rpc("admin_get_today_crown_total" as any),
        supabase.rpc("admin_get_empire_realtime" as any),
      ]);
      if (!on) return;
      if (!r1.error && r1.data) setRevenue(r1.data as any);
      if (!r2.error && r2.data) setCrown(r2.data as any);
      if (!r3.error && r3.data) setRealtime(r3.data as any);
    };
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => { on = false; clearInterval(id); };
  }, []);

  const pct = useMemo(() => Math.min(100, revenue?.progress_pct ?? 0), [revenue]);
  const animPct = useCountUp(pct, 1100);
  const animTotal = useCountUp(revenue?.total_krw ?? 0, 1100);
  const animExpl = useCountUp(crown?.explosions ?? 0, 700);
  const animAwarded = useCountUp(crown?.total_awarded ?? 0, 900);
  const animOnline = useCountUp(realtime?.online_now ?? 0, 700);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
            🌍 Empire Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Mission Control · 월 500억 달성률 · 실시간 제국 통제
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE · 60s polling
        </div>
      </header>

      {/* ──────────────── HERO ──────────────── */}
      <section className="glass-strong rounded-3xl p-5 sm:p-7 border border-primary/30 relative overflow-hidden">
        {/* 정적 그라디언트 — 0 JS */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_55%)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,hsl(45_100%_60%/0.12),transparent_60%)]" />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
          <div className="space-y-4 min-w-0">
            <div className="flex items-end justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> 월 500억 달성률
                </div>
                <div className="font-display font-black text-4xl sm:text-6xl mt-1 tabular-nums
                                bg-gradient-to-r from-primary via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  {animPct.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">이번 달 누적</div>
                <div className="font-display font-bold text-xl sm:text-2xl tabular-nums">
                  ₩ {fmtKRW(animTotal)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                  / ₩ {fmtKRW(revenue?.goal_krw ?? 50_000_000_000)}
                </div>
              </div>
            </div>

            {/* Progress — width transition으로 GPU만 사용, 무한 애니 X */}
            <div className="h-4 sm:h-5 rounded-full bg-muted/40 overflow-hidden relative ring-1 ring-border/40">
              <div
                className="h-full bg-gradient-to-r from-primary via-yellow-400 to-orange-500 relative transition-[width] duration-1000 ease-out
                           shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
                style={{ width: `${pct}%` }}
              >
                {/* shimmer — pure CSS, GPU translate, hover 없을 땐 paused로 두지 않음(작아서 OK) */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_3.2s_ease-in-out_infinite]
                                bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
            </div>
          </div>

          {/* Hero KPI 3종 */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:w-[260px]">
            <HeroKpi
              icon={<Crown className="h-3.5 w-3.5" />}
              label="오늘 Crown 폭발"
              value={Math.round(animExpl).toLocaleString()}
              accent="from-yellow-400 to-orange-500"
            />
            <HeroKpi
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Crown 총 보상"
              value={`${fmtKRW(animAwarded)} ₡`}
              accent="from-fuchsia-500 to-pink-500"
            />
            <HeroKpi
              icon={<Users className="h-3.5 w-3.5" />}
              label="온라인 황제"
              value={Math.round(animOnline).toLocaleString()}
              accent="from-emerald-400 to-cyan-400"
            />
          </div>
        </div>
      </section>

      {/* ──────────────── MAIN GRID ──────────────── */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <LiveGhostEmpireStatus />
          <HotUsersCard />
          <CrownMomentsCard />
          <QuickStatsCard />
        </div>
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <GodModePanel />
        </aside>
      </section>

      {/* ──────────────── BOT CONSOLE (below-the-fold) ──────────────── */}
      <BelowFoldBots />

      {/* shimmer keyframes — Tailwind에 없는 1회용이라 인라인 (8 lines, no extra css file) */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── */

function HeroKpi({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-xl p-2.5 border border-border/40 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 h-16 w-16 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          {icon} {label}
        </div>
        <div className={`font-display font-black text-lg sm:text-xl mt-0.5 tabular-nums bg-gradient-to-r ${accent} bg-clip-text text-transparent`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/**
 * Below-the-fold Bot Console.
 * IntersectionObserver로 진입 직전에 mount → 초기 번들에서 제외.
 */
function BelowFoldBots() {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === "undefined") {
      setMount(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setMount(true); io.disconnect(); } },
      { rootMargin: "200px" }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="space-y-3 min-h-[180px]">
      <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-wider">
        <Activity className="h-3.5 w-3.5" /> Bot Console
      </div>
      {!mount ? (
        <LoadingCard />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <Suspense fallback={<LoadingCard />}><TodaysCrownExplosionCard /></Suspense>
          <Suspense fallback={<LoadingCard />}><DemoBiasPerformanceCard /></Suspense>
          <Suspense fallback={<LoadingCard />}><TelegramBotStatusCard /></Suspense>
        </div>
      )}
    </section>
  );
}
