import CasinoLayout from "@/components/casino/CasinoLayout";
import { Link } from "react-router-dom";
import { Crown, Lock, Sparkles } from "lucide-react";
import logoImage from "@/assets/slots/olympus/logo.png";
import bgImage from "@/assets/slots/olympus/bg.jpg";
import { useRequireAuth } from "@/hooks/use-require-auth";

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
};

const GAMES: GameCard[] = [
  {
    to: "/casino/olympus-1000",
    code: "olympus_1000",
    title: "Olympus 1000",
    subtitle: "by Phonara",
    rtp: "RTP 96.0%",
    max: "MAX 1000×",
    bg: bgImage,
    logo: logoImage,
  },
  {
    to: "#",
    code: "wizard_2000",
    title: "Wizard 2000",
    subtitle: "곧 출시",
    rtp: "RTP 96.5%",
    max: "MAX 2000×",
    bg: bgImage,
    comingSoon: true,
  },
  {
    to: "#",
    code: "dragon_500",
    title: "Dragon Empire",
    subtitle: "곧 출시",
    rtp: "RTP 95.5%",
    max: "MAX 500×",
    bg: bgImage,
    comingSoon: true,
  },
];

export default function CasinoLobby() {
  const user = useRequireAuth();
  if (!user) return null;
  return (
    <CasinoLayout>
      <div className="container py-6 space-y-6">
        <div className="flex items-baseline gap-3">
          <h1 className="font-imperial text-2xl md:text-3xl text-gradient-imperial tracking-[0.18em]">
            슬롯 카지노
          </h1>
          <span className="text-[11px] text-muted-foreground tracking-wide hidden sm:inline">
            Phonara 자체 슬롯 엔진 · Provably Fair
          </span>
        </div>

        <div className="glass rounded-2xl p-4 border border-primary/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Practice / Real 모드</strong> — DEMO는 무료 칩으로 즉시 체험,
            REAL은 PHON 토큰으로 진짜 베팅. Cosmic Emperor NFT 보유 시 RTP +0.5% 자동 적용.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => {
            const inner = (
              <div
                className={`relative aspect-[4/5] rounded-2xl overflow-hidden border-2 ${
                  g.comingSoon ? "border-border/30 opacity-60" : "border-primary/40 hover:border-primary glow-imperial"
                } transition group`}
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
                    className="absolute top-4 left-1/2 -translate-x-1/2 h-16 drop-shadow-[0_0_20px_rgba(255,200,80,0.6)]"
                  />
                )}
                {g.comingSoon && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-background/80 border border-border/40 text-[10px] font-bold inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> SOON
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="font-imperial text-xl text-gradient-imperial tracking-[0.18em]">
                    {g.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground tracking-wider mt-1 flex items-center gap-2">
                    <Crown className="w-3 h-3 text-primary" /> {g.subtitle}
                  </div>
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
              <Link key={g.code} to={g.to}>{inner}</Link>
            );
          })}
        </div>
      </div>
    </CasinoLayout>
  );
}
