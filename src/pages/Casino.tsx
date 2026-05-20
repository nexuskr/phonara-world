import CasinoLayout from "@/components/casino/CasinoLayout";
import { Link } from "react-router-dom";
import { Gem, Lock, Sparkles } from "lucide-react";
import logoImage from "@/assets/slots/olympus/logo.png";
import bgImage from "@/assets/slots/olympus/bg.jpg";
import bgWizard from "@/assets/slots/wizard/bg.jpg";
import logoWizard from "@/assets/slots/wizard/logo.png";
import bgCosmic from "@/assets/slots/cosmic/bg.jpg";
import logoCosmic from "@/assets/slots/cosmic/logo.png";
import bgNeon from "@/assets/slots/neon/bg.jpg";
import logoNeon from "@/assets/slots/neon/logo.png";
import bgPirate from "@/assets/slots/pirate/bg.jpg";
import logoPirate from "@/assets/slots/pirate/logo.png";
import bgPharaoh from "@/assets/slots/pharaoh/bg.jpg";
import logoPharaoh from "@/assets/slots/pharaoh/logo.png";
import bgViking from "@/assets/slots/viking/bg.jpg";
import logoViking from "@/assets/slots/viking/logo.png";
import bgAztec from "@/assets/slots/aztec/bg.jpg";
import logoAztec from "@/assets/slots/aztec/logo.png";
import bgSakura from "@/assets/slots/sakura/bg.jpg";
import logoSakura from "@/assets/slots/sakura/logo.png";
import bgDragon from "@/assets/slots/dragon/bg.jpg";
import logoDragon from "@/assets/slots/dragon/logo.png";
import bgSugarFever from "@/assets/slots/sugar-fever/bg.jpg";
import logoSugarFever from "@/assets/slots/sugar-fever/logo.png";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { FOMO } from "@/lib/glossary";

type GameCard = {
  to: string;
  code: string;
  title: string;
  subtitle: string;
  rtp: string;
  max: string;
  bg: string;
  logo?: string;
  comingSoon?: boolean;
  fomo?: string;
  jackpot?: boolean;
  prefetch?: () => Promise<unknown>;
};

const GAMES: GameCard[] = [
  { to: "/casino/sugar-fever-3000", code: "sugar_fever_3000", title: "Sugar Fever 3000",
    subtitle: "고변동 · Cluster Tumble · Multiplier Bomb", rtp: "RTP 96.0%", max: "MAX 3000×", bg: bgSugarFever, logo: logoSugarFever,
    fomo: FOMO.jackpotWaiting, jackpot: true,
    prefetch: () => import("@/pages/casino/SugarFever3000") },
  { to: "/casino/olympus-legacy-5000", code: "olympus_legacy_5000", title: "Olympus Legacy 5000",
    subtitle: "고변동 · Cluster Tumble · Zeus Ladder", rtp: "RTP 96.0%", max: "MAX 5000×", bg: bgImage, logo: logoImage,
    fomo: FOMO.legendaryCrownCard, jackpot: true,
    prefetch: () => import("@/pages/casino/OlympusLegacy5000") },
  { to: "/casino/cosmic-forge-5000", code: "cosmic_forge_5000", title: "Cosmic Forge 5000",
    subtitle: "고변동 · Sticky Multiplier", rtp: "RTP 96.0%", max: "MAX 5000×", bg: bgCosmic, logo: logoCosmic,
    fomo: FOMO.rarePartsCard, jackpot: true,
    prefetch: () => import("@/pages/casino/CosmicForge5000") },
  { to: "/casino/neon-tokyo-88", code: "neon_tokyo_88", title: "Neon Tokyo 88",
    subtitle: "초고변동 · Hold & Spin", rtp: "RTP 96.0%", max: "MAX 8888×", bg: bgNeon, logo: logoNeon,
    fomo: FOMO.jackpotWaiting, jackpot: true,
    prefetch: () => import("@/pages/casino/NeonTokyo88") },
  { to: "/casino/viking-thunder-4000", code: "viking_thunder_4000", title: "Viking Thunder 4000",
    subtitle: "고변동 · 3-Path Spins", rtp: "RTP 96.0%", max: "MAX 4000×", bg: bgViking, logo: logoViking,
    fomo: FOMO.rarePartsCard, jackpot: true,
    prefetch: () => import("@/pages/casino/VikingThunder4000") },
  { to: "/casino/pharaohs-vault-2500", code: "pharaohs_vault_2500", title: "Pharaoh's Vault 2500",
    subtitle: "중변동 · Pick & Reveal", rtp: "RTP 96.0%", max: "MAX 2500×", bg: bgPharaoh, logo: logoPharaoh,
    fomo: FOMO.jackpotWaiting,
    prefetch: () => import("@/pages/casino/PharaohsVault2500") },
  { to: "/casino/wizard-2000", code: "wizard_2000", title: "Wizard 2000",
    subtitle: "고변동 · 보너스 폭발형", rtp: "RTP 95.3%", max: "MAX 2000×", bg: bgWizard, logo: logoWizard,
    fomo: FOMO.rarePartsCard,
    prefetch: () => import("@/pages/casino/Wizard2000") },
  { to: "/casino/pirates-curse-1500", code: "pirates_curse_1500", title: "Pirate's Curse 1500",
    subtitle: "중변동 · Crash Cannon", rtp: "RTP 96.0%", max: "MAX 1500×", bg: bgPirate, logo: logoPirate,
    fomo: FOMO.jackpotWaiting,
    prefetch: () => import("@/pages/casino/PiratesCurse1500") },
  { to: "/casino/aztec-sun-1200", code: "aztec_sun_1200", title: "Aztec Sun 1200",
    subtitle: "중변동 · Cluster Tumble", rtp: "RTP 96.0%", max: "MAX 1200×", bg: bgAztec, logo: logoAztec,
    fomo: FOMO.legendaryCrownCard,
    prefetch: () => import("@/pages/casino/AztecSun1200") },
  { to: "/casino/olympus-1000", code: "olympus_1000", title: "Olympus 1000",
    subtitle: "중변동 · 클래식", rtp: "RTP 96.0%", max: "MAX 1000×", bg: bgImage, logo: logoImage,
    fomo: FOMO.jackpotWaiting,
    prefetch: () => import("@/pages/casino/Olympus1000") },
  { to: "/casino/cherry-sakura-500", code: "cherry_sakura_500", title: "Cherry Sakura 500",
    subtitle: "저변동 · Mission Trail", rtp: "RTP 96.0%", max: "MAX 500×", bg: bgSakura, logo: logoSakura,
    fomo: FOMO.rarePartsCard,
    prefetch: () => import("@/pages/casino/CherrySakura500") },
  { to: "/casino/dragon-empire", code: "dragon_500", title: "Dragon Empire",
    subtitle: "저변동 · 연속 당첨형", rtp: "RTP 95.6%", max: "MAX 500×", bg: bgDragon, logo: logoDragon,
    fomo: FOMO.legendaryCrownCard,
    prefetch: () => import("@/pages/casino/DragonEmpire") },
];

const prefetched = new WeakSet<GameCard>();
const warm = (g: GameCard) => () => {
  if (prefetched.has(g) || !g.prefetch) return;
  prefetched.add(g);
  g.prefetch().catch(() => prefetched.delete(g));
};

export default function CasinoLobby() {
  const user = useRequireAuth();
  if (!user) return null;
  return (
    <CasinoLayout>
      <div className="container py-6 space-y-6">
        <div className="space-y-2">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="font-imperial text-2xl md:text-3xl text-gradient-imperial tracking-[0.18em]">
              슬롯 카지노
            </h1>
            <span className="text-[11px] text-muted-foreground tracking-wide">
              Phonara 자체 슬롯 엔진 · Provably Fair
            </span>
          </div>
          {/* P1-C Slice 3 — Stake.com급 상단 정보 칩 (RTP·최대배율·최소베팅) */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 font-bold">RTP 96.0~96.8%</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-400/40 bg-amber-500/10 text-amber-200 font-bold">최대 5000×</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-pink-400/40 bg-pink-500/10 text-pink-200 font-bold">최소 베팅 100 PHON</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-card/40 text-muted-foreground">NFT 보유 시 RTP +0.5%</span>
          </div>
        </div>

        <div className="imperial-card p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Practice / Real 모드</strong> — DEMO는 무료 칩으로 즉시 체험,
            REAL은 PHON 토큰으로 진짜 베팅. 각 게임 진입 시 배당표·규칙·보너스를 한눈에 확인할 수 있습니다.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => {
            const inner = (
              <div
                className={`imperial-card imperial-card-hover imperial-corner-shine relative aspect-[4/5] group ${
                  g.comingSoon ? "opacity-60" : ""
                }`}
                style={{
                  backgroundImage: `linear-gradient(180deg, transparent 30%, hsl(var(--background) / 0.95)), url(${g.bg})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {g.logo && (
                  <img
                    src={g.logo}
                    alt={g.title}
                    loading="lazy"
                    decoding="async"
                    className="absolute top-4 left-1/2 -translate-x-1/2 h-16 drop-shadow-[0_0_20px_hsl(38_92%_55%/0.6)] z-10"
                  />
                )}
                {!g.comingSoon && g.jackpot && (
                  <div
                    className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/70 border border-amber-400/40 backdrop-blur-sm"
                    aria-label="잭팟 대기 중"
                  >
                    <span className="imperial-pulse-dot" />
                    <span className="text-[10px] font-bold tracking-wider text-amber-200">JACKPOT</span>
                  </div>
                )}
                {g.comingSoon && (
                  <div className="absolute top-3 right-3 z-20 px-2 py-1 rounded-full bg-background/80 border border-border/40 text-[10px] font-bold inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> SOON
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                  <div className="font-imperial text-xl text-gradient-imperial tracking-[0.18em]">
                    {g.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground tracking-wider mt-1 flex items-center gap-2">
                    <Gem className="w-3 h-3 text-primary" /> {g.subtitle}
                  </div>
                  {g.fomo && (
                    <div className="text-[10px] text-amber-200/80 mt-1.5 leading-snug">
                      {g.fomo}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full glass border border-border/40">{g.rtp}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full glass border border-border/40">{g.max}</span>
                  </div>
                </div>
              </div>
            );
            return g.comingSoon ? (
              <div key={g.code}>{inner}</div>
            ) : (
              <Link
                key={g.code}
                to={g.to}
                onMouseEnter={warm(g)}
                onFocus={warm(g)}
                onTouchStart={warm(g)}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>
    </CasinoLayout>
  );
}
