import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Coins, Swords, TrendingUp, Wallet, ChevronRight } from "lucide-react";
import WhaleStrikeRail from "@/components/empire/WhaleStrikeRail";

/**
 * Dashboard `/dashboard` — PR-P1-B 대청소.
 * Tier S 5탭 진입 카드 + 단일 Whale Strike Rail 만 유지.
 * (FOMO 중복, GameArt, PullToRefresh, 게임 카탈로그 → 각 도메인 페이지로 이전)
 */
type Tile = { to: string; title: string; sub: string; icon: typeof Coins; tone: "gold" | "pink" | "azure" | "emerald" };

const TILES: Tile[] = [
  { to: "/earn",  title: "무료돈벌기",   sub: "오늘의 무료 미션 · PHON 적립", icon: Coins,      tone: "gold" },
  { to: "/duel",  title: "실시간 대결", sub: "지금 입장 가능한 대결룸",       icon: Swords,     tone: "pink" },
  { to: "/trade", title: "실시간 예측", sub: "BTC/ETH 라이브 예측 보상",       icon: TrendingUp, tone: "azure" },
  { to: "/phon",  title: "내 PHON",     sub: "잔액 · 출금 · 보상 내역",       icon: Wallet,     tone: "emerald" },
];

function toneClasses(t: Tile["tone"]) {
  switch (t) {
    case "gold":    return "from-amber-500/30 via-amber-700/10 to-stone-950 hover:border-[hsl(var(--gold)/0.9)]";
    case "pink":    return "from-rose-500/30 via-rose-700/10 to-stone-950 hover:border-[hsl(var(--pink)/0.9)]";
    case "azure":   return "from-sky-500/30 via-sky-700/10 to-stone-950 hover:border-sky-400/80";
    case "emerald": return "from-emerald-500/30 via-emerald-700/10 to-stone-950 hover:border-emerald-400/80";
  }
}

export default function Dashboard() {
  const user = useRequireAuth();
  if (!user) return null;

  return (
    <Layout>
      <div className="container pt-6 pb-12 space-y-8 relative">
        {/* Hero ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-[260px] -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, hsl(var(--gold)/0.16), transparent 70%), radial-gradient(40% 80% at 80% 10%, hsl(var(--pink)/0.10), transparent 70%)",
          }}
        />

        {/* Simple welcome header */}
        <header className="space-y-2">
          <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] uppercase">
            Phonara
          </div>
          <h1
            className="font-imperial text-foreground tracking-[0.02em] leading-[1.1]"
            style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)" }}
          >
            오늘의 <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent">리워드 챌린지</span>
          </h1>
          <p className="text-sm text-muted-foreground">무료 예측 · 무료돈벌기 · 실시간 보상</p>
        </header>

        {/* Tier S — 5 entry tiles */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TILES.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`group relative aspect-[5/4] rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br ${toneClasses(t.tone)} hover:-translate-y-1 transition-all duration-300 p-4 flex flex-col justify-between min-h-[120px]`}
                style={{ touchAction: "manipulation" }}
              >
                <div className="flex items-center justify-between">
                  <Icon className="w-6 h-6 text-foreground/90" />
                  <ChevronRight className="w-4 h-4 text-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div>
                  <div className="font-bold text-base text-foreground">{t.title}</div>
                  <div className="text-[11px] text-foreground/60 mt-0.5">{t.sub}</div>
                </div>
              </Link>
            );
          })}
        </section>

        {/* Single live signal — Whale Strike Rail */}
        <WhaleStrikeRail />
      </div>
    </Layout>
  );
}
