import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect as useEffectIdle, useState as useStateIdle } from "react";
import {
  LayoutDashboard,
  Zap,
  Crown,
  Wallet,
  Trophy,
  LogOut,
  ShieldCheck,
  MessageSquare,
  User as UserIcon,
  ChevronRight,
  Network,
  Eye,
  TrendingUp,
} from "lucide-react";
import { useDB } from "@/lib/store";
import React from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import FloatingChat from "./FloatingChat";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useUserNotifications } from "@/hooks/use-user-notifications";
import TopHUD, { TopHUDCompact } from "./TopHUD";
import LanguageSwitcher from "./LanguageSwitcher";
import FreezeBanner from "./FreezeBanner";
import { useAchievementWatcher } from "@/hooks/use-achievement-watcher";
import NeonNotificationFeed from "./NeonNotificationFeed";
import QuickAccessStrip from "./QuickAccessStrip";
import EmpirePopulationPulse from "./EmpirePopulationPulse";
import ImperialHud from "./imperial/ImperialHud";

/**
 * Phonara — Empire 5축 IA
 *
 *  Command  ▶ /command
 *  Earn     ▶ /earn   (mobile: 가운데 골드 FAB)
 *  Empire   ▶ /empire
 *  Treasury ▶ /treasury
 *  Legacy   ▶ /legacy
 */

type NavItem = {
  to: string;
  matches: string[];
  icon: typeof LayoutDashboard;
  labelKey: "command" | "earn" | "empire" | "treasury" | "legacy";
  fab?: boolean;
};

const NAV: NavItem[] = [
  { to: "/command",  matches: ["/command", "/dashboard"],                                                    icon: LayoutDashboard, labelKey: "command" },
  { to: "/empire",   matches: ["/empire", "/packages"],                                                       icon: Crown,           labelKey: "empire" },
  { to: "/earn",     matches: ["/earn", "/missions", "/quests", "/roulette", "/season-pass"],                 icon: Zap,             labelKey: "earn", fab: true },
  { to: "/treasury", matches: ["/treasury", "/wallet", "/secure-wallet"],                                     icon: Wallet,          labelKey: "treasury" },
  { to: "/legacy",   matches: ["/legacy", "/achievements"],                                                   icon: Trophy,          labelKey: "legacy" },
];

const SIDE_EXTRA: Array<{ to: string; icon: typeof MessageSquare; labelKey: any; gold?: boolean }> = [
  { to: "/arena", icon: TrendingUp, labelKey: "tradingArena", gold: true },
  { to: "/support", icon: MessageSquare, labelKey: "support" },
  { to: "/profile", icon: UserIcon, labelKey: "my" },
];

function isActive(item: NavItem, pathname: string) {
  return item.matches.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useDB();
  const nav = useNavigate();
  const loc = useLocation();
  const user = db.user;
  const { t } = useTranslation("nav");
  useAchievementWatcher(loc.pathname);

  useUserNotifications(user?.id);
  useAdminNotifications(!!user?.isAdmin);

  return (
    <div className="min-h-screen md:pl-60 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] md:pb-6">
      <FreezeBanner />
      {/* Desktop sidebar */}
      {user && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-60 flex-col glass-strong border-r border-primary/10">
          <div className="px-5 py-5 border-b border-border/40">
            <Link to="/command" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-imperial glow-imperial flex items-center justify-center font-imperial font-black text-primary-foreground text-base">
                P
              </div>
              <span className="font-imperial text-base text-gradient-imperial tracking-[0.22em]">
                PHONARA
              </span>
            </Link>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item, loc.pathname);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition press ${
                    active
                      ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t(item.labelKey)}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </NavLink>
              );
            })}
            <div className="my-3 border-t border-border/40" />
            {SIDE_EXTRA.map((item) => {
              const active = loc.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    item.gold
                      ? active
                        ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                        : "border border-primary/40 text-primary hover:bg-primary/10"
                      : active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              );
            })}
            {user.isAdmin && (
              <NavLink
                to="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{t("admin")}</span>
              </NavLink>
            )}
          </nav>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              setDb((d) => ({ ...d, user: null }));
              nav("/");
            }}
            className="m-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs glass hover:bg-muted/40 transition"
          >
            <LogOut className="w-3.5 h-3.5" /> {t("logout")}
          </button>
        </aside>
      )}

      {/* Top bar (mobile + desktop HUD) */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container flex items-center justify-between h-14 md:h-16">
          {/* Mobile brand */}
          <Link to={user ? "/command" : "/"} className="md:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-imperial flex items-center justify-center font-imperial font-black text-primary-foreground text-sm">
              P
            </div>
            <span className="font-imperial text-sm text-gradient-imperial tracking-[0.18em]">
              PHONARA
            </span>
          </Link>
          {/* Desktop: page title spacer */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <TopHUD />
            <TopHUDCompact />
            {user && (
              <Link
                to="/profile"
                aria-label={t("my")}
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-full glass border border-border/50 text-foreground hover:border-primary/50 transition press"
              >
                <UserIcon className="w-4 h-4" />
              </Link>
            )}
            {!user && (
              <>
                <LanguageSwitcher />
                <Link
                  to="/secure-auth"
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-imperial text-primary-foreground glow-imperial"
                >
                  {t("enter")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Live population pulse strip — visible to everyone */}
      <EmpirePopulationPulse />

      {/* Imperial Score HUD — 4-Pillar 통합 표시 (로그인 사용자) */}
      {user && <ImperialHud />}

      {/* Phase 2 — 초직관 6대 메뉴 (로그인 사용자 전용, 데스크탑/모바일 공통) */}
      {user && <QuickAccessStrip />}

      {/* Mobile secondary nav — extra destinations not in bottom 5-tab bar */}
      {user && (
        <div className="md:hidden sticky top-14 z-30 glass border-b border-border/40">
          <div className="container py-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
              {SIDE_EXTRA.map((item) => {
                const Icon = item.icon;
                const active = loc.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition press ${
                      item.gold
                        ? active
                          ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                          : "border border-primary/40 text-primary"
                        : active
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "glass text-muted-foreground border border-border/40"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                );
              })}
              {user.isAdmin && (
                <NavLink
                  to="/admin"
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition press ${
                    loc.pathname.startsWith("/admin")
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "glass text-primary border border-primary/40"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t("admin")}</span>
                </NavLink>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="relative">{children}</main>
      <NeonNotificationFeed />

      {/* Mobile bottom nav — 5 tabs with center FAB */}
      {user && (
        <nav
          className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem-env(safe-area-inset-left)-env(safe-area-inset-right))] max-w-md"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="glass-strong rounded-2xl px-2 py-2 flex items-end justify-between shadow-2xl neon-border relative overflow-visible">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item, loc.pathname);

              if (item.fab) {
                return (
                  <NavLink key={item.to} to={item.to} className="relative -mt-7 flex-1 flex justify-center">
                    <div
                      className={`relative w-16 h-16 rounded-full bg-gradient-imperial flex items-center justify-center shadow-2xl press ${
                        active ? "glow-imperial" : ""
                      }`}
                    >
                      <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-ring-pulse -z-10" />
                      <Icon className="w-7 h-7 text-primary-foreground" />
                      <span className="absolute -bottom-5 text-[10px] font-imperial tracking-[0.2em] text-primary">
                        {t(item.labelKey).toUpperCase()}
                      </span>
                    </div>
                  </NavLink>
                );
              }

              return (
                <NavLink key={item.to} to={item.to} className="flex-1 press">
                  <div
                    className={`relative flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-300 ${
                      active ? "bg-primary/10" : ""
                    }`}
                  >
                    {active && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-1 rounded-full bg-gradient-imperial glow-imperial" />
                    )}
                    <Icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                    <span
                      className={`text-[10px] font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {t(item.labelKey)}
                    </span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {user && <FloatingChat />}
    </div>
  );
}
