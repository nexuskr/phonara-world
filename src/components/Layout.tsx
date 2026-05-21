import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Home as HomeIcon,
  TrendingUp,
  Zap,
  Radio,
  Wallet,
  Gem,
  LogOut,
  User as UserIcon,
  Menu,
  Coins,
  Gamepad2,
} from "lucide-react";
import { useDB } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import TopHUD, { TopHUDCompact } from "./TopHUD";
import LanguageSwitcher from "./LanguageSwitcher";
import FreezeBanner from "./FreezeBanner";
import { useAchievementWatcher } from "@/hooks/use-achievement-watcher";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import PhonaraLogo from "@/components/brand/PhonaraLogo"; // ← ImperialLogo → PhonaraLogo 변경
import { motion, AnimatePresence } from "framer-motion";

// ====================== NAV ======================
type NavLeaf = { to: string; label: string; icon: React.ElementType; matches?: string[] };

const SIDEBAR_NAV: NavLeaf[] = [
  { to: "/command", label: "홈", icon: HomeIcon, matches: ["/command", "/home", "/dashboard"] },
  { to: "/trade", label: "트레이딩", icon: TrendingUp, matches: ["/trade", "/arena"] },
  { to: "/casino", label: "수익게임", icon: Zap, matches: ["/casino", "/crash", "/jackpot", "/games", "/slots"] },
  { to: "/live", label: "라이브", icon: Radio, matches: ["/live"] },
  { to: "/wallet", label: "지갑", icon: Wallet, matches: ["/wallet", "/secure-wallet", "/phon"] },
  { to: "/empire", label: "황실", icon: Gem, matches: ["/empire", "/packages", "/profile"] },
];

const BOTTOM_NAV = [
  { to: "/command", icon: HomeIcon, label: "홈", matches: ["/command", "/home", "/dashboard"] },
  { to: "/trade", icon: TrendingUp, label: "트레이딩", matches: ["/trade", "/arena"] },
  { to: "/phon", icon: Coins, label: "PHON", fab: true, matches: ["/phon"] },
  { to: "/casino", icon: Gamepad2, label: "게임", matches: ["/casino", "/games"] },
  { to: "/empire", icon: Gem, label: "황실", matches: ["/empire", "/profile"] },
];

// ====================== Web Worker Particle ======================
const NexusParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

    if (typeof OffscreenCanvas !== 'undefined' && canvas.transferControlToOffscreen) {
      const offscreen = canvas.transferControlToOffscreen();
      workerRef.current = new Worker('/workers/particle-worker.js');

      workerRef.current.postMessage({
        type: 'init',
        payload: { canvas: offscreen, isMobile, width: window.innerWidth, height: window.innerHeight }
      }, [offscreen]);

      const handleResize = () => workerRef.current?.postMessage({ type: 'resize', payload: { width: window.innerWidth, height: window.innerHeight } });
      const handleMove = (e: MouseEvent | TouchEvent) => {
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        workerRef.current?.postMessage({ type: 'mousemove', payload: { x, y } });
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove);

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('touchmove', handleMove);
        workerRef.current?.terminate();
      };
    }
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[-1] mix-blend-screen will-change-transform" />;
};

// ====================== ZERO FLASH LAYOUT ======================
export default function Layout({ children }: { children: React.ReactNode }) {
  const [db] = useDB();
  const nav = useNavigate();
  const loc = useLocation();
  const user = db.user;
  const [sheetOpen, setSheetOpen] = useState(false);

  useAchievementWatcher(loc.pathname);

  const triggerHaptic = useCallback((intensity: "light" | "medium" | "heavy" = "medium") => {
    if (navigator.vibrate) navigator.vibrate(intensity === "heavy" ? [10, 20, 10] : [6]);
  }, []);

  const isActive = (matches: string[] = [], to: string) =>
    matches.some(m => loc.pathname === m || loc.pathname.startsWith(m + "/")) || loc.pathname === to;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] text-white overflow-hidden relative">
      <FreezeBanner />
      <NexusParticleBackground />

      {/* DESKTOP SIDEBAR */}
      <AnimatePresence mode="wait">
        {user && (
          <motion.aside
            key="sidebar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="hidden md:flex fixed inset-y-0 left-0 z-50 w-72 flex-col border-r border-white/10 backdrop-blur-3xl bg-black/80 shadow-[0_0_80px_-20px] shadow-cyan-500/40"
          >
            <div className="px-6 py-8 border-b border-white/10 flex items-center gap-3 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10" />
              <PhonaraLogo to="/command" size="lg" withWordmark withWorld className="drop-shadow-[0_0_45px_#00f5ff] relative z-10" />
              <div className="ml-auto text-[10px] font-mono tracking-[3px] text-emerald-400">PHONARA • LIVE</div>
            </div>

            <nav className="flex-1 px-3 py-8 space-y-1 overflow-y-auto">
              {SIDEBAR_NAV.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.matches, item.to);
                return (
                  <motion.div key={item.to} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => triggerHaptic("light")}>
                    <NavLink
                      to={item.to}
                      className={`group relative flex items-center gap-4 px-6 py-4.5 rounded-3xl text-base font-semibold tracking-wider transition-all duration-300 ${active
                        ? "bg-gradient-to-r from-cyan-500/20 via-purple-500/15 to-pink-500/20 border border-cyan-400/40 shadow-[0_0_60px_-12px] shadow-cyan-400 text-white"
                        : "hover:bg-white/5 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {active && <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/20 to-pink-400/20 blur-2xl -z-10" />}
                      <div className={`p-3 rounded-2xl transition-all ${active ? "bg-white/10 scale-110" : "group-hover:bg-white/10"}`}>
                        <Icon className={`w-5 h-5 transition-all ${active ? "text-cyan-400 drop-shadow-[0_0_18px_#67e8f9]" : ""}`} />
                      </div>
                      <span>{item.label}</span>
                      {active && <div className="ml-auto w-2 h-2 bg-cyan-400 rounded-full animate-ping" />}
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>

            <div className="p-6 border-t border-white/10">
              <button
                onClick={async () => { triggerHaptic("heavy"); await supabase.auth.signOut(); nav("/"); }}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-3xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 active:scale-95 transition-all"
              >
                <LogOut className="w-4 h-4" /> 로그아웃
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* TOP HEADER - 수정된 버전 */}
<header className="sticky top-0 z-50 h-16 md:h-20 border-b border-white/10 backdrop-blur-3xl bg-black/90 flex items-center px-4 md:px-8">
  <div className="flex-1 flex items-center gap-4 min-w-0">  {/* min-w-0 추가 */}
    {user && (
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => triggerHaptic()} 
            className="md:hidden w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center bg-black/60 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 bg-black/95 backdrop-blur-3xl border-r border-white/10" />
      </Sheet>
    )}

    {/* 로고 - 모바일에서만 크게, 겹침 방지 */}
    <div className="flex-shrink-0 md:hidden">
      <PhonaraLogo to={user ? "/command" : "/"} size="md" withWordmark className="scale-90" />
    </div>
  </div>

  {/* 오른쪽 HUD */}
  <div className="flex items-center gap-3 flex-shrink-0">
    <TopHUD />
    <TopHUDCompact />
    {user && (
      <Link 
        to="/profile" 
        className="w-10 h-10 rounded-2xl glass border border-white/10 flex items-center justify-center hover:border-cyan-400/50 active:scale-95 transition-all flex-shrink-0"
      >
        <UserIcon className="w-5 h-5" />
      </Link>
    )}
    {!user && <LanguageSwitcher />}
  </div>
</header>

      {/* MAIN CONTENT */}
      <AnimatePresence mode="wait">
        <motion.main
          key={loc.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="md:ml-72 min-h-[calc(100dvh-4rem)] pb-24 md:pb-8 relative"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      {/* MOBILE BOTTOM NAV */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-black/95 backdrop-blur-3xl safe-area-bottom">
          <div className="flex items-center justify-around max-w-md mx-auto h-20 relative px-2">
            {BOTTOM_NAV.map((item, idx) => {
              const active = isActive(item.matches, item.to);
              if (item.fab) {
                return (
                  <motion.div key={idx} whileTap={{ scale: 0.82 }} onClick={() => triggerHaptic("heavy")}>
                    <Link to={item.to} className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_90px_-8px] shadow-cyan-400 border-[6px] border-black">
                      <Coins className="w-9 h-9 text-black drop-shadow-2xl" />
                    </Link>
                  </motion.div>
                );
              }
              return (
                <NavLink
                  key={idx}
                  to={item.to}
                  onClick={() => triggerHaptic()}
                  className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all active:scale-95 ${active ? "text-cyan-400" : "text-zinc-400"}`}
                >
                  <motion.div animate={active ? { scale: 1.18 } : {}} transition={{ duration: 0.3 }}>
                    <item.icon className={`w-7 h-7 mb-0.5 ${active ? "drop-shadow-[0_0_12px_#67e8f9]" : ""}`} />
                  </motion.div>
                  <span className="text-[10px] font-medium tracking-widest">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}