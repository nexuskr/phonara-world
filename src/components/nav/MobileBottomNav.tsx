import { memo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Gift, Swords, LineChart, Gem, type LucideIcon } from "lucide-react";

/**
 * MobileBottomNav (PR-P1-A) — 5탭 모바일 OS 네이티브 thumb-zone 네비.
 *
 * 5탭: 홈 / 무료돈벌기 / 실시간대결 / 실시간예측 / 내PHON
 *  - 컨테이너 72px + env(safe-area-inset-bottom)
 *  - hit-box ≥ 72×72px, 아이콘 34px, 라벨 17.5px font-black
 *  - touch-action:manipulation, -webkit-tap-highlight-color:transparent
 *  - prefers-reduced-motion 자동 존중
 *
 * 실시간대결 = crimson glow (FOMO 강조)
 * 내PHON = gold glow (브랜드 톤)
 */

type TabId = "home" | "earn" | "duel" | "trade" | "phon";

type Tab = {
  id: TabId;
  to: string;
  label: string;
  icon: LucideIcon;
  emphasis?: "gold" | "crimson";
};

const TABS: Tab[] = [
  { id: "home",  to: "/",      label: "홈",         icon: Home },
  { id: "earn",  to: "/earn",  label: "무료돈벌기", icon: Gift },
  { id: "duel",  to: "/duel",  label: "실시간대결", icon: Swords,    emphasis: "crimson" },
  { id: "trade", to: "/trade", label: "실시간예측", icon: LineChart },
  { id: "phon",  to: "/phon",  label: "내PHON",     icon: Gem,       emphasis: "gold" },
];

const HIDDEN_PREFIX = ["/apex", "/auth", "/secure-auth", "/legal", "/admin", "/welcome", "/guide", "/landing", "/safe", "/forgot-password", "/reset-password", "/auth/callback", "/complete-profile", "/live/", "/r/", "/i/", "/c/", "/unsubscribe"];

function isActivePath(pathname: string, to: string) {
  const base = to.split("?")[0];
  if (base === "/")      return pathname === "/" || pathname === "/dashboard";
  if (base === "/earn")  return pathname === "/earn" || pathname.startsWith("/earn/") || pathname.startsWith("/missions");
  if (base === "/duel")  return pathname === "/duel" || pathname.startsWith("/duel/");
  if (base === "/trade") return pathname === "/trade" || pathname.startsWith("/trade/") || pathname.startsWith("/arena");
  if (base === "/phon")  return pathname === "/phon" || pathname.startsWith("/phon/") || pathname.startsWith("/wallet");
  return pathname === base;
}

interface Props {
  onMoreOpen?: () => void;
}

function MobileBottomNavInner(_props: Props) {
  const loc = useLocation();

  if (HIDDEN_PREFIX.some((p) => loc.pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="모바일 하단 네비게이션"
      className="
        md:hidden fixed inset-x-0 bottom-0 z-40
        bg-background/95 backdrop-blur-xl
        border-t border-border/50
      "
      style={{
        paddingBottom: "max(var(--safe-bottom), var(--kb-inset))",
      }}
    >
      <ul className="flex items-stretch justify-between gap-3 px-3 h-[72px]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActivePath(loc.pathname, t.to);
          const gold = t.emphasis === "gold";
          const crimson = t.emphasis === "crimson";

          const inner = (
            <>
              <Icon
                aria-hidden
                className={[
                  "w-[34px] h-[34px] transition-transform duration-150 motion-reduce:transition-none",
                  active ? "scale-110" : "",
                  gold ? "text-amber-300" : crimson ? "text-rose-300" : active ? "text-foreground" : "text-muted-foreground",
                  crimson ? "drop-shadow-[0_0_8px_hsl(350_85%_60%/0.7)]" : "",
                ].join(" ")}
                strokeWidth={active ? 2.75 : 2.25}
              />
              <span
                className={[
                  "text-[17.5px] font-black leading-none tracking-tight mt-0.5",
                  gold ? "text-amber-200" : crimson ? "text-rose-200" : active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {t.label}
              </span>
              {gold && (
                <span className="absolute -top-1 right-1 px-1 py-px rounded-full text-[8.5px] font-black tracking-wider bg-amber-400 text-black shadow-[0_0_8px_hsl(38_92%_60%/0.6)]">
                  LIVE
                </span>
              )}
              {crimson && (
                <span className="absolute -top-1 right-1 px-1 py-px rounded-full text-[8.5px] font-black tracking-wider bg-rose-500 text-white shadow-[0_0_10px_hsl(350_85%_60%/0.7)]">
                  ⚔
                </span>
              )}
            </>
          );

          const sharedClass = [
            "relative flex flex-col items-center justify-center",
            "min-h-[72px] min-w-[72px] rounded-2xl",
            "transition-[transform,opacity,background-color] duration-[140ms] motion-reduce:transition-none",
            "active:opacity-75 active:scale-[0.96]",
            "select-none",
            gold
              ? "bg-gradient-to-b from-amber-500/20 via-amber-400/10 to-transparent ring-1 ring-amber-300/50 shadow-[0_0_18px_hsl(38_92%_60%/0.35)]"
              : "",
            crimson
              ? "bg-gradient-to-b from-rose-500/20 via-rose-400/10 to-transparent ring-1 ring-rose-300/50 shadow-[0_0_18px_hsl(350_85%_60%/0.4)]"
              : "",
            active && gold ? "scale-[1.05] shadow-[0_0_24px_hsl(38_92%_60%/0.55)]" : "",
            active && crimson ? "scale-[1.05] shadow-[0_0_24px_hsl(350_85%_60%/0.6)]" : "",
            active && !gold && !crimson ? "bg-card/60" : "",
          ].join(" ");

          const itemStyle: React.CSSProperties = {
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          };

          return (
            <li key={t.id} className="flex-1 flex items-center justify-center">
              <NavLink
                to={t.to}
                aria-current={active ? "page" : undefined}
                aria-label={t.label}
                className={sharedClass}
                style={itemStyle}
              >
                {inner}
              </NavLink>
            </li>
          );

        })}
      </ul>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavInner);
export default MobileBottomNav;
