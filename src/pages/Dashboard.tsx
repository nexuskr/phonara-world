import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Crown, Sparkles, Zap, TrendingUp, ChevronRight } from "lucide-react";

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
      className={`group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 bg-gradient-to-br ${toneClasses(g.tone)} hover:border-primary/50 transition press`}
    >
      <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between">
        {g.badge && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-primary text-primary-foreground">
            {g.badge}
          </span>
        )}
        {g.multiplier && (
          <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-background/60 text-foreground border border-border/40">
            {g.multiplier}
          </span>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <div className="text-xs sm:text-sm font-bold text-foreground truncate">{g.title}</div>
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
      <div className="container pt-6 pb-12 space-y-8">
        {/* Hero */}
        <header className="space-y-4">
          <div>
            <div className="text-[10px] tracking-[0.3em] font-bold text-primary/80 uppercase">Phonara</div>
            <h1 className="mt-1 font-imperial text-2xl sm:text-3xl text-foreground tracking-[0.04em]">
              지금, 폐하의 무대
            </h1>
          </div>
          {/* Category chips */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.to}
                  to={c.to}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/50 bg-card/40 hover:border-primary/60 hover:bg-primary/10 transition text-[12px] font-semibold text-foreground/90 press"
                >
                  <Icon className="w-3.5 h-3.5 text-primary" />
                  {c.label}
                </Link>
              );
            })}
          </div>
        </header>

        {/* Game catalogs */}
        <Rail title="Phonara Originals" to="/casino" items={ORIGINALS} />
        <Rail title="Slots" to="/casino" items={SLOTS} />

        {/* Trading 진입 */}
        <section className="space-y-3">
          <div className="flex items-end justify-between">
            <h2 className="text-base sm:text-lg font-bold tracking-tight">트레이딩</h2>
          </div>
          <Link
            to="/trade"
            className="block rounded-2xl border border-border/50 bg-gradient-to-r from-emerald-900/20 via-background to-rose-900/20 hover:border-primary/60 transition press p-5"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[10px] tracking-[0.3em] text-primary/80 font-bold">BTC · ETH · SOL</div>
                <div className="font-imperial text-lg mt-1 text-foreground">Imperial Trade</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  실시간 가격 · LONG / SHORT · PHON 잔액으로 즉시 진입
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-primary shrink-0" />
            </div>
          </Link>
        </section>
      </div>
    </Layout>
  );
}
