import { lazy, Suspense, useEffect } from "react";
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
import { ReviewerGuard } from "./components/ReviewerGuard";
import { ReviewerMaskRoot } from "./components/ReviewerMaskRoot";
import ReviewerBadge from "./components/ReviewerBadge";
import { AdultGate } from "./components/AdultGate";

installGlobalErrorLogging();
installFetchInstrument();
installWebVitals();

const Index = lazy(() => import("./pages/Index.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const EmpireArena = lazy(() => import("./pages/EmpireArena.tsx"));
const TradingArenaWithArmy = lazy(() => import("./pages/TradingArenaWithArmy.tsx"));
const Lounge = lazy(() => import("./pages/Lounge.tsx"));
const Roulette = lazy(() => import("./pages/Roulette.tsx"));
const Missions = lazy(() => import("./pages/Missions.tsx"));
const Packages = lazy(() => import("./pages/Packages.tsx"));
const Wallet = lazy(() => import("./pages/Wallet.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const SupportTickets = lazy(() => import("./pages/SupportTickets.tsx"));
const Guide = lazy(() => import("./pages/Guide.tsx"));
const Admin = lazy(() => import("./pages/Admin.tsx"));
const AdminCockpit = lazy(() => import("./pages/admin/Cockpit.tsx"));
const AdminOpsReport = lazy(() => import("./pages/admin/OpsReport.tsx"));
const AdminSupport = lazy(() => import("./pages/admin/Support.tsx"));
const SecureAuth = lazy(() => import("./pages/SecureAuth.tsx"));
const SecureWallet = lazy(() => import("./pages/SecureWallet.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const SecurityTotp = lazy(() => import("./pages/security/Totp.tsx"));
const SecurityPasskey = lazy(() => import("./pages/security/Passkey.tsx"));
const SecurityOverview = lazy(() => import("./pages/security/Overview.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Achievements = lazy(() => import("./pages/Achievements.tsx"));
const SeasonPass = lazy(() => import("./pages/SeasonPass.tsx"));
const Quests = lazy(() => import("./pages/Quests.tsx"));
const Empire = lazy(() => import("./pages/Empire.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const Settlements = lazy(() => import("./pages/Settlements.tsx"));
const Status = lazy(() => import("./pages/Status.tsx"));
const Referral = lazy(() => import("./pages/Referral.tsx"));
const UgcDashboard = lazy(() => import("./pages/UgcDashboard.tsx"));
const CampaignRedirect = lazy(() => import("./pages/CampaignRedirect.tsx"));
const Whales = lazy(() => import("./pages/Whales.tsx"));

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
  useEffect(() => { recordRouteChange(loc.pathname); }, [loc.pathname]);
  if (typeof window !== "undefined") {
    const code = new URLSearchParams(window.location.search).get("ref");
    if (code && /^[A-Z0-9]{8}$/i.test(code)) {
      localStorage.setItem("pm_ref_code", code.toUpperCase());
    }
  }
  return null;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionWatcher />
          <ReviewerMaskRoot />
          <ReviewerBadge />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Phonara Empire 5축 IA — 정식 라우트 */}
              <Route path="/command" element={<Dashboard />} />
              <Route path="/earn" element={<Navigate to="/missions" replace />} />
              <Route path="/empire" element={<Empire />} />
              <Route path="/treasury" element={<Navigate to="/wallet" replace />} />
              <Route path="/treasury/settlements" element={<Settlements />} />
              <Route path="/legacy" element={<Navigate to="/achievements" replace />} />

              {/* 초직관 6대 메뉴 alias — 20~70대 한국인용 */}
              <Route path="/start" element={<Navigate to="/dashboard" replace />} />
              <Route path="/earnings" element={<Navigate to="/missions" replace />} />
              <Route path="/arena" element={<TradingArenaWithArmy />} />
              <Route path="/arena/classic" element={<EmpireArena />} />
              <Route path="/empire-arena" element={<TradingArenaWithArmy />} />
              <Route path="/empire-arena/classic" element={<EmpireArena />} />
              <Route path="/lounge" element={<Lounge />} />
              <Route path="/whales" element={<Whales />} />
              <Route path="/jackpot" element={<Navigate to="/roulette" replace />} />
              {/* /wallet 는 이미 존재 */}

              {/* 기존 라우트 — 그대로 작동 (HubTabs 통해 통합 UX) */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/missions" element={<Missions />} />
              <Route path="/roulette" element={<ReviewerGuard><AdultGate><Roulette /></AdultGate></ReviewerGuard>} />
              <Route path="/packages" element={<ReviewerGuard><AdultGate><Packages /></AdultGate></ReviewerGuard>} />
              <Route path="/wallet" element={<ReviewerGuard><AdultGate><Wallet /></AdultGate></ReviewerGuard>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/tickets" element={<SupportTickets />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/cockpit" element={<AdminCockpit />} />
              <Route path="/admin/ops-report" element={<AdminOpsReport />} />
              <Route path="/admin/support" element={<AdminSupport />} />
              <Route path="/secure-auth" element={<SecureAuth />} />
              <Route path="/secure-wallet" element={<SecureWallet />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/security" element={<SecurityOverview />} />
              <Route path="/security/totp" element={<SecurityTotp />} />
              <Route path="/security/passkey" element={<SecurityPasskey />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/season-pass" element={<SeasonPass />} />
              <Route path="/quests" element={<Quests />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/trust" element={<Navigate to="/status" replace />} />
              <Route path="/status" element={<Status />} />
              <Route path="/hall-of-fame" element={<Navigate to="/legacy" replace />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/ugc" element={<UgcDashboard />} />
              <Route path="/c/:slug" element={<CampaignRedirect />} />
              <Route path="/global-intelligence" element={<Navigate to="/" replace />} />
              <Route path="/infrastructure" element={<Navigate to="/" replace />} />
              <Route path="/intelligence-loop" element={<Navigate to="/" replace />} />
              <Route path="/vision" element={<Navigate to="/" replace />} />
              <Route path="/global/live" element={<Navigate to="/" replace />} />
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
