import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Gift, Vault, Play, Trophy, TrendingUp, Users, Sparkles, Package } from "lucide-react";
import { ApexBigWinTicker } from "@/packages/apex/components/ApexBigWinTicker";

function nextKstMidnight(): number {
  const now = new Date();
  const kstOffset = 9 * 60;
  const localOffset = -now.getTimezoneOffset();
  const kstNow = new Date(now.getTime() + (kstOffset - localOffset) * 60000);
  const next = new Date(kstNow);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - kstNow.getTime();
}

export default function ApexHome() {
  const [ms, setMs] = useState(nextKstMidnight());
  useEffect(() => {
    const t = setInterval(() => setMs(nextKstMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  return (
    <div className="space-y-6">
      <ApexBigWinTicker className="-mx-4 sm:mx-0 sm:rounded-2xl" />
      {/* Hero */}
      <section className="relative apex-glass rounded-3xl p-8 md:p-12 text-center overflow-hidden apex-glow-neon">
        <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-primary/20 blur-3xl apex-float" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-accent/20 blur-3xl apex-float" />

        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-primary border border-primary/40 rounded-full px-3 py-1">
            <Sparkles className="w-3 h-3" /> World's #1 Crypto Gambling Forge
          </span>
          <h1 className="mt-5 text-5xl md:text-8xl font-black apex-gradient-text leading-[0.95]">
            APEXFORGE
          </h1>
          <p className="mt-4 text-base md:text-lg text-foreground/80 max-w-xl mx-auto">
            Stake · Rollbit · Freecash 를 압살하는 단 하나의 플랫폼.
            매일 무료 PHON · 골드 박스 · TikTok 빅윈 피드 · NFT 루트박스.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              to="/apex/free"
              className="px-7 py-3.5 rounded-xl apex-gradient text-background font-black apex-pulse"
            >
              무료로 시작 →
            </Link>
            <Link
              to="/apex/vault"
              className="px-7 py-3.5 rounded-xl border border-primary/40 text-primary hover:bg-primary/10 transition font-bold"
            >
              오늘의 Vault
            </Link>
          </div>

          {/* Trust strip */}
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-md mx-auto">
            <Trust icon={Users}     label="24h 활성"   value="12,847" />
            <Trust icon={TrendingUp} label="24h 지급"  value="₩2.1억" />
            <Trust icon={Flame}     label="빅윈 24h"  value="318" />
          </div>
        </div>
      </section>

      {/* Daily Vault countdown */}
      <section className="apex-glass-magenta rounded-2xl p-5 flex items-center justify-between apex-glow-magenta">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Daily Vault Reset
          </p>
          <p className="mt-1 text-3xl md:text-4xl font-mono font-black apex-text-magenta">
            {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:
            {String(s).padStart(2, "0")}
          </p>
        </div>
        <Link
          to="/apex/vault"
          className="px-5 py-2.5 rounded-lg apex-gradient text-background font-bold whitespace-nowrap"
        >
          지금 열기
        </Link>
      </section>

      {/* Quick tiles */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: "/apex/free",    icon: Gift,    label: "Free Money",  sub: "7개 일일 미션", glow: "neon"    },
          { to: "/apex/vault",   icon: Vault,   label: "Daily Vault", sub: "골드 박스 1회", glow: "magenta" },
          { to: "/apex/reels",   icon: Play,    label: "Win Reels",   sub: "TikTok 빅윈",  glow: "neon"    },
          { to: "/apex/lootbox", icon: Package, label: "NFT Loot",    sub: "3 티어 박스",  glow: "magenta" },
        ].map(({ to, icon: Icon, label, sub, glow }) => (
          <Link
            key={to}
            to={to}
            className={`apex-glass rounded-2xl p-4 hover:scale-[1.02] hover:apex-glow-${glow} transition group`}
          >
            <Icon className="w-7 h-7 text-primary group-hover:apex-text-neon transition" />
            <p className="mt-3 font-black">{label}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </Link>
        ))}
      </section>

      {/* Big win feed */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-bold mb-3">
          <Flame className="w-5 h-5 text-accent" /> LIVE 빅윈 피드
        </h2>
        <ul className="space-y-2">
          {[
            { user: "이*환",  amount: 1284000,  game: "Olympus 1000",  mult: "x320"   },
            { user: "박*수",  amount: 720000,   game: "Crash Imperial", mult: "x180"  },
            { user: "김*영",  amount: 5128000,  game: "Dragon Empire", mult: "x1,280" },
            { user: "최*민",  amount: 240000,   game: "Cosmic Forge",  mult: "x60"    },
          ].map((row, i) => (
            <li
              key={i}
              className="apex-glass rounded-xl px-4 py-3 flex items-center justify-between hover:apex-glow-neon transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg apex-gradient flex items-center justify-center text-background font-black text-xs shrink-0">
                  {row.user.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    <span className="text-muted-foreground">{row.user}</span> · {row.game}
                  </p>
                  <p className="text-[10px] apex-text-magenta font-bold">{row.mult} WIN</p>
                </div>
              </div>
              <span className="apex-text-neon font-black tabular-nums">
                +{row.amount.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* vs CEX strip */}
      <section className="apex-glass rounded-2xl p-5">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          왜 ApexForge 인가
        </p>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {[
            ["Stake.com",  "❌ 부업 없음"],
            ["Rollbit",    "❌ 무료 박스 없음"],
            ["Freecash",   "❌ 카지노 없음"],
            ["ApexForge",  "✅ 전부 + 한국 출금"],
          ].map(([k, v], i) => (
            <div
              key={i}
              className={`rounded-lg p-3 ${i === 3 ? "apex-gradient text-background font-black" : "bg-muted/30"}`}
            >
              <p className="text-[10px] opacity-70">{k}</p>
              <p className="font-bold mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Trust({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/30 backdrop-blur-sm border border-primary/15 p-2.5">
      <Icon className="w-3.5 h-3.5 text-primary mx-auto" />
      <p className="text-[9px] uppercase text-muted-foreground mt-1">{label}</p>
      <p className="text-xs font-black apex-text-neon tabular-nums">{value}</p>
    </div>
  );
}
