import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Gem, Zap,
  Wallet,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  TrendingUp,
  Menu,
  Coins,
  Home as HomeIcon,
  Gamepad2,
  Radio} from "lucide-react";
import { useDB } from "@/lib/store";
import React from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAdminNotifications } from "@/hooks/use-admin-notifications";
import { useUserNotifications } from "@/hooks/use-user-notifications";
import TopHUD, { TopHUDCompact } from "./TopHUD";
import LanguageSwitcher from "./LanguageSwitcher";
import FreezeBanner from "./FreezeBanner";
import { useAchievementWatcher } from "@/hooks/use-achievement-watcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ImperialLogo from "@/components/brand/ImperialLogo";

// v19 Phase 0-R: 글로벌 idle 오버레이 13종 전면 마운트 해제.
// (FloatingChat, NeonNotificationFeed, BaronPromotionDialog, EmpireBoosterTimer,
//  EmpireConcierge, ReplayShareGlobal, CrownWarFinaleModal, PowerHeader,
//  FirstEmperorBurst, CrownThroneOverlay, ImperialInbox, QuickAccessStrip,
//  EmpirePopulationPulse, ImperialHud)
// 파일은 보존하여 다른 페이지에서 직접 import 가능.

/**
 * Phonara — Cosmic Emperor V3 Grouped Navigation
 * Single source of truth for desktop sidebar, mobile sheet, and bottom-nav routing.
 */

type IconType = typeof HomeIcon;
type NavLeaf = { to: string; label: string; icon: IconType; matches?: string[] };

// v19 Slice 7.5: 좌측 사이드바 슬림화 — 6개 평탄 리스트 + Admin 최하단
const SIDEBAR_NAV: NavLeaf[] = [
  { to: "/command", label: "홈",       icon: HomeIcon,    matches: ["/command", "/home", "/dashboard"] },
  { to: "/trade",   label: "트레이딩",  icon: TrendingUp,  matches: ["/trade", "/arena"] },
  { to: "/casino",  label: "수익게임",  icon: Zap,         matches: ["/casino", "/crash", "/jackpot", "/games"] },
  { to: "/live",    label: "라이브",    icon: Radio,       matches: ["/live"] },
  { to: "/wallet",  label: "지갑",      icon: Wallet,      matches: ["/wallet", "/secure-wallet", "/phon"] },
  { to: "/empire",  label: "황실",      icon: Gem,       matches: ["/empire", "/packages", "/profile"] },
];

// Mobile bottom nav — 5 tabs, center FAB = PHON 허브
type BottomItem = { to: string; matches: string[]; icon: IconType; label: string; fab?: boolean };
const BOTTOM_NAV: BottomItem[] = [
  { to: "/command", matches: ["/home", "/", "/command", "/dashboard"], icon: HomeIcon,   label: "홈" },
  { to: "/trade",   matches: ["/trade", "/arena"],                     icon: TrendingUp, label: "트레이딩" },
  { to: "/phon",    matches: ["/phon"],                                icon: Coins,      label: "PHON", fab: true },
  { to: "/casino",  matches: ["/games", "/casino", "/crash", "/jackpot"], icon: Gamepad2, label: "게임" },
  { to: "/empire",  matches: ["/profile", "/wallet", "/empire"],       icon: Gem,      label: "내 제국" },
];

function matchActive(matches: string[] | undefined, fallbackTo: string, pathname: string) {
  const list = matches ?? [fallbackTo];
  return list.some((m) => pathname === m || pathname.startsWith(m + "/"));
}
function isBottomActive(b: BottomItem, pathname: string) {
  return matchActive(b.matches, b.to, pathname);
}

function SlimMenu({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {SIDEBAR_NAV.map((item) => {
        const Icon = item.icon;
        const active = matchActive(item.matches, item.to, pathname);
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 press ${
              active
                ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r bg-[hsl(var(--gold))] shadow-[0_0_12px_hsl(var(--gold)/0.8)]" />
            )}
            <Icon className={`w-4 h-4 ${active ? "" : "group-hover:text-primary transition-colors"}`} />
            <span className="tracking-wide">{item.label}</span>
          </NavLink>
        );
      })}

      {isAdmin && (
        <>
          <div className="my-3 border-t border-border/40" />
          <NavLink
            to="/admin"
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition ${
                isActive
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "text-primary/80 hover:bg-primary/10 hover:text-primary"
              }`
            }
          >
            <ShieldCheck className="w-4 h-4" />
            <span>관리자</span>
          </NavLink>
        </>
      )}
    </div>
  );
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
  // v19 Phase 0-R: idle 오버레이 모두 제거
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen md:pl-60 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] md:pb-6">
      <FreezeBanner />

      {/* Desktop sidebar — grouped accordion */}
      {user && (
        <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-60 flex-col glass-strong border-r border-primary/10">
          <div className="px-5 py-5 border-b border-border/40">
            <ImperialLogo to="/command" size="md" withWordmark withWorld={false} ariaLabel="PHONARA 홈" />

          </div>
          <nav className="flex-1 p-3 overflow-y-auto">
            <SlimMenu pathname={loc.pathname} isAdmin={!!user.isAdmin} />
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

      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/40">
        <div className="container flex items-center justify-between h-14 md:h-16">
          {/* Mobile hamburger + brand */}
          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="메뉴 열기"
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full glass border border-border/50 text-foreground hover:border-primary/50 transition press"
                  >
                    <Menu className="w-4 h-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-background/95 backdrop-blur-xl">
                  <div className="px-5 py-5 border-b border-border/40">
                    <div onClick={() => setSheetOpen(false)} className="inline-block">
                      <ImperialLogo to="/command" size="md" withWordmark withWorld={false} />
                    </div>
                  </div>
                  <div className="p-3 overflow-y-auto h-[calc(100%-180px)]">
                    <SlimMenu pathname={loc.pathname} isAdmin={!!user.isAdmin} onNavigate={() => setSheetOpen(false)} />
                  </div>
                  <button
                    onClick={async () => {
                      setSheetOpen(false);
                      await supabase.auth.signOut();
                      setDb((d) => ({ ...d, user: null }));
                      nav("/");
                    }}
                    className="m-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs glass hover:bg-muted/40 transition w-[calc(100%-1.5rem)]"
                  >
                    <LogOut className="w-3.5 h-3.5" /> {t("logout")}
                  </button>
                </SheetContent>
              </Sheet>
            )}
            <ImperialLogo to={user ? "/command" : "/"} size="sm" withWordmark withWorld={false} />

          </div>
          {/* Desktop spacer */}
          <div className="hidden md:block" />

          <div className="flex items-center gap-2">
            <TopHUD />
            <TopHUDCompact />
            {/* v19 Phase 0-R: ImperialInbox 마운트 해제 */}
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

      {/* v19 Phase 0-R: EmpirePopulationPulse / ImperialHud / QuickAccessStrip / NeonNotificationFeed
          / BaronPromotionDialog / EmpireBoosterTimer / EmpireConcierge / ReplayShareGlobal
          / CrownWarFinaleModal / CrownThroneOverlay / PowerHeader / FirstEmperorBurst 모두 마운트 해제 */}

      <main className="relative">{children}</main>

      {/* P1-C v8: 모바일 하단탭 단일화 - MobileShell 만 렌더 */}

      {/* v19 Phase 0-R: FloatingChat 마운트 해제 */}
    </div>
  );
}
