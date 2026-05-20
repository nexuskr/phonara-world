import { memo, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Gamepad2, Swords, MoreHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import { useAuthReady } from "@/hooks/use-auth-ready";

/**
 * MobileBottomNav — 50~70대 한손(엄지) 조작 최적화 5탭 네비.
 *
 * 한손 강제 스펙:
 *  - 컨테이너 72px + env(safe-area-inset-bottom)
 *  - hit-box ≥ 72×72px
 *  - 아이콘 34px / 라벨 17.5px font-black
 *  - touch-action:manipulation, -webkit-tap-highlight-color:transparent
 *  - Active 140ms / Pressed 100ms transform·opacity only
 *  - prefers-reduced-motion 자동 존중 (transition motion-reduce:transition-none)
 *
 * 에이펙스 탭은 Gold gradient + glow + scale-1.05 로 강한 시선 유도.
 * /apex/*, /auth*, /secure-auth*, /legal*, /admin* 에서는 자동 숨김 (각 화면에 자체 셸 존재).
 */

type TabId = "home" | "apex" | "duel" | "games" | "more";

type Tab = {
  id: TabId;
  to?: string;
  label: string;
  icon: LucideIcon;
  emphasis?: "gold" | "crimson";
};

const TABS: Tab[] = [
  { id: "home",   to: "/",      label: "홈",       icon: Home },
  { id: "apex",   to: "/apex",  label: "에이펙스", icon: Sparkles, emphasis: "gold" },
  { id: "duel",   to: "/duel",  label: "대관전",   icon: Swords,   emphasis: "crimson" },
  { id: "games",  to: "/games", label: "게임",     icon: Gamepad2 },
  { id: "more",                  label: "더보기",   icon: MoreHorizontal },
];

const HIDDEN_PREFIX = ["/apex", "/auth", "/secure-auth", "/legal", "/admin", "/welcome", "/guide", "/landing", "/safe", "/forgot-password", "/reset-password", "/auth/callback", "/complete-profile", "/live/", "/r/", "/i/", "/c/", "/unsubscribe"];

function isActivePath(pathname: string, to?: string) {
  if (!to) return false;
  const base = to.split("?")[0];
  if (base === "/")     return pathname === "/" || pathname === "/dashboard";
  if (base === "/apex") return pathname === "/apex" || pathname.startsWith("/apex/");
  if (base === "/duel") return pathname === "/duel" || pathname.startsWith("/duel/");
  if (base === "/games")return pathname === "/games" || pathname.startsWith("/games/") || pathname.startsWith("/casino");
  return pathname === base;
}

interface Props {
  onMoreOpen: () => void;
}

function MobileBottomNavInner({ onMoreOpen }: Props) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { hasSession } = useAuthReady();

  const handleHome = useCallback(
    (e: React.MouseEvent) => {
      if (hasSession) {
        e.preventDefault();
        navigate("/dashboard");
      }
    },
    [hasSession, navigate],
  );

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
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <ul className="flex items-stretch justify-between gap-3 px-3 h-[72px]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = isActivePath(loc.pathname, t.to);
          const gold = t.emphasis === "gold";

          const inner = (
            <>
              <Icon
                aria-hidden
                className={[
                  "w-[34px] h-[34px] transition-transform duration-150 motion-reduce:transition-none",
                  active ? "scale-110" : "",
                  gold ? "text-amber-300" : active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
                strokeWidth={active ? 2.75 : 2.25}
              />
              <span
                className={[
                  "text-[17.5px] font-black leading-none tracking-tight mt-0.5",
                  gold ? "text-amber-200" : active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {t.label}
              </span>
              {gold && (
                <span className="absolute -top-1 right-1 px-1 py-px rounded-full text-[8.5px] font-black tracking-wider bg-amber-400 text-black shadow-[0_0_8px_hsl(38_92%_60%/0.6)]">
                  LIVE
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
            active && gold ? "scale-[1.05] shadow-[0_0_24px_hsl(38_92%_60%/0.55)]" : "",
            active && !gold ? "bg-card/60" : "",
          ].join(" ");

          const itemStyle: React.CSSProperties = {
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
          };

          return (
            <li key={t.id} className="flex-1 flex items-center justify-center">
              {t.to ? (
                <NavLink
                  to={t.to}
                  onClick={t.id === "home" ? handleHome : undefined}
                  aria-current={active ? "page" : undefined}
                  aria-label={t.label}
                  className={sharedClass}
                  style={itemStyle}
                >
                  {inner}
                </NavLink>
              ) : (
                <button
                  type="button"
                  onClick={onMoreOpen}
                  aria-label="더보기 메뉴 열기"
                  className={sharedClass}
                  style={itemStyle}
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const MobileBottomNav = memo(MobileBottomNavInner);
export default MobileBottomNav;
