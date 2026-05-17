import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { lazy, Suspense, useEffect as useEffectIdle, useState as useStateIdle, useMemo, useState } from "react";
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
  TrendingUp,
  Menu,
  Sparkles,
  Coins,
  Lock,
} from "lucide-react";
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
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Heavy/non-critical UI deferred to idle to reduce TTI on mobile
const FloatingChat = lazy(() => import("./FloatingChat"));
const NeonNotificationFeed = lazy(() => import("./NeonNotificationFeed"));
const BaronPromotionDialog = lazy(() => import("./empire/BaronPromotionDialog"));
const EmpireBoosterTimer = lazy(() => import("./empire/EmpireBoosterTimer"));
const EmpireConcierge = lazy(() => import("./empire/EmpireConcierge"));
const ReplayShareGlobal = lazy(() => import("./empire/ReplayShareGlobal"));
const CrownWarFinaleModal = lazy(() => import("./empire/CrownWarFinaleModal"));
const PowerHeader = lazy(() => import("./empire/PowerHeader"));
const FirstEmperorBurst = lazy(() => import("./empire/FirstEmperorBurst"));
const CrownThroneOverlay = lazy(() => import("./empire/CrownThroneOverlay"));

function useIdleMount(delayMs = 1500) {
  const [ready, setReady] = useStateIdle(false);
  useEffectIdle(() => {
    const w: any = typeof window !== "undefined" ? window : null;
    if (!w) return;
    const ric = w.requestIdleCallback;
    if (ric) {
      const id = ric(() => setReady(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs]);
  return ready;
}
const QuickAccessStrip = lazy(() => import("./QuickAccessStrip"));
const EmpirePopulationPulse = lazy(() => import("./EmpirePopulationPulse"));
const ImperialHud = lazy(() => import("./imperial/ImperialHud"));

/**
 * Phonara — Cosmic Emperor V3 Grouped Navigation
 * Single source of truth for desktop sidebar, mobile sheet, and bottom-nav routing.
 */

type NavLeaf = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { id: string; label: string; icon: typeof LayoutDashboard; children: NavLeaf[] };

const GROUPS: NavGroup[] = [
  {
    id: "trading",
    label: "트레이딩",
    icon: TrendingUp,
    children: [
      { to: "/arena", label: "Long/Short Arena", icon: TrendingUp },
    ],
  },
  {
    id: "slots",
    label: "슬롯",
    icon: Zap,
    children: [
      { to: "/casino", label: "슬롯 로비", icon: Zap },
      { to: "/crash", label: "🚀 Crash NEW", icon: Zap },
      { to: "/casino/olympus-1000", label: "Olympus 1000", icon: Crown },
    ],
  },
  {
    id: "empire",
    label: "제국 광장",
    icon: Crown,
    children: [
      { to: "/empire", label: "제국 홀", icon: Crown },
      { to: "/packages", label: "황실 패키지", icon: Sparkles },
      { to: "/empire/my-seat", label: "내 좌석", icon: Crown },
    ],
  },
  {
    id: "missions",
    label: "황제 미션",
    icon: Trophy,
    children: [
      { to: "/missions", label: "데일리 미션", icon: Trophy },
      { to: "/quests", label: "퀘스트", icon: Trophy },
      { to: "/season-pass", label: "시즌 패스", icon: Sparkles },
    ],
  },
  {
    id: "treasury",
    label: "내 제국",
    icon: UserIcon,
    children: [
      { to: "/profile", label: "프로필", icon: UserIcon },
      { to: "/wallet", label: "지갑", icon: Wallet },
      { to: "/secure-wallet", label: "보안 금고", icon: Lock },
    ],
  },
];

// Bottom nav for mobile (5 tabs, center FAB = slot)
type BottomItem = { to: string; matches: string[]; icon: typeof LayoutDashboard; label: string; fab?: boolean };
const BOTTOM_NAV: BottomItem[] = [
  { to: "/command",  matches: ["/command", "/dashboard"], icon: LayoutDashboard, label: "대시보드" },
  { to: "/arena",    matches: ["/arena"],                 icon: TrendingUp,      label: "트레이딩" },
  { to: "/casino",   matches: ["/casino"],                icon: Zap,             label: "슬롯", fab: true },
  { to: "/empire",   matches: ["/empire", "/packages"],   icon: Crown,           label: "광장" },
  { to: "/profile",  matches: ["/profile", "/wallet"],    icon: UserIcon,        label: "내 제국" },
];

function isLeafActive(leaf: NavLeaf, pathname: string) {
  return pathname === leaf.to || pathname.startsWith(leaf.to + "/");
}
function isGroupActive(g: NavGroup, pathname: string) {
  return g.children.some((c) => isLeafActive(c, pathname));
}
function isBottomActive(b: BottomItem, pathname: string) {
  return b.matches.some((m) => pathname === m || pathname.startsWith(m + "/"));
}

function GroupedMenu({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const activeGroupIds = useMemo(
    () => GROUPS.filter((g) => isGroupActive(g, pathname)).map((g) => g.id),
    [pathname]
  );

  return (
    <div className="space-y-1">
      {/* Single dashboard link (no group) */}
      <NavLink
        to="/command"
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition press ${
            isActive || pathname.startsWith("/command")
              ? "bg-gradient-imperial text-primary-foreground glow-imperial"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          }`
        }
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>제국 대시보드</span>
      </NavLink>

      <Accordion type="multiple" defaultValue={activeGroupIds} className="space-y-1">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          const groupActive = isGroupActive(g, pathname);
          return (
            <AccordionItem
              key={g.id}
              value={g.id}
              className={`border-0 rounded-xl ${groupActive ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}
            >
              <AccordionTrigger
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold hover:no-underline hover:bg-muted/40 [&[data-state=open]>svg]:rotate-180 ${
                  groupActive ? "text-primary" : "text-foreground/90"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  {g.label}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-1 pt-0">
                <div className="ml-4 pl-3 border-l border-border/40 space-y-0.5">
                  {g.children.map((leaf) => {
                    const LIcon = leaf.icon;
                    const active = isLeafActive(leaf, pathname);
                    return (
                      <NavLink
                        key={leaf.to}
                        to={leaf.to}
                        onClick={onNavigate}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition ${
                          active
                            ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        }`}
                      >
                        <LIcon className="w-3.5 h-3.5" />
                        <span>{leaf.label}</span>
                        {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                      </NavLink>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="my-2 border-t border-border/40" />
      <NavLink
        to="/support"
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`
        }
      >
        <MessageSquare className="w-4 h-4" />
        <span>지원</span>
      </NavLink>
      {isAdmin && (
        <NavLink
          to="/admin"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin</span>
        </NavLink>
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
  const idleReady = useIdleMount(1500);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-screen md:pl-60 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom)+0.75rem)] md:pb-6">
      <FreezeBanner />

      {/* Desktop sidebar — grouped accordion */}
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
          <nav className="flex-1 p-3 overflow-y-auto">
            <GroupedMenu pathname={loc.pathname} isAdmin={!!user.isAdmin} />
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
                    <Link to="/command" onClick={() => setSheetOpen(false)} className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-imperial glow-imperial flex items-center justify-center font-imperial font-black text-primary-foreground text-base">
                        P
                      </div>
                      <span className="font-imperial text-base text-gradient-imperial tracking-[0.22em]">
                        PHONARA
                      </span>
                    </Link>
                  </div>
                  <div className="p-3 overflow-y-auto h-[calc(100%-180px)]">
                    <GroupedMenu pathname={loc.pathname} isAdmin={!!user.isAdmin} onNavigate={() => setSheetOpen(false)} />
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
            <Link to={user ? "/command" : "/"} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-imperial flex items-center justify-center font-imperial font-black text-primary-foreground text-sm">
                P
              </div>
              <span className="font-imperial text-sm text-gradient-imperial tracking-[0.18em]">
                PHONARA
              </span>
            </Link>
          </div>
          {/* Desktop spacer */}
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

      {/* Live population pulse strip */}
      {idleReady && (
        <Suspense fallback={null}>
          <EmpirePopulationPulse />
          {user && <ImperialHud />}
          {user && <QuickAccessStrip />}
        </Suspense>
      )}

      <main className="relative">{children}</main>
      {idleReady && (
        <Suspense fallback={null}>
          <NeonNotificationFeed />
          <BaronPromotionDialog />
          <EmpireBoosterTimer />
          <EmpireConcierge />
          <ReplayShareGlobal />
          <CrownWarFinaleModal />
          <CrownThroneOverlay />
          <PowerHeader />
          <FirstEmperorBurst onCta={() => {
            try {
              if (typeof window !== "undefined") {
                if (window.location.pathname !== "/dashboard") {
                  window.location.href = "/dashboard?focus=bet";
                } else {
                  window.dispatchEvent(new CustomEvent("phonara:focus-bet"));
                }
              }
            } catch {}
          }} />
        </Suspense>
      )}

      {/* Mobile bottom nav — 5 tabs with center FAB */}
      {user && (
        <nav
          className="md:hidden fixed left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem-env(safe-area-inset-left)-env(safe-area-inset-right))] max-w-md"
          style={{ bottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="glass-strong rounded-2xl px-2 py-2 flex items-end justify-between shadow-2xl neon-border relative overflow-visible">
            {BOTTOM_NAV.map((item) => {
              const Icon = item.icon;
              const active = isBottomActive(item, loc.pathname);

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
                        {item.label.toUpperCase()}
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
                      {item.label}
                    </span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}

      {user && idleReady && (
        <Suspense fallback={null}>
          <FloatingChat />
        </Suspense>
      )}
    </div>
  );
}
