import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Roulette from "./pages/Roulette.tsx";
import Missions from "./pages/Missions.tsx";
import Packages from "./pages/Packages.tsx";
import Wallet from "./pages/Wallet.tsx";
import Profile from "./pages/Profile.tsx";
import Support from "./pages/Support.tsx";
import Guide from "./pages/Guide.tsx";
import Admin from "./pages/Admin.tsx";
import SecureAuth from "./pages/SecureAuth.tsx";
import SecureWallet from "./pages/SecureWallet.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import CompleteProfile from "./pages/CompleteProfile.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useSessionGuard } from "./hooks/use-session-guard";
import { useAuthBridge } from "./hooks/use-auth-bridge";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: 5 * 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

function SessionWatcher() {
  useSessionGuard();
  useAuthBridge();
  // Phase 21: capture ?ref=CODE on any page so it survives until signup
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
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionWatcher />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/roulette" element={<Roulette />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/support" element={<Support />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/secure-auth" element={<SecureAuth />} />
          <Route path="/secure-wallet" element={<SecureWallet />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
