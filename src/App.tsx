import { lazy, Suspense, useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSessionGuard } from "./hooks/use-session-guard";
import { useAuthBridge } from "./hooks/use-auth-bridge";
import { useAdultGate } from "./hooks/use-adult-gate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteFallback } from "./components/RouteFallback";
import { installGlobalErrorLogging } from "./lib/error-logger";
import { installFetchInstrument, installWebVitals, recordRouteChange } from "./lib/spans";
import { schedulePrefetch, recordNavigation } from "./lib/route-prefetch";
import { ReviewerGuard } from "./components/ReviewerGuard";
import { ReviewerMaskRoot } from "./components/ReviewerMaskRoot";
import ReviewerBadge from "./components/ReviewerBadge";
import { AdultGate } from "./components/AdultGate";
import MaintenanceGate from "./components/MaintenanceGate";

installGlobalErrorLogging();
// Heavy instrumentation only when explicitly enabled — avoids per-fetch wrapping cost on every visit.
const __dev = (import.meta as any).env?.DEV;
const __debugPerf =
  typeof window !== "undefined" &&
  (() => { try { return localStorage.getItem("phonara:debug-perf") === "1"; } catch { return false; } })();
if (__dev || __debugPerf) {
  installFetchInstrument();
  installWebVitals();
}

const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const EmpireArena = lazy(() => import("./pages/EmpireArena.tsx"));
const TradingArenaWithArmy = lazy(() => import("./pages/TradingArenaWithArmy.tsx"));
const TradingArenaBybit = lazy(() => import("./pages/TradingArenaBybit.tsx"));
const WarTradingArena = lazy(() => import("./pages/WarTradingArena.tsx"));
const Pay = lazy(() => import("./pages/Pay.tsx"));
const MyFoundingSeat = lazy(() => import("./pages/MyFoundingSeat.tsx"));
const EmpireCollection = lazy(() => import("./pages/EmpireCollection.tsx"));
const Dynasty = lazy(() => import("./pages/Dynasty.tsx"));
// Lounge/Whales/Roulette — 통합되었으나 직관적인 진입을 위해 직접 라우팅 복원
const Lounge = lazy(() => import("./pages/Lounge.tsx"));
const Whales = lazy(() => import("./pages/Whales.tsx"));
const Roulette = lazy(() => import("./pages/Roulette.tsx"));
const Missions = lazy(() => import("./pages/Missions.tsx"));
const Packages = lazy(() => import("./pages/Packages.tsx"));
const Wallet = lazy(() => import("./pages/Wallet.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const SupportTickets = lazy(() => import("./pages/SupportTickets.tsx"));
const Guide = lazy(() => import("./pages/Guide.tsx"));
const GuidePhon = lazy(() => import("./pages/GuidePhon.tsx"));
const AdminRoutes = lazy(() => import("./pages/admin/_AdminRoutes.tsx"));
const FounderCockpit = lazy(() => import("./pages/Cockpit.tsx"));
const SecureAuth = lazy(() => import("./pages/SecureAuth.tsx"));
const SecureWallet = lazy(() => import("./pages/SecureWallet.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const SecurityTotp = lazy(() => import("./pages/security/Totp.tsx"));
const SecurityPasskey = lazy(() => import("./pages/security/Passkey.tsx"));
const SecurityOverview = lazy(() => import("./pages/security/Overview.tsx"));
const RecoverTotp = lazy(() => import("./pages/security/RecoverTotp.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Achievements = lazy(() => import("./pages/Achievements.tsx"));
const Empire = lazy(() => import("./pages/Empire.tsx"));
const EmpireHall = lazy(() => import("./pages/EmpireHall.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const Settlements = lazy(() => import("./pages/Settlements.tsx"));
const Status = lazy(() => import("./pages/Status.tsx"));
const Referral = lazy(() => import("./pages/Referral.tsx"));
const CampaignRedirect = lazy(() => import("./pages/CampaignRedirect.tsx"));
const ReplayLanding = lazy(() => import("./pages/ReplayLanding.tsx"));
const Trust = lazy(() => import("./pages/Trust.tsx"));
const LegalDoc = lazy(() => import("./pages/LegalDoc.tsx"));
import { PracticeModeBanner } from "./components/practice/PracticeModeBanner";
import { PracticeModeGate } from "./components/practice/PracticeModeGate";
import SimGlobalBadge from "./components/SimGlobalBadge";
import { FloatingDockHost } from "./components/ui/floating-dock";
const EmpireMomentToast = lazy(() => import("./components/empire/EmpireMomentToast"));
const FloatingCashLoopWidget = lazy(() => import("./components/empire/FloatingCashLoopWidget"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function SessionWatcher() {
  useSessionGuard();
  useAuthBridge();
  useAdultGate();
  const loc = useLocation();
  useEffect(() => { recordRouteChange(loc.pathname); recordNavigation(loc.pathname); }, [loc.pathname]);
  useEffect(() => {
    // Skip prefetch on light/auth/guide entry pages and low-end / mobile devices.
    if (typeof window === "undefined") return;
    const p = window.location.pathname;
    const skipRoutes = ["/guide", "/auth", "/secure-auth", "/forgot-password", "/reset-password", "/auth/callback", "/legal", "/unsubscribe"];
    if (skipRoutes.some((r) => p.startsWith(r))) return;
    const isMobile = window.innerWidth < 768;
    const lowMem = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4;
    if (isMobile || lowMem) return;
    // Defer prefetch well past first paint so it never competes with hero render.
    const t = setTimeout(() => schedulePrefetch(), 4000);
    return () => clearTimeout(t);
  }, []);
  if (typeof window !== "undefined") {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && /^[A-Z0-9]{8}$/i.test(code)) {
      localStorage.setItem("pm_ref_code", code.toUpperCase());
    }
  }
  return null;
}

/** Mount global overlays late, and never on auth/guide/landing routes. */
function GlobalOverlays() {
  const loc = useLocation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cb = () => setReady(true);
    // @ts-ignore
    if (typeof window.requestIdleCallback === "function") {
      // @ts-ignore
      const id = window.requestIdleCallback(cb, { timeout: 3500 });
      // @ts-ignore
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(cb, 2500);
    return () => clearTimeout(t);
  }, []);
  const HIDDEN = ["/guide", "/auth", "/secure-auth", "/forgot-password", "/reset-password", "/auth/callback", "/", "/unsubscribe", "/legal"];
  if (HIDDEN.some((r) => r === loc.pathname || (r !== "/" && loc.pathname.startsWith(r)))) return null;
  if (!ready) return null;
  return (
    <>
      <FloatingDockHost />
      <PracticeModeBanner />
      <SimGlobalBadge />
      <Suspense fallback={null}><EmpireMomentToast /></Suspense>
      <Suspense fallback={null}><FloatingCashLoopWidget /></Suspense>
    </>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SessionWatcher />
          <ReviewerMaskRoot />
          <ReviewerBadge />
          <GlobalOverlays />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Phonara Empire 5축 IA — 정식 라우트 */}
              <Route path="/command" element={<Dashboard />} />
              <Route path="/earn" element={<Navigate to="/missions" replace />} />
              <Route path="/empire" element={<Empire />} />
              <Route path="/empire/hall" element={<EmpireHall />} />
              <Route path="/empire/my-seat" element={<MyFoundingSeat />} />
              <Route path="/empire/collection" element={<EmpireCollection />} />
              <Route path="/dynasty" element={<Dynasty />} />
              <Route path="/treasury" element={<Navigate to="/wallet" replace />} />
              <Route path="/treasury/settlements" element={<Settlements />} />
              <Route path="/legacy" element={<Navigate to="/achievements" replace />} />

              {/* 초직관 6대 메뉴 alias — 20~70대 한국인용 */}
              <Route path="/start" element={<Navigate to="/dashboard" replace />} />
              <Route path="/earnings" element={<Navigate to="/missions" replace />} />
              <Route path="/arena" element={<TradingArenaBybit />} />
              <Route path="/war" element={<WarTradingArena />} />
              <Route path="/pay" element={<Pay />} />
              <Route path="/arena/army" element={<TradingArenaWithArmy />} />
              <Route path="/arena/classic" element={<EmpireArena />} />
              <Route path="/empire-arena" element={<Navigate to="/arena" replace />} />
              <Route path="/empire-arena/army" element={<Navigate to="/arena/army" replace />} />
              <Route path="/empire-arena/classic" element={<EmpireArena />} />
              <Route path="/lounge" element={<Lounge />} />
              <Route path="/whales" element={<Whales />} />
              <Route path="/jackpot" element={<Roulette />} />
              {/* /wallet 는 이미 존재 */}

              {/* 기존 라우트 — 그대로 작동 (HubTabs 통해 통합 UX) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/practice" element={<Navigate to="/dashboard" replace />} />
              <Route path="/pract" element={<Navigate to="/dashboard" replace />} />
              <Route path="/missions" element={<Missions />} />
              <Route path="/roulette" element={<Navigate to="/missions?tab=battle" replace />} />
              <Route path="/packages" element={<ReviewerGuard><AdultGate><PracticeModeGate label="패키지 구매"><Packages /></PracticeModeGate></AdultGate></ReviewerGuard>} />
              <Route path="/wallet" element={<ReviewerGuard><AdultGate><PracticeModeGate label="지갑/출금"><Wallet /></PracticeModeGate></AdultGate></ReviewerGuard>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/tickets" element={<SupportTickets />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/guide/phon" element={<GuidePhon />} />
              <Route path="/admin/*" element={<AdminRoutes />} />
              <Route path="/cockpit" element={<FounderCockpit />} />
              <Route path="/secure-auth" element={<SecureAuth />} />
              <Route path="/secure-wallet" element={<SecureWallet />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/security" element={<SecurityOverview />} />
              <Route path="/security/totp" element={<SecurityTotp />} />
              <Route path="/security/passkey" element={<SecurityPasskey />} />
              <Route path="/security/recover" element={<RecoverTotp />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/season-pass" element={<Navigate to="/missions?tab=daily" replace />} />
              <Route path="/quests" element={<Navigate to="/missions?tab=daily" replace />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/legal/:docKey" element={<LegalDoc />} />
              <Route path="/status" element={<Status />} />
              <Route path="/hall-of-fame" element={<Navigate to="/legacy" replace />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/ugc" element={<Navigate to="/missions?tab=rewards" replace />} />
              <Route path="/c/:slug" element={<CampaignRedirect />} />
              <Route path="/r/:token" element={<ReplayLanding />} />
              <Route path="/global-intelligence" element={<Navigate to="/" replace />} />
              <Route path="/infrastructure" element={<Navigate to="/" replace />} />
              <Route path="/intelligence-loop" element={<Navigate to="/" replace />} />
              <Route path="/vision" element={<Navigate to="/" replace />} />
              <Route path="/global/live" element={<Navigate to="/" replace />} />
              <Route path="/funnel" element={<Navigate to="/admin/funnel" replace />} />
              <Route path="/kpi" element={<Navigate to="/admin/kpi" replace />} />
              <Route path="/revenue" element={<Navigate to="/admin/revenue" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
