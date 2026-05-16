import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Globe2, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import TopEmperorBanner from "./TopEmperorBanner";
import CompetitorCompareTicker from "./CompetitorCompareTicker";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Headline = { text: string; tone: string; created_at: string };

type Stats = {
  gmv_24h: number;
  payout_total: number;
  active_emperors: number;
  max_crown_24h: number;
  active_users_24h: number;
  signed_up_today: number;
  server_now: number;
};

type Activity = {
  kind: string;
  flag: string;
  title: string;
  amount: number;
  user_mask: string;
  created_at: string;
};

function fmt(n: number): string {
  if (!n || isNaN(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return Math.round(n).toLocaleString();
}

// 시간대 자동 헤드라인 (사용자 로컬 + 글로벌 세션)
function useSessionHeadline(): { title: string; sub: string; tone: string } {
  return useMemo(() => {
    const now = new Date();
    // 동시 활성 세션 추정
    const utcH = now.getUTCHours();
    // KST(UTC+9), JST(UTC+9), EST(UTC-5)
    const kstH = (utcH + 9) % 24;
    const estH = (utcH + 19) % 24;

    if (kstH >= 2 && kstH < 6) {
      return { title: "Night Crown Rush", sub: "심야 황제들이 움직이는 시간", tone: "from-purple-500/30 to-amber-500/30" };
    }
    if (kstH >= 21 || kstH < 1) {
      return { title: "Korean Prime Hour", sub: "한국 황제 세션 활성", tone: "from-rose-500/30 to-amber-500/30" };
    }
    if (kstH >= 9 && kstH < 18) {
      return { title: "Tokyo Empire Rising", sub: "동아시아 트레이딩 골든타임", tone: "from-amber-500/30 to-rose-500/30" };
    }
    if (estH >= 9 && estH < 17) {
      return { title: "New York Session Active", sub: "월스트리트가 깨어났다", tone: "from-emerald-500/30 to-cyan-500/30" };
    }
    return { title: "Global Empire Live", sub: "전 세계 24시간 가동중", tone: "from-cyan-500/30 to-violet-500/30" };
  }, []);
}

function StatCell({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col items-start gap-1 px-3 py-2 rounded-lg bg-card/40 border border-border/40 backdrop-blur-sm min-w-[110px]">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-lg font-bold tabular-nums ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

export default function WorldDominationWall() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [feed, setFeed] = useState<Activity[]>([]);
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [hIdx, setHIdx] = useState(0);
  const sessionFallback = useSessionHeadline();

  useEffect(() => {
    let alive = true;
    async function tick() {
      const [s, f] = await Promise.all([
        supabase.rpc("get_world_domination_stats" as any),
        supabase.rpc("get_live_activity_60s" as any, { _limit: 20 } as any),
      ]);
      if (!alive) return;
      if (s.data) setStats(s.data as Stats);
      if (f.data && Array.isArray(f.data)) setFeed(f.data as Activity[]);
    }
    tick();
    const id = setVisibleInterval(tick, 5000 , { meta: { owner: "WorldDominationWall", category: "cosmetic" } });
    return () => { alive = false; id(); };
  }, []);

  // AI 헤드라인 풀
  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await supabase.rpc("get_daily_headlines" as any, { _locale: "any", _limit: 10 } as any);
      if (alive && Array.isArray(data) && data.length > 0) setHeadlines(data as Headline[]);
    }
    load();
    const id = setVisibleInterval(load, 5 * 60_000 , { meta: { owner: "WorldDominationWall", category: "cosmetic" } }); // 5분마다 갱신
    return () => { alive = false; id(); };
  }, []);

  // 8초마다 헤드라인 회전
  useEffect(() => {
    if (headlines.length <= 1) return;
    return setVisibleInterval(() => setHIdx((i) => (i + 1) % headlines.length), 8000, { meta: { owner: "WorldDominationWall:headline-rotator", category: "cosmetic" } });
  }, [headlines.length]);

  const activeHeadline = headlines[hIdx];

  // 빈 피드 시 시드(데모) — 실데이터 1건이라도 오면 즉시 교체
  const displayFeed: Activity[] = feed.length > 0 ? feed : [
    { kind: "crown_explosion", flag: "👑", title: "Crown Explosion", amount: 2341, user_mask: "Whale a3f1", created_at: new Date().toISOString() },
    { kind: "nft_mint", flag: "🪐", title: "DIAMOND emperor", amount: 35, user_mask: "Empire 8c20", created_at: new Date().toISOString() },
    { kind: "baron_promotion", flag: "⚜️", title: "Tier 9", amount: 9, user_mask: "Baron f4d2", created_at: new Date().toISOString() },
  ];

  const flags = ["🇰🇷", "🇯🇵", "🇺🇸", "🇻🇳", "🇸🇬", "🇮🇩", "🇹🇼", "🇹🇭", "🇭🇰", "🇲🇾", "🇨🇦", "🇩🇪"];

  return (
    <section className="relative w-full overflow-hidden border-y border-border/50 bg-gradient-to-b from-background via-background/95 to-background">
      {/* Tone overlay */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-r ${sessionFallback.tone} opacity-30`} />

      <div className="relative max-w-7xl mx-auto px-4 py-4 md:py-5 space-y-3">
        {/* AI 헤드라인 회전 + 세션 폴백 */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 min-w-0">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_currentColor] shrink-0"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 shrink-0">LIVE NOW</span>
            <div className="relative h-7 flex-1 min-w-0 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.span
                  key={(activeHeadline?.text ?? sessionFallback.title) + hIdx}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center text-base md:text-lg font-bold bg-gradient-to-r from-amber-300 via-amber-100 to-amber-300 bg-clip-text text-transparent truncate"
                  title={activeHeadline?.text ?? sessionFallback.title}
                >
                  {activeHeadline?.text ?? sessionFallback.title}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe2 className="w-3.5 h-3.5" />
            <span>{stats?.active_users_24h ?? 0} 활성</span>
          </div>
        </div>

        {/* Top Emperor of the Day (24h Crown 1위) */}
        <TopEmperorBanner />

        {/* KPI 행 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatCell
            icon={<TrendingUp className="w-3 h-3" />}
            label="24H GMV"
            value={fmt(stats?.gmv_24h ?? 0) + " PHON"}
            accent="text-amber-300"
          />
          <StatCell
            icon={<Sparkles className="w-3 h-3" />}
            label="누적 출금"
            value={fmt(stats?.payout_total ?? 0) + " PHON"}
            accent="text-emerald-300"
          />
          <StatCell
            icon={<Crown className="w-3 h-3" />}
            label="활성 황제"
            value={fmt(stats?.active_emperors ?? 0)}
            accent="text-rose-300"
          />
          <StatCell
            icon={<Zap className="w-3 h-3" />}
            label="24H 최대 Crown"
            value={"+" + fmt(stats?.max_crown_24h ?? 0)}
            accent="text-violet-300"
          />
          <StatCell
            icon={<Users className="w-3 h-3" />}
            label="오늘 신규"
            value={fmt(stats?.signed_up_today ?? 0)}
            accent="text-cyan-300"
          />
        </div>

        {/* 국가 깃발 마키 + LIVE NOW 피드 (한 줄) */}
        <div className="flex flex-col md:flex-row gap-2 items-stretch">
          {/* 깃발 */}
          <div className="md:w-1/3 overflow-hidden rounded-md bg-card/30 border border-border/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">활동 국가</div>
            <motion.div
              className="flex gap-2 text-2xl whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            >
              {[...flags, ...flags].map((f, i) => (
                <span key={i} className="opacity-90">{f}</span>
              ))}
            </motion.div>
          </div>

          {/* Live Feed */}
          <div className="flex-1 overflow-hidden rounded-md bg-card/30 border border-border/40 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">최근 60초 제국 활동</div>
            <div className="relative h-7 overflow-hidden">
              <AnimatePresence mode="popLayout">
                {displayFeed.slice(0, 1).map((a, idx) => (
                  <motion.div
                    key={a.created_at + a.user_mask + idx}
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -24, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 flex items-center gap-2 text-sm"
                  >
                    <span className="text-xl">{a.flag}</span>
                    <span className="font-semibold text-foreground">{a.user_mask}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-amber-200">{a.title}</span>
                    {a.amount > 0 && (
                      <span className="text-emerald-300 font-bold tabular-nums">+{fmt(a.amount)}</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* vs CEX 비교 (공개 데이터, 출처 링크 포함) */}
        <CompetitorCompareTicker />
      </div>
    </section>
  );
}
