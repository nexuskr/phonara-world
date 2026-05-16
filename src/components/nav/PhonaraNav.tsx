import { NavLink, useLocation } from "react-router-dom";
import { Coins, Gamepad2, TrendingUp, Radio } from "lucide-react";
import { G } from "@/lib/glossary";

/**
 * 4-tab sticky nav — 수익 / 게임 / 투자 / 실시간
 *
 * Single source of truth for the user's primary navigation.
 * Replaces HubTabs/MainSidebar overlap. Always visible just under the header.
 */

const TABS = [
  { to: "/earn", icon: Coins, label: G.tabEarn, tagline: G.tabEarnTagline, emoji: "💰" },
  { to: "/games", icon: Gamepad2, label: G.tabGames, tagline: G.tabGamesTagline, emoji: "🎰" },
  { to: "/trade", icon: TrendingUp, label: G.tabTrade, tagline: G.tabTradeTagline, emoji: "📈" },
  { to: "/live", icon: Radio, label: G.tabLive, tagline: G.tabLiveTagline, emoji: "🔴" },
] as const;

function isActive(pathname: string, to: string) {
  if (to === "/games") return pathname === to || pathname.startsWith("/games/") || pathname.startsWith("/casino");
  if (to === "/trade") return pathname === to || pathname.startsWith("/trade/") || pathname.startsWith("/arena");
  if (to === "/live") return pathname === to || pathname.startsWith("/live/") || pathname.startsWith("/whales") || pathname.startsWith("/lounge");
  if (to === "/earn") return pathname === to || pathname.startsWith("/earn/") || pathname.startsWith("/missions") || pathname.startsWith("/referral");
  return pathname === to;
}

export default function PhonaraNav() {
  const loc = useLocation();
  return (
    <div className="sticky top-14 md:top-16 z-30 bg-background/90 backdrop-blur border-b border-border/40">
      <div className="container py-2">
        <div className="grid grid-cols-4 gap-1.5">
          {TABS.map((t) => {
            const active = isActive(loc.pathname, t.to);
            const Icon = t.icon;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 rounded-xl border transition press ${
                  active
                    ? "bg-gradient-to-br from-primary/20 to-pink-500/10 border-primary/50 text-foreground"
                    : "bg-card/40 border-border/30 text-muted-foreground hover:text-foreground hover:border-border/60"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{t.emoji}</span>
                  <span className={`text-[13px] font-black tracking-wide ${active ? "text-gradient-imperial" : ""}`}>
                    {t.label}
                  </span>
                </div>
                <span className="text-[10px] font-medium opacity-70 truncate max-w-full">
                  {t.tagline}
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
