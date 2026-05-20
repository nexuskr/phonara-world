import { memo, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, Swords, Sparkles, Gamepad2, Dice5, TrendingUp, Radio,
  Castle, Crown, Wallet, ListChecks, User, Shield,
  type LucideIcon,
} from "lucide-react";

/**
 * StakeStyleSidebar — PC 영구 좌측 사이드바 (md+).
 * 모바일에서는 완전히 숨김. 대관전/에이펙스를 1급으로 노출.
 *
 * 마운트 시 <html>에 has-desktop-sidebar 클래스 추가 → index.css 가
 * @media (min-width: 768px) 에서 body padding-left:232px 부여.
 */

const HIDDEN_PREFIX = [
  "/apex", "/auth", "/secure-auth", "/legal", "/admin",
  "/welcome", "/guide", "/landing", "/safe",
  "/forgot-password", "/reset-password", "/auth/callback",
  "/complete-profile", "/live/", "/r/", "/i/", "/c/", "/unsubscribe",
];

type Item = {
  to: string;
  label: string;
  icon: LucideIcon;
  variant?: "gold" | "crimson";
};

type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "메인",
    items: [
      { to: "/",       label: "홈",       icon: Home },
      { to: "/duel",   label: "대관전",   icon: Swords,    variant: "crimson" },
      { to: "/apex",   label: "에이펙스", icon: Sparkles,  variant: "gold" },
      { to: "/casino", label: "카지노",   icon: Dice5 },
      { to: "/games",  label: "슬롯·게임", icon: Gamepad2 },
      { to: "/trade",  label: "거래",     icon: TrendingUp },
      { to: "/live",   label: "라이브",   icon: Radio },
    ],
  },
  {
    title: "황실",
    items: [
      { to: "/empire", label: "황실",   icon: Castle },
      { to: "/phon",   label: "PHON",   icon: Crown,  variant: "gold" },
      { to: "/vip",    label: "VIP Pass", icon: Sparkles },
    ],
  },
  {
    title: "내 자산",
    items: [
      { to: "/wallet",   label: "지갑",   icon: Wallet },
      { to: "/missions", label: "미션",   icon: ListChecks },
      { to: "/profile",  label: "내정보", icon: User },
      { to: "/security", label: "보안",   icon: Shield },
    ],
  },
];

function isActivePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === to || pathname.startsWith(to + "/");
}

function StakeStyleSidebarInner() {
  const loc = useLocation();
  const hidden = HIDDEN_PREFIX.some((p) => loc.pathname.startsWith(p));

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) {
      root.classList.remove("has-desktop-sidebar");
      return;
    }
    root.classList.add("has-desktop-sidebar");
    return () => root.classList.remove("has-desktop-sidebar");
  }, [hidden]);

  if (hidden) return null;

  return (
    <aside
      aria-label="데스크탑 좌측 네비게이션"
      className="
        hidden md:flex fixed inset-y-0 left-0 z-30 w-[232px]
        flex-col bg-background/95 backdrop-blur
        border-r border-border/50
        overflow-y-auto
      "
    >
      <div className="h-14 md:h-16 flex items-center px-5 border-b border-border/40">
        <NavLink to="/" className="font-black tracking-[0.22em] text-[15px] text-foreground">
          PHONARA
        </NavLink>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="px-3 mb-1.5 text-[10.5px] font-black tracking-[0.22em] text-muted-foreground/70 uppercase">
              {sec.title}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map((it) => {
                const active = isActivePath(loc.pathname, it.to);
                const Icon = it.icon;
                const gold = it.variant === "gold";
                const crimson = it.variant === "crimson";
                return (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "group flex items-center gap-3 h-11 px-3 rounded-lg",
                        "text-[14.5px] font-bold tracking-tight",
                        "transition-colors duration-150 motion-reduce:transition-none",
                        active
                          ? "bg-card/70 border-l-2 border-[hsl(var(--gold))] text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/40",
                        gold && !active ? "text-amber-200/90" : "",
                        crimson && !active ? "text-rose-200/90" : "",
                      ].join(" ")}
                    >
                      <Icon
                        aria-hidden
                        className={[
                          "w-[18px] h-[18px] shrink-0",
                          active ? "drop-shadow-[0_0_6px_hsl(var(--gold)/0.55)]" : "",
                          gold ? "text-amber-300" : "",
                          crimson ? "text-rose-300 drop-shadow-[0_0_6px_hsl(350_80%_60%/0.55)]" : "",
                        ].join(" ")}
                        strokeWidth={active ? 2.5 : 2}
                      />
                      <span className="truncate">{it.label}</span>
                      {crimson && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-rose-500/20 text-rose-200 border border-rose-400/40">
                          LIVE
                        </span>
                      )}
                      {gold && it.to === "/apex" && (
                        <span className="ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-amber-400 text-black">
                          ★
                        </span>
                      )}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-5 py-3 border-t border-border/40 text-[10px] tracking-[0.18em] font-black text-muted-foreground/60">
        PHONARA · IMPERIAL
      </div>
    </aside>
  );
}

export const StakeStyleSidebar = memo(StakeStyleSidebarInner);
export default StakeStyleSidebar;
