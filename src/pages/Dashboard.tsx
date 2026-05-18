import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Crown, Sparkles, Zap, TrendingUp, ChevronRight } from "lucide-react";
import ImperialLiveActivity from "@/components/live/ImperialLiveActivity";
import ImperialPresenceBar from "@/components/live/ImperialPresenceBar";
import ImperialTradeSection from "@/components/dashboard/ImperialTradeSection";
import InviteRailMini from "@/components/onboarding/InviteRailMini";

/**
 * Dashboard — v19 Round 3 Imperial Empire World #1.
 * Hero → Presence → Live Activity → Trade → Game catalogs.
 */
type Motif = "diamond" | "lightning" | "waves" | "scroll" | "crown" | "rune";
type GameCard = {
  to: string;
  title: string;
  badge?: string;
  multiplier?: string;
  tone: "gold" | "violet" | "rose" | "emerald" | "azure";
  motif: Motif;
};

const ORIGINALS: GameCard[] = [
  { to: "/casino/olympus-1000",          title: "Olympus 1000",    multiplier: "1000×", tone: "gold",    motif: "crown" },
  { to: "/casino/wizard-2000",           title: "Wizard 2000",     multiplier: "2000×", tone: "violet",  motif: "rune" },
  { to: "/casino/cosmic-forge-5000",     title: "Cosmic Forge",    multiplier: "5000×", tone: "azure",   motif: "lightning" },
  { to: "/casino/sugar-fever-3000",      title: "Sugar Fever",     multiplier: "3000×", tone: "rose",    motif: "diamond" },
  { to: "/casino/viking-thunder-4000",   title: "Viking Thunder",  multiplier: "4000×", tone: "azure",   motif: "lightning" },
  { to: "/casino/olympus-legacy-5000",   title: "Olympus Legacy",  multiplier: "5000×", tone: "gold",    motif: "scroll" },
];

const SLOTS: GameCard[] = [
  { to: "/casino/dragon-empire",        title: "Dragon Empire",    badge: "HOT",        tone: "rose",    motif: "rune" },
  { to: "/casino/pharaohs-vault-2500",  title: "Pharaoh's Vault",  multiplier: "2500×", tone: "gold",    motif: "scroll" },
  { to: "/casino/pirates-curse-1500",   title: "Pirate's Curse",   multiplier: "1500×", tone: "emerald", motif: "waves" },
  { to: "/casino/aztec-sun-1200",       title: "Aztec Sun",        multiplier: "1200×", tone: "gold",    motif: "crown" },
  { to: "/casino/neon-tokyo-88",        title: "Neon Tokyo 88",    badge: "NEW",        tone: "violet",  motif: "lightning" },
  { to: "/casino/cherry-sakura-500",    title: "Cherry Sakura",    multiplier: "500×",  tone: "rose",    motif: "diamond" },
];

const CATEGORIES = [
  { to: "/casino", icon: Sparkles, label: "슬롯" },
  { to: "/crash", icon: Zap, label: "Crash" },
  { to: "/trade", icon: TrendingUp, label: "트레이딩" },
  { to: "/empire", icon: Crown, label: "제국" },
];

function toneClasses(tone: GameCard["tone"]) {
  switch (tone) {
    case "gold":    return "from-amber-500/35 via-amber-700/15 to-stone-950";
    case "violet":  return "from-violet-500/35 via-violet-700/15 to-stone-950";
    case "rose":    return "from-rose-500/35 via-rose-700/15 to-stone-950";
    case "emerald": return "from-emerald-500/35 via-emerald-700/15 to-stone-950";
    case "azure":   return "from-sky-500/35 via-sky-700/15 to-stone-950";
  }
}
function toneStops(tone: GameCard["tone"]) {
  switch (tone) {
    case "gold":    return { a: "hsl(45 95% 55%)",  b: "hsl(28 85% 50%)" };
    case "violet":  return { a: "hsl(275 85% 65%)", b: "hsl(255 70% 45%)" };
    case "rose":    return { a: "hsl(345 85% 60%)", b: "hsl(320 75% 50%)" };
    case "emerald": return { a: "hsl(150 75% 55%)", b: "hsl(170 70% 40%)" };
    case "azure":   return { a: "hsl(205 85% 60%)", b: "hsl(225 75% 45%)" };
  }
}

/** Cinematic inline SVG art — motif-driven. JS 0, image 0. */
function GameArt({ tone, motif, id }: { tone: GameCard["tone"]; motif: Motif; id: string }) {
  const { a, b } = toneStops(tone);
  return (
    <svg
      viewBox="0 0 120 160"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    >
      <defs>
        <radialGradient id={`g-${id}`} cx="50%" cy="40%" r="80%">
          <stop offset="0%" stopColor={a} stopOpacity="0.55" />
          <stop offset="55%" stopColor={b} stopOpacity="0.18" />
          <stop offset="100%" stopColor="hsl(0 0% 0%)" stopOpacity="0.85" />
        </radialGradient>
        <linearGradient id={`s-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={a} stopOpacity="0.9" />
          <stop offset="100%" stopColor={b} stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="120" height="160" fill={`url(#g-${id})`} />

      {/* multi-layer glow */}
      <circle cx="60" cy="55" r="50" fill={`url(#g-${id})`} opacity="0.6" />
      <circle cx="60" cy="55" r="22" fill={a} opacity="0.18" />

      {/* motif */}
      {motif === "diamond" && (
        <g opacity="0.85">
          <polygon points="60,30 78,55 60,90 42,55" fill={`url(#s-${id})`} stroke={a} strokeWidth="0.8" />
          <polygon points="60,30 78,55 60,55 42,55" fill="#fff" opacity="0.18" />
        </g>
      )}
      {motif === "lightning" && (
        <g opacity="0.88">
          <polygon points="66,22 44,72 60,72 52,108 86,52 68,52 80,22" fill={`url(#s-${id})`} stroke={a} strokeWidth="0.8" />
        </g>
      )}
      {motif === "waves" && (
        <g opacity="0.75" fill="none" stroke={a} strokeWidth="1.4">
          <path d="M0 70 Q 30 56 60 70 T 120 70" />
          <path d="M0 85 Q 30 71 60 85 T 120 85" opacity="0.7" />
          <path d="M0 100 Q 30 86 60 100 T 120 100" opacity="0.5" />
        </g>
      )}
      {motif === "scroll" && (
        <g opacity="0.85">
          <rect x="30" y="48" width="60" height="46" rx="4" fill={`url(#s-${id})`} opacity="0.85" />
          <line x1="30" y1="60" x2="90" y2="60" stroke="#000" strokeOpacity="0.35" />
          <line x1="30" y1="74" x2="90" y2="74" stroke="#000" strokeOpacity="0.35" />
        </g>
      )}
      {motif === "crown" && (
        <g opacity="0.9">
          <polygon points="34,80 46,46 60,68 74,46 86,80" fill={`url(#s-${id})`} stroke={a} strokeWidth="0.8" />
          <rect x="34" y="80" width="52" height="8" fill={a} opacity="0.8" />
          <circle cx="46" cy="46" r="3" fill="#fff" opacity="0.9" />
          <circle cx="60" cy="40" r="3.5" fill="#fff" opacity="0.95" />
          <circle cx="74" cy="46" r="3" fill="#fff" opacity="0.9" />
        </g>
      )}
      {motif === "rune" && (
        <g opacity="0.85">
          <circle cx="60" cy="60" r="22" fill="none" stroke={a} strokeWidth="1.2" />
          <polygon points="60,40 76,60 60,80 44,60" fill="none" stroke={a} strokeWidth="1.2" />
          <line x1="60" y1="40" x2="60" y2="80" stroke={a} strokeWidth="1" opacity="0.6" />
          <line x1="44" y1="60" x2="76" y2="60" stroke={a} strokeWidth="1" opacity="0.6" />
        </g>
      )}

      {/* sparkle particles */}
      <g fill="#fff" opacity="0.85">
        <circle cx="22" cy="28" r="0.9" />
        <circle cx="98" cy="36" r="1.1" />
        <circle cx="18" cy="120" r="1" />
        <circle cx="102" cy="118" r="0.8" />
        <circle cx="60" cy="130" r="1.2" opacity="0.5" />
      </g>

      {/* bottom shadow for text legibility */}
      <rect x="0" y="110" width="120" height="50" fill="url(#g-${id})" opacity="0.6" />
      <rect x="0" y="124" width="120" height="36" fill="hsl(0 0% 0%)" opacity="0.55" />
    </svg>
  );
}

function GameCardTile({ g }: { g: GameCard }) {
  const id = g.to.replace(/[^a-z0-9]/gi, "");
  return (
    <Link
      to={g.to}
      className={`imperial-card-hover imperial-corner-shine group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 bg-gradient-to-br ${toneClasses(g.tone)} hover:border-[hsl(var(--gold)/0.9)] hover:-translate-y-1 hover:shadow-[0_22px_60px_-18px_hsl(var(--pink)/0.55),0_0_0_1px_hsl(var(--gold)/0.5)_inset] transition-all duration-300 press will-change-transform`}
      style={{ touchAction: "manipulation" }}
    >
      <GameArt tone={g.tone} motif={g.motif} id={id} />

      <div className="absolute inset-x-0 top-0 p-2 flex items-start justify-between z-10">
        {g.badge && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--pink))] text-background shadow-[0_2px_12px_hsl(var(--pink)/0.55)]">
            {g.badge}
          </span>
        )}
        {g.multiplier && (
          <span
            className="ml-auto inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-black text-background border border-[hsl(var(--gold))] shadow-[0_4px_14px_hsl(var(--gold)/0.45),inset_0_1px_0_hsl(0_0%_100%/0.5)] rotate-[-2deg] group-hover:rotate-0 transition-transform"
            style={{
              background:
                "linear-gradient(180deg, hsl(48 100% 72%) 0%, hsl(45 95% 55%) 50%, hsl(28 85% 45%) 100%)",
              textShadow: "0 1px 0 hsl(45 60% 30% / 0.55)",
            }}
          >
            {g.multiplier}
          </span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-2.5 z-10">
        <div className="text-xs sm:text-sm font-bold text-foreground truncate group-hover:text-[hsl(var(--gold))] transition-colors drop-shadow-[0_2px_8px_hsl(0_0%_0%/0.8)]">
          {g.title}
        </div>
      </div>

      {/* hover sweep */}
      <span
        aria-hidden
        className="absolute inset-y-0 -left-1/3 w-1/3 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(0 0% 100% / 0.22) 50%, transparent 100%)",
          animation: "card-sweep 1.2s ease-out",
        }}
      />
      <style>{`
        @keyframes card-sweep {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
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
      <div className="container pt-6 pb-12 space-y-7 relative">
        {/* Hero ambient glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-10 h-[320px] -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(60% 100% at 50% 0%, hsl(var(--gold)/0.18), transparent 70%), radial-gradient(40% 80% at 80% 10%, hsl(var(--pink)/0.13), transparent 70%)",
          }}
        />

        {/* Hero */}
        <header className="space-y-3">
          <div className="text-[10px] tracking-[0.3em] font-black text-[hsl(var(--gold))] uppercase drop-shadow-[0_0_10px_hsl(var(--gold)/0.6)]">
            Phonara · The Imperial World
          </div>
          <h1
            className="font-imperial text-foreground tracking-[0.04em] text-shadow-imperial-xl leading-[1.06]"
            style={{ fontSize: "clamp(2.25rem, 7vw, 4.5rem)" }}
          >
            <span className="bg-gradient-to-r from-[hsl(45_100%_72%)] via-[hsl(var(--gold))] to-[hsl(var(--pink))] bg-clip-text text-transparent drop-shadow-[0_8px_36px_hsl(var(--gold)/0.7)]">
              0원
            </span>
            <span>으로 시작해서 </span>
            <br className="hidden sm:inline" />
            <span>매일 돈을 버는 </span>
            <span className="bg-gradient-to-r from-[hsl(var(--gold))] via-[hsl(var(--pink))] to-[hsl(28_90%_55%)] bg-clip-text text-transparent drop-shadow-[0_8px_36px_hsl(var(--pink)/0.6)]">
              제국
            </span>
          </h1>
        </header>

        {/* Imperial Presence Bar — Hero 직하단 */}
        <ImperialPresenceBar />

        {/* Imperial Live Activity Engine — fixed slot-machine */}
        <ImperialLiveActivity variant="full" />

        {/* Quick Action Chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.to}
                to={c.to}
                className="group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[hsl(var(--gold)/0.35)] bg-card/40 hover:border-[hsl(var(--gold)/0.85)] hover:bg-[hsl(var(--gold)/0.08)] hover:shadow-[0_0_22px_hsl(var(--gold)/0.4)] hover:-translate-y-0.5 transition-all duration-200 text-[12px] font-semibold text-foreground/90 press"
                style={{ touchAction: "manipulation" }}
              >
                <Icon className="w-3.5 h-3.5 text-[hsl(var(--gold))] group-hover:scale-110 transition-transform" />
                {c.label}
              </Link>
            );
          })}
        </div>

        {/* Imperial Trade Section */}
        <ImperialTradeSection />

        {/* Game catalogs */}
        <Rail title="Phonara Originals" to="/casino" items={ORIGINALS} />
        <Rail title="Popular Slots" to="/casino" items={SLOTS} />
      </div>
    </Layout>
  );
}
