import { lazy, Suspense, useEffect } from "react";
// PR-B: framer-motion 정적 import 제거 — MotionConfig 의존성 한 줄 때문에
// entry 그래프에 framer-motion(45KB gz) 전체가 정적 결합되어 Layer 1 부담.
// reduced-motion 은 motion 컴포넌트가 prefers-reduced-motion CSS 미디어 쿼리로
// 자체 대응 가능. 글로벌 MotionConfig 제거 → motion 청크는 사용 페이지에서만 async 로드.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSessionGuard } from "./hooks/use-session-guard";
import { useAuthBridge } from "./hooks/use-auth-bridge";
import { useAdultGate } from "./hooks/use-adult-gate";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthErrorBoundary } from "./components/auth/AuthErrorBoundary";
import { RouteFallback } from "./components/RouteFallback";
import { installGlobalErrorLogging } from "./lib/error-logger";
import { installFetchInstrument, installWebVitals, recordRouteChange } from "./lib/spans";
import { schedulePrefetch, recordNavigation } from "./lib/route-prefetch";
import { ReviewerGuard } from "./components/ReviewerGuard";
import { ReviewerMaskRoot } from "./components/ReviewerMaskRoot";
import ReviewerBadge from "./components/ReviewerBadge";
import { AdultGate } from "./components/AdultGate";
import MaintenanceGate from "./components/MaintenanceGate";
import { DegradeModeBinder } from "./components/system/DegradeModeBinder";
import { DegradeModeBanner } from "./components/system/DegradeModeBanner";
import { DynamicIslandPill } from "@/packages/native/components/DynamicIslandPill";
import { ClientMetricsBinder } from "@/components/system/ClientMetricsBinder";
import { registerSW } from "./lib/pwa/registerSW";
import MobileShell from "./components/nav/MobileShell";
import StakeStyleSidebar from "./components/nav/StakeStyleSidebar";

installGlobalErrorLogging();
registerSW();
// Heavy instrumentation only when explicitly enabled — avoids per-fetch wrapping cost on every visit.
const __dev = (import.meta as any).env?.DEV;
const __debugPerf =
  typeof window !== "undefined" &&
  (() => { try { return localStorage.getItem("phonara:debug-perf") === "1"; } catch { return false; } })();
if (__dev || __debugPerf) {
  installFetchInstrument();
  installWebVitals();
}

// LOCKED v3.0 §12-1 §13-2 — 모든 환경에서 device profile + budget telemetry 가동
// (web-vitals 4KB, device 판정 1tick, 둘 다 critical path 영향 0)
// Phase 2 Visibility — DEV-only runtime ledger override (zero prod cost).
if (typeof window !== "undefined") {
  const __initBudgetSystems = () => {
    import("@pkg/performance").then((m) => m.initDeviceIntelligence()).catch(() => {});
    import("@pkg/telemetry").then((m) => m.initWebVitals()).catch(() => {});
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      import("@pkg/entropy").then((m) => m.captureEntropy()).catch(() => {});
    }
  };
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === "function") ric(__initBudgetSystems, { timeout: 2000 });
  else setTimeout(__initBudgetSystems, 1000);
}

// DEV-only chip — tree-shaken in prod.
const EntropyChip = (import.meta as { env?: { DEV?: boolean } }).env?.DEV
  ? lazy(() => import("@pkg/entropy/EntropyChip"))
  : null;

const Auth = lazy(() => import("./pages/Auth.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
// v14.0 Great Simplification — 4탭 슬림 IA
const Home = lazy(() => import("./pages/Home.tsx"));
const Earn = lazy(() => import("./pages/Earn.tsx"));
const Live = lazy(() => import("./pages/Live.tsx"));
// v19 Phase 0: war/arena/battle 라우트 사용자 진입 차단. 파일은 보존.
const TradingArenaBybit = lazy(() => import("./pages/TradingArenaBybit.tsx"));
const Pay = lazy(() => import("./pages/Pay.tsx"));
const MyFoundingSeat = lazy(() => import("./pages/MyFoundingSeat.tsx"));
const EmpireCollection = lazy(() => import("./pages/EmpireCollection.tsx"));
const NftAtelier = lazy(() => import("./pages/NftAtelier.tsx"));
const HybridNetPage = lazy(() => import("./pages/HybridNetPage.tsx"));
const Marketplace = lazy(() => import("./pages/Marketplace.tsx"));
const GalaxyAuction = lazy(() => import("./pages/GalaxyAuction.tsx"));
const Dynasty = lazy(() => import("./pages/Dynasty.tsx"));
// Lounge/Whales/Roulette — 통합되었으나 직관적인 진입을 위해 직접 라우팅 복원
const Lounge = lazy(() => import("./pages/Lounge.tsx"));
const Whales = lazy(() => import("./pages/Whales.tsx"));
const Roulette = lazy(() => import("./pages/Roulette.tsx"));
const Crash = lazy(() => import("./pages/Crash.tsx"));
const CrashImperial = lazy(() => import("./pages/CrashImperial.tsx"));
const CrashHistory = lazy(() => import("./pages/CrashHistory.tsx"));
const PlinkoImperial = lazy(() => import("./pages/games/PlinkoImperial.tsx"));
const RouletteImperial = lazy(() => import("./pages/games/RouletteImperial.tsx"));
const BlackjackImperial = lazy(() => import("./pages/games/BlackjackImperial.tsx"));
const CasinoLobby = lazy(() => import("./pages/Casino.tsx"));
const Olympus1000 = lazy(() => import("./pages/casino/Olympus1000.tsx"));
const Wizard2000 = lazy(() => import("./pages/casino/Wizard2000.tsx"));
const DragonEmpire = lazy(() => import("./pages/casino/DragonEmpire.tsx"));
const CosmicForge5000 = lazy(() => import("./pages/casino/CosmicForge5000.tsx"));
const NeonTokyo88 = lazy(() => import("./pages/casino/NeonTokyo88.tsx"));
const PiratesCurse1500 = lazy(() => import("./pages/casino/PiratesCurse1500.tsx"));
const PharaohsVault2500 = lazy(() => import("./pages/casino/PharaohsVault2500.tsx"));
const VikingThunder4000 = lazy(() => import("./pages/casino/VikingThunder4000.tsx"));
const AztecSun1200 = lazy(() => import("./pages/casino/AztecSun1200.tsx"));
const CherrySakura500 = lazy(() => import("./pages/casino/CherrySakura500.tsx"));
const OlympusLegacy5000 = lazy(() => import("./pages/casino/OlympusLegacy5000.tsx"));
const SugarFever3000 = lazy(() => import("./pages/casino/SugarFever3000.tsx"));
const Missions = lazy(() => import("./pages/Missions.tsx"));
const Packages = lazy(() => import("./pages/Packages.tsx"));
const Wallet = lazy(() => import("./pages/Wallet.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const Support = lazy(() => import("./pages/Support.tsx"));
const SupportTickets = lazy(() => import("./pages/SupportTickets.tsx"));
const Guide = lazy(() => import("./pages/Guide.tsx"));
const GuidePhon = lazy(() => import("./pages/GuidePhon.tsx"));
const PhonHub = lazy(() => import("./pages/PhonHub.tsx"));
const AdminRoutes = lazy(() => import("./pages/admin/_AdminRoutes.tsx"));
const FounderCockpit = lazy(() => import("./pages/Cockpit.tsx"));
const SecureAuth = lazy(() => import("./pages/SecureAuth.tsx"));
const SecureWallet = lazy(() => import("./pages/SecureWallet.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
// Phase 4 P1 — Observer Mode onboarding (lazy: not on critical path)
const ImperialWelcomeDialog = lazy(() => import("./components/onboarding/ImperialWelcomeDialog"));
const DailyLoginRewardToast = lazy(() => import("./components/onboarding/DailyLoginRewardToast"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile.tsx"));
const AuthCallback = lazy(() => import("./pages/AuthCallback.tsx"));
const SecurityTotp = lazy(() => import("./pages/security/Totp.tsx"));
const SecurityPasskey = lazy(() => import("./pages/security/Passkey.tsx"));
const SecurityOverview = lazy(() => import("./pages/security/Overview.tsx"));
const RecoverTotp = lazy(() => import("./pages/security/RecoverTotp.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Achievements = lazy(() => import("./pages/Achievements.tsx"));
const AchievementsV3 = lazy(() => import("./pages/AchievementsV3.tsx"));
const Empire = lazy(() => import("./pages/Empire.tsx"));
const EmpireHall = lazy(() => import("./pages/EmpireHall.tsx"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe.tsx"));
const Settlements = lazy(() => import("./pages/Settlements.tsx"));
const Status = lazy(() => import("./pages/Status.tsx"));
const Referral = lazy(() => import("./pages/Referral.tsx"));
const CampaignRedirect = lazy(() => import("./pages/CampaignRedirect.tsx"));
const ReplayLanding = lazy(() => import("./pages/ReplayLanding.tsx"));
const Trust = lazy(() => import("./pages/Trust.tsx"));
const Fairness = lazy(() => import("./pages/Fairness.tsx"));
const LegalDoc = lazy(() => import("./pages/LegalDoc.tsx"));
const LiveOverlay = lazy(() => import("./pages/LiveOverlay.tsx"));
const InfluencerLanding = lazy(() => import("./pages/InfluencerLanding.tsx"));
const Vip = lazy(() => import("./pages/Vip.tsx"));
const Avatar = lazy(() => import("./pages/Avatar.tsx"));
// Phase D — Avatar v3 + Virtual Lobby v3 (three3d 청크, Layer 1 미포함)
const AvatarStudio = lazy(() => import("./pages/AvatarStudio.tsx"));
const Lobby = lazy(() => import("./pages/Lobby.tsx"));
const Landing = lazy(() => import("./pages/Landing.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));
const DevConsole = lazy(() => import("./pages/DevConsole.tsx"));
const ImperialDuelLobby = lazy(() => import("./pages/ImperialDuelLobby.tsx"));
const ImperialDuelArena = lazy(() => import("./pages/ImperialDuelArena.tsx"));
// ApexForge — hybrid overlay (Phase 2 expanded, neon theme via [data-theme="apex"])
const ApexShell    = lazy(() => import("./packages/apex/ApexShell.tsx"));
const ApexHome     = lazy(() => import("./pages/apex/Home.tsx"));
const ApexFreeMoney = lazy(() => import("./pages/apex/FreeMoney.tsx"));
const ApexVault    = lazy(() => import("./pages/apex/Vault.tsx"));
const ApexWinReels = lazy(() => import("./pages/apex/WinReels.tsx"));
const ApexLootbox  = lazy(() => import("./pages/apex/Lootbox.tsx"));
const ApexSports   = lazy(() => import("./pages/apex/Sports.tsx"));
const ApexMy       = lazy(() => import("./pages/apex/My.tsx"));
// Phase 2 — Games + Sportsbook + Community
const ApexGames        = lazy(() => import("./pages/apex/Games.tsx"));
const ApexDice         = lazy(() => import("./pages/apex/games/Dice.tsx"));
const ApexCrash        = lazy(() => import("./pages/apex/games/Crash.tsx"));
const ApexPlinko       = lazy(() => import("./pages/apex/games/Plinko.tsx"));
const ApexMines        = lazy(() => import("./pages/apex/games/Mines.tsx"));
const ApexSlots        = lazy(() => import("./pages/apex/games/Slots.tsx"));
const ApexSportsbook   = lazy(() => import("./pages/apex/Sportsbook.tsx"));
const ApexCommunity    = lazy(() => import("./pages/apex/Community.tsx"));
// P5-B Community Layer
const ApexCommunityChat       = lazy(() => import("./pages/apex/community/Chat.tsx"));
const ApexCommunitySquad      = lazy(() => import("./pages/apex/community/Squad.tsx"));
const ApexCommunityTournament = lazy(() => import("./pages/apex/community/Tournament.tsx"));
const ApexEventsCup            = lazy(() => import("./pages/apex/events/Cup.tsx"));
const ApexHealth       = lazy(() => import("./pages/apex/Health.tsx"));
const ApexVerify       = lazy(() => import("./pages/apex/Verify.tsx"));
const ApexCrashV2      = lazy(() => import("./packages/apex/crash/LiveCrashV2.tsx"));
const ApexPump         = lazy(() => import("./pages/apex/games/Pump.tsx"));
const ApexWheel        = lazy(() => import("./pages/apex/games/Wheel.tsx"));
const ApexLimbo        = lazy(() => import("./pages/apex/games/Limbo.tsx"));
const ApexKeno         = lazy(() => import("./pages/apex/games/Keno.tsx"));
const ApexHiLo         = lazy(() => import("./pages/apex/games/HiLo.tsx"));
const ApexRace         = lazy(() => import("./pages/apex/Race.tsx"));
const ApexCashout      = lazy(() => import("./pages/apex/Cashout.tsx"));
const ApexLiveChatFab  = lazy(() => import("./packages/apex/support/LiveChatFab.tsx"));
// Phase 4 P4-A — Landing Apocalypse + Meta-safe SEO
const LandingApocalypse = lazy(() => import("./packages/apex/landing/LandingApocalypse.tsx"));
const SafePublic        = lazy(() => import("./pages/SafePublic.tsx"));
// v19 Phase 0-R: 글로벌 오버레이 17종 마운트 전면 해제. PracticeModeGate 만 라우트 가드용으로 보존.
import { PracticeModeGate } from "./components/practice/PracticeModeGate";

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
    const skipRoutes = ["/guide", "/auth", "/secure-auth", "/welcome", "/forgot-password", "/reset-password", "/auth/callback", "/legal", "/unsubscribe"];
    if (skipRoutes.some((r) => p.startsWith(r))) return;
    const isMobile = window.innerWidth < 768;
    const lowMem = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4;
    if (isMobile || lowMem) return;
    // Defer prefetch well past first paint so it never competes with hero render.
    const t = setTimeout(() => schedulePrefetch(), 4000);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    // Fire-and-forget AS SEEN ON capture (once per session, server filters self/internal)
    const t = setTimeout(() => {
      import("./lib/inboundPress").then((m) => m.captureInboundReferrerOnce()).catch(() => {});
    }, 3000);
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

/**
 * v19 Phase 0-R: 글로벌 오버레이 전면 해제.
 * 슬롯 사운드 preload 만 idle 시점에 1회 실행 (시각 마운트 없음).
 */
function GlobalOverlays() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const cb = () => {
      try {
        void import("@/lib/sounds/SlotSoundManager").then(({ soundManager }) => {
          soundManager.loadCommonSounds();
        });
      } catch { /* */ }
    };
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
  return null;
}

const App = () => (
  <ErrorBoundary>
    <AuthErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DegradeModeBanner />
          <DegradeModeBinder />
          <DynamicIslandPill />
          <ClientMetricsBinder />
          <SessionWatcher />
          <ReviewerMaskRoot />
          <ReviewerBadge />
          <GlobalOverlays />
          {EntropyChip && (
            <Suspense fallback={null}><EntropyChip /></Suspense>
          )}
          {/* v19 Phase 0-R: BigWinShareHost / AchievementUnlockListener / LobbyFab / ImperialDeepLinkListener 마운트 해제 */}
          {/* Phase 4 P1 Observer Mode — welcome + daily login (lazy, suspended) */}
          <Suspense fallback={null}>
            <ImperialWelcomeDialog />
            <DailyLoginRewardToast />
            <ApexLiveChatFab />
          </Suspense>
          {/* PC 영구 좌측 사이드바 — md+ 노출, 라우트별 자동 숨김. */}
          <StakeStyleSidebar />
          {/* 모바일 한손 조작 셸 — 5탭 + 더보기 시트 + 빠른 입금 FAB. md+ 자동 숨김. */}
          <MobileShell />
          <Suspense fallback={<RouteFallback />}>
            <MaintenanceGate>
            <Routes>
              <Route path="/" element={<Landing />} />
              {/* Phase 4 P4-A — Landing Apocalypse + Meta-safe SEO */}
              <Route path="/landing" element={<LandingApocalypse />} />
              <Route path="/safe" element={<SafePublic />} />
              {/* v19 Phase 0-R: /legacy-index 제거 */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/welcome" element={<Welcome />} />

              {/* v14.0 — 4탭 슬림 IA */}
              <Route path="/home" element={<Home />} />

              {/* ApexForge — Phase 2: 9-tab hybrid overlay */}
              <Route path="/apex" element={<ApexShell />}>
                <Route index               element={<LandingApocalypse />} />
                <Route path="home"         element={<ApexHome />} />
                <Route path="games"        element={<ApexGames />} />
                <Route path="games/dice"   element={<ApexDice />} />
                <Route path="games/crash"  element={<ApexCrash />} />
                <Route path="games/crash-v2" element={<ApexCrashV2 />} />
                <Route path="verify/:roundId" element={<ApexVerify />} />
                <Route path="games/plinko" element={<ApexPlinko />} />
                <Route path="games/mines"  element={<ApexMines />} />
                <Route path="games/slots"  element={<ApexSlots />} />
                <Route path="games/pump"   element={<ApexPump />} />
                <Route path="games/wheel"  element={<ApexWheel />} />
                <Route path="games/limbo"  element={<ApexLimbo />} />
                <Route path="games/keno"   element={<ApexKeno />} />
                <Route path="games/hilo"   element={<ApexHiLo />} />
                <Route path="sportsbook"   element={<ApexSportsbook />} />
                <Route path="community"    element={<ApexCommunity />} />
                <Route path="community/chat"       element={<ApexCommunityChat />} />
                <Route path="community/squad"      element={<ApexCommunitySquad />} />
                <Route path="community/tournament" element={<ApexCommunityTournament />} />
                <Route path="events/cup"           element={<ApexEventsCup />} />
                <Route path="free"         element={<ApexFreeMoney />} />
                <Route path="vault"        element={<ApexVault />} />
                <Route path="reels"        element={<ApexWinReels />} />
                <Route path="lootbox"      element={<ApexLootbox />} />
                <Route path="sports"       element={<ApexSports />} />
                <Route path="my"           element={<ApexMy />} />
                <Route path="race"         element={<ApexRace />} />
                <Route path="cashout"      element={<ApexCashout />} />
                <Route path="health"       element={<ApexHealth />} />
              </Route>

              <Route path="/phon" element={<PhonHub />} />
              <Route path="/swap" element={<Navigate to="/phon" replace />} />
              <Route path="/stake" element={<Navigate to="/phon" replace />} />
              <Route path="/earn" element={<Earn />} />
              <Route path="/live" element={<Live />} />
              <Route path="/games" element={<CasinoLobby />} />
              <Route path="/trade" element={<TradingArenaBybit />} />
              <Route path="/duel" element={<ImperialDuelLobby />} />
              <Route path="/duel/arena/:roomId" element={<ImperialDuelArena />} />
              <Route path="/events" element={<Navigate to="/missions?tab=daily" replace />} />
              <Route path="/avatar" element={<Navigate to="/profile" replace />} />
              <Route path="/guild" element={<Navigate to="/lounge" replace />} />

              {/* Phonara Empire 5축 IA — 정식 라우트 */}
              <Route path="/command" element={<Dashboard />} />
              <Route path="/empire" element={<Empire />} />
              <Route path="/empire/hall" element={<EmpireHall />} />
              <Route path="/empire/my-seat" element={<MyFoundingSeat />} />
              <Route path="/empire/collection" element={<EmpireCollection />} />
              <Route path="/empire/atelier" element={<NftAtelier />} />
              <Route path="/trade/net" element={<HybridNetPage />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/empire/galaxy" element={<GalaxyAuction />} />
              <Route path="/vip" element={<Vip />} />
              <Route path="/avatar" element={<Avatar />} />
              <Route path="/avatar/studio" element={<AvatarStudio />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/guild" element={<Navigate to="/lounge" replace />} />
              <Route path="/dynasty" element={<Dynasty />} />
              <Route path="/treasury" element={<Navigate to="/wallet" replace />} />
              <Route path="/treasury/settlements" element={<Settlements />} />
              <Route path="/legacy" element={<Navigate to="/achievements" replace />} />

              {/* 초직관 6대 메뉴 alias — 20~70대 한국인용 */}
              <Route path="/start" element={<Navigate to="/dashboard" replace />} />
              <Route path="/earnings" element={<Navigate to="/missions" replace />} />
              {/* v19 Phase 0: war/arena/battle 라우트 → /trade 흡수 */}
              <Route path="/arena" element={<Navigate to="/trade" replace />} />
              <Route path="/arena/army" element={<Navigate to="/trade" replace />} />
              <Route path="/arena/classic" element={<Navigate to="/trade" replace />} />
              <Route path="/war" element={<Navigate to="/trade" replace />} />
              <Route path="/empire-arena" element={<Navigate to="/trade" replace />} />
              <Route path="/empire-arena/army" element={<Navigate to="/trade" replace />} />
              <Route path="/empire-arena/classic" element={<Navigate to="/trade" replace />} />
              <Route path="/empire/arena" element={<Navigate to="/trade" replace />} />
              <Route path="/trading/army" element={<Navigate to="/trade" replace />} />
              <Route path="/trading/war" element={<Navigate to="/trade" replace />} />
              <Route path="/pay" element={<Pay />} />
              <Route path="/lounge" element={<Lounge />} />
              <Route path="/whales" element={<Whales />} />
              <Route path="/jackpot" element={<Roulette />} />
              <Route path="/casino" element={<CasinoLobby />} />
              <Route path="/crash" element={<Crash />} />
              <Route path="/crash/imperial" element={<CrashImperial />} />
              <Route path="/crash/history" element={<CrashHistory />} />
              <Route path="/games/plinko/imperial" element={<PlinkoImperial />} />
              <Route path="/games/roulette/imperial" element={<RouletteImperial />} />
              <Route path="/games/blackjack/imperial" element={<BlackjackImperial />} />
              <Route path="/casino/olympus1000" element={<Navigate to="/casino/olympus-1000" replace />} />
              <Route path="/casino/olympus-1000" element={<Olympus1000 />} />
              <Route path="/casino/wizard-2000" element={<Wizard2000 />} />
              <Route path="/casino/dragon-empire" element={<DragonEmpire />} />
              <Route path="/casino/cosmic-forge-5000" element={<CosmicForge5000 />} />
              <Route path="/casino/neon-tokyo-88" element={<NeonTokyo88 />} />
              <Route path="/casino/pirates-curse-1500" element={<PiratesCurse1500 />} />
              <Route path="/casino/pharaohs-vault-2500" element={<PharaohsVault2500 />} />
              <Route path="/casino/viking-thunder-4000" element={<VikingThunder4000 />} />
              <Route path="/casino/aztec-sun-1200" element={<AztecSun1200 />} />
              <Route path="/casino/cherry-sakura-500" element={<CherrySakura500 />} />
              <Route path="/casino/olympus-legacy-5000" element={<OlympusLegacy5000 />} />
              <Route path="/casino/sugar-fever-3000" element={<SugarFever3000 />} />
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
              <Route path="/achievements/quest" element={<AchievementsV3 />} />
              <Route path="/season-pass" element={<Navigate to="/missions?tab=daily" replace />} />
              <Route path="/quests" element={<Navigate to="/missions?tab=daily" replace />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/trust" element={<Trust />} />
              <Route path="/fairness" element={<Fairness />} />
              <Route path="/legal/:docKey" element={<LegalDoc />} />
              <Route path="/status" element={<Status />} />
              <Route path="/hall-of-fame" element={<Navigate to="/legacy" replace />} />
              <Route path="/referral" element={<Referral />} />
              <Route path="/ugc" element={<Navigate to="/missions?tab=rewards" replace />} />
              <Route path="/c/:slug" element={<CampaignRedirect />} />
              <Route path="/r/:token" element={<ReplayLanding />} />
              <Route path="/i/:code" element={<InfluencerLanding />} />
              <Route path="/live/:token" element={<LiveOverlay />} />
              <Route path="/dev/console" element={<DevConsole />} />
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
            </MaintenanceGate>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </AuthErrorBoundary>
  </ErrorBoundary>
);

export default App;
