import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Crown, Sparkles, Zap, TrendingUp, ChevronRight } from "lucide-react";
import ImperialLiveActivity from "@/components/live/ImperialLiveActivity";
import ImperialTradeSection from "@/components/dashboard/ImperialTradeSection";

/**
 * Dashboard — v19 Phase 0-R TRUE Clean Rebuild.
 * Stake-style game catalog. 옛 위젯·산만한 마키·토스트 0개.
 * Hero(검색-less) → 카테고리 칩 → Originals → Slots → Trading 진입.
 */
type GameCard = {
  to: string;
  title: string;
  badge?: string;
  multiplier?: string;
  tone: "gold" | "violet" | "rose" | "emerald" | "azure";
};

const ORIGINALS: GameCard[] = [
  { to: "/casino/olympus-1000", title: "Olympus 1000", multiplier: "1000×", tone: "gold" },
  { to: "/casino/wizard-2000", title: "Wizard 2000", multiplier: "2000×", tone: "violet" },
  { to: "/casino/cosmic-forge-5000", title: "Cosmic Forge", multiplier: "5000×", tone: "azure" },
  { to: "/casino/sugar-fever-3000", title: "Sugar Fever", multiplier: "3000×", tone: "rose" },
  { to: "/casino/viking-thunder-4000", title: "Viking Thunder", multiplier: "4000×", tone: "azure" },
  { to: "/casino/olympus-legacy-5000", title: "Olympus Legacy", multiplier: "5000×", tone: "gold" },
];

const SLOTS: GameCard[] = [
  { to: "/casino/dragon-empire", title: "Dragon Empire", badge: "HOT", tone: "rose" },
  { to: "/casino/pharaohs-vault-2500", title: "Pharaoh's Vault", multiplier: "2500×", tone: "gold" },
  { to: "/casino/pirates-curse-1500", title: "Pirate's Curse", multiplier: "1500×", tone: "emerald" },
  { to: "/casino/aztec-sun-1200", title: "Aztec Sun", multiplier: "1200×", tone: "gold" },
  { to: "/casino/neon-tokyo-88", title: "Neon Tokyo 88", badge: "NEW", tone: "violet" },
  { to: "/casino/cherry-sakura-500", title: "Cherry Sakura", multiplier: "500×", tone: "rose" },
];

const CATEGORIES = [
  { to: "/casino", icon: Sparkles, label: "슬롯" },
  { to: "/crash", icon: Zap, label: "Crash" },
  { to: "/trade", icon: TrendingUp, label: "트레이딩" },
  { to: "/empire", icon: Crown, label: "제국" },
];

function toneClasses(tone: GameCard["tone"]) {
  switch (tone) {
    case "gold":    return "from-amber-500/30 via-amber-700/15 to-stone-950";
    case "violet":  return "from-violet-500/30 via-violet-700/15 to-stone-950";
    case "rose":    return "from-rose-500/30 via-rose-700/15 to-stone-950";
    case "emerald": return "from-emerald-500/30 via-emerald-700/15 to-stone-950";
    case "azure":   return "from-sky-500/30 via-sky-700/15 to-stone-950";
  }
}

function GameCardTile({ g }: { g: GameCard }) {
  return (
    <Link
      to={g.to}
      className={`imperial-card-hover imperial-corner-shine group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 bg-gradient-to-br ${toneClasses(g.tone)} hover:border-[hsl(var(--gold)/0.7)] transition press`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-black/40 pointer-events-none" />
      <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between z-10">
        {g.badge && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_2px_10px_hsl(var(--gold)/0.5)]">
            {g.badge}
          </span>
        )}
        {g.multiplier && (
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-background/70 backdrop-blur text-[hsl(var(--gold))] border border-[hsl(var(--gold)/0.4)] shadow-[0_0_10px_hsl(var(--gold)/0.25)]">
            {g.multiplier}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10">
        <div className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-[hsl(var(--gold))] transition-colors">{g.title}</div>
      </div>
    </Link>
  );
}

function Rail({ title, to, items }: { title: string; to: string; items: GameCard[] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <h2 className="text-base sm:text-lg font-bold tracking-tight">{title}</h2>
        <Link
          to={to}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          모두 보기 <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
        {items.map((g) => <GameCardTile key={g.to} g={g} />)}
      </div>
    </section>
  );
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
          className="pointer-events-none absolute inset-x-0 -top-10 h-[280px] -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, hsl(var(--gold)/0.15), transparent 70%), radial-gradient(40% 80% at 80% 10%, hsl(var(--pink)/0.10), transparent 70%)",
          }}
        />

        {/* Hero */}
        <header className="space-y-3">
          <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] uppercase drop-shadow-[0_0_10px_hsl(var(--gold)/0.55)]">Phonara</div>
          <h1 className="font-imperial text-3xl sm:text-4xl md:text-5xl text-foreground tracking-[0.04em] text-shadow-imperial-xl leading-[1.05]">
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_6px_30px_hsl(var(--gold)/0.6)]">0원</span>
            <span>으로 시작해서 </span>
            <br className="hidden sm:inline" />
            <span>매일 돈을 버는 </span>
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_6px_30px_hsl(var(--pink)/0.55)]">제국</span>
          </h1>
        </header>

        {/* Imperial Live Activity Engine — Hero 직후 full variant */}
        <ImperialLiveActivity variant="full" />

        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[hsl(var(--gold)/0.35)] bg-card/40 hover:border-[hsl(var(--gold)/0.8)] hover:bg-[hsl(var(--gold)/0.08)] hover:shadow-[0_0_18px_hsl(var(--gold)/0.35)] hover:-translate-y-0.5 transition-all duration-200 text-[12px] font-semibold text-foreground/90 press"
              >
                <Icon className="w-3.5 h-3.5 text-[hsl(var(--gold))] group-hover:scale-110 transition-transform" />
                {c.label}
              </Link>
            );
          })}
        </div>

        {/* Imperial Trade Section — 큰 차트 + LONG/SHORT */}
        <ImperialTradeSection />

        {/* Game catalogs */}
        <Rail title="Phonara Originals" to="/casino" items={ORIGINALS} />
        <Rail title="Popular Slots" to="/casino" items={SLOTS} />
      </div>
    </Layout>
  );
}
