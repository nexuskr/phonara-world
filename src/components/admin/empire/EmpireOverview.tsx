/**
 * Empire Overview — Day 1 골격
 * 헤로: 월 500억 진행률 + 오늘 Crown Explosion Total
 * 그리드: 실시간 제국 스냅샷 + 봇 콘솔 5 카드
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Zap, Users, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingCard } from "@/components/ui/loading-state";
import { LiveGhostEmpireStatus } from "./LiveGhostEmpireStatus";
import { TodaysCrownExplosionCard } from "./TodaysCrownExplosionCard";
import { HotUsersCard } from "./HotUsersCard";
import { DemoBiasPerformanceCard } from "./DemoBiasPerformanceCard";
import { TelegramBotStatusCard } from "./TelegramBotStatusCard";

type RevenueProgress = {
  goal_krw: number;
  total_krw: number;
  progress_pct: number;
};

type CrownTotal = {
  count: number;
  total_awarded: number;
  explosions: number;
};

type EmpireRealtime = {
  online_now: number;
  open_positions: number;
  total_phon: number;
  last_crown_at: string | null;
};

const fmtKRW = (n: number) =>
  new Intl.NumberFormat("ko-KR").format(Math.round(n));

export default function EmpireOverview() {
  const [revenue, setRevenue] = useState<RevenueProgress | null>(null);
  const [crown, setCrown] = useState<CrownTotal | null>(null);
  const [realtime, setRealtime] = useState<EmpireRealtime | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [r1, r2, r3] = await Promise.all([
      supabase.rpc("admin_get_monthly_revenue_progress" as any),
      supabase.rpc("admin_get_today_crown_total" as any),
      supabase.rpc("admin_get_empire_realtime" as any),
    ]);
    if (!r1.error && r1.data) setRevenue(r1.data as any);
    if (!r2.error && r2.data) setCrown(r2.data as any);
    if (!r3.error && r3.data) setRealtime(r3.data as any);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  const pct = useMemo(() => Math.min(100, revenue?.progress_pct ?? 0), [revenue]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display font-black text-2xl sm:text-3xl">
          🎯 Empire Overview
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          실시간 제국 통제 — 월 500억 달성률 · 오늘의 Crown Explosion
        </p>
      </header>

      {/* ───────── 헤로 1 : 월 500억 progress ───────── */}
      <section className="glass-strong rounded-3xl p-5 sm:p-7 border border-primary/30 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="relative space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> 월 500억 달성률
              </div>
              <div className="font-display font-black text-3xl sm:text-5xl mt-1 bg-gradient-to-r from-primary via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {pct.toFixed(2)}%
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">이번 달 누적</div>
              <div className="font-display font-bold text-xl sm:text-2xl">
                ₩ {fmtKRW(revenue?.total_krw ?? 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                / ₩ {fmtKRW(revenue?.goal_krw ?? 50_000_000_000)}
              </div>
            </div>
          </div>

          <div className="h-4 sm:h-5 rounded-full bg-muted/40 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary via-yellow-400 to-orange-500 relative"
            >
              <div className="absolute inset-0 animate-pulse bg-white/10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ───────── 헤로 2 : Today Crown Explosion ───────── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HeroStat
          icon={<Crown className="h-4 w-4" />}
          label="오늘 Crown Explosion"
          value={crown?.explosions ?? 0}
          accent="from-yellow-500 to-orange-500"
          big
        />
        <HeroStat
          icon={<Zap className="h-4 w-4" />}
          label="오늘 Crown 총 보상"
          value={`${fmtKRW(crown?.total_awarded ?? 0)} ₡`}
          accent="from-fuchsia-500 to-pink-500"
        />
        <HeroStat
          icon={<Users className="h-4 w-4" />}
          label="현재 온라인"
          value={realtime?.online_now ?? 0}
          accent="from-emerald-500 to-cyan-500"
        />
      </section>

      {/* ───────── 봇 콘솔 5 카드 ───────── */}
      <section className="space-y-3">
        <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          🤖 Bot Console
        </div>
        {loading ? (
          <LoadingCard />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <LiveGhostEmpireStatus />
            <TodaysCrownExplosionCard />
            <HotUsersCard />
            <DemoBiasPerformanceCard />
            <TelegramBotStatusCard />
          </div>
        )}
      </section>
    </div>
  );
}

function HeroStat({
  icon,
  label,
  value,
  accent,
  big,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: string;
  big?: boolean;
}) {
  return (
    <div className="glass-strong rounded-2xl p-4 border border-border/40 relative overflow-hidden">
      <div
        className={`absolute -top-8 -right-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} opacity-20 blur-2xl`}
      />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          {icon} {label}
        </div>
        <div
          className={`font-display font-black mt-1 ${
            big ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
          } bg-gradient-to-r ${accent} bg-clip-text text-transparent`}
        >
          {typeof value === "number" ? value.toLocaleString() : value}
        </div>
      </div>
    </div>
  );
}
