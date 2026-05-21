import { Link } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { Coins, Swords, TrendingUp, Wallet, ChevronRight, Zap, Users, Flame, Crown } from "lucide-react";
import WhaleStrikeRail from "@/components/empire/WhaleStrikeRail";

type Tile = {
  to: string;
  title: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "gold" | "pink" | "azure" | "emerald" | "violet";
  live?: boolean;
  limited?: boolean;
};

const TILES: Tile[] = [
  { 
    to: "/earn", 
    title: "무료돈벌기", 
    sub: "오늘 최대 47,820원 즉시 적립", 
    icon: Coins, 
    tone: "gold", 
    live: true, 
    limited: true 
  },
  { 
    to: "/duel", 
    title: "실시간 대결", 
    sub: "38,224명 대기중 · 1M PHON 상금 풀", 
    icon: Swords, 
    tone: "pink", 
    live: true 
  },
  { 
    to: "/trade", 
    title: "실시간 예측", 
    sub: "BTC/ETH 5분 예측 · 최대 87배", 
    icon: TrendingUp, 
    tone: "azure" 
  },
  { 
    to: "/phon", 
    title: "내 PHON", 
    sub: "잔고 확인 · 즉시 출금 가능", 
    icon: Wallet, 
    tone: "emerald" 
  },
];

export default function Dashboard() {
  const user = useRequireAuth();
  const [online, setOnline] = useState(34291);
  const [todayEarned, setTodayEarned] = useState(48720);
  const [limitedTime, setLimitedTime] = useState(347);

  // OffscreenCanvas + Web Worker Confetti
  const workerRef = useRef<Worker | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const initOffscreenConfetti = useCallback(() => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(window.innerWidth * window.devicePixelRatio);
    canvas.height = Math.floor(window.innerHeight * 0.75 * window.devicePixelRatio);
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "75vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    canvas.style.opacity = "0.9";
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const offscreen = canvas.transferControlToOffscreen();
    workerRef.current = new Worker("/workers/confettiWorker.js");
    workerRef.current.postMessage({ type: "init", canvas: offscreen }, [offscreen]);
  }, []);

  const fireConfetti = useCallback((intensity: "low" | "medium" = "low") => {
    if (!workerRef.current) return;

    const isMobile = /Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768;

    workerRef.current.postMessage({
      type: "fire",
      config: {
        particleCount: isMobile 
          ? (intensity === "medium" ? 48 : 28) 
          : (intensity === "medium" ? 110 : 65),
        spread: isMobile ? 68 : 95,
        originX: window.innerWidth * (0.3 + Math.random() * 0.4),
        originY: window.innerHeight * 0.55,
        ticks: 210,
      },
    });
  }, []);

  const cleanupConfetti = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "stop" });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }
  }, []);

  // Limited Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLimitedTime((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Main Effect
  useEffect(() => {
    initOffscreenConfetti();
    setTimeout(() => fireConfetti("medium"), 650);

    const interval = setInterval(() => {
      setOnline((p) => Math.max(28900, p + (Math.random() * 18 - 9) | 0));
      if (Math.random() > 0.65) {
        setTodayEarned((p) => p + (Math.random() * 920 | 0));
      }
    }, 3600);

    return () => {
      clearInterval(interval);
      cleanupConfetti();
    };
  }, [initOffscreenConfetti, fireConfetti, cleanupConfetti]);

  const handleTileClick = (title: string) => {
    if (title.includes("무료") || title.includes("대결")) {
      fireConfetti("low");
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-[100dvh] bg-[#050505] relative overflow-hidden">
        {/* Ultimate Neon Glow Background */}
        <div className="absolute inset-0 bg-[radial-gradient(at_40%_30%,_hsl(var(--pink)/0.18)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_70%_60%,_hsl(var(--gold)/0.14)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(at_20%_80%,_hsl(262,90%,65%,0.09)_0%,_transparent_50%)]" />

        <div className="container pt-8 pb-16 space-y-12 px-4 max-w-2xl mx-auto relative">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center gap-2.5 px-5 py-1.5 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-xl">
              <Flame className="w-4 h-4 text-pink-400" />
              <span className="text-xs tracking-[3px] font-bold text-amber-400">KOREA #1 GAMEFI PLATFORM</span>
            </div>

            <h1 className="font-imperial text-[3.8rem] md:text-[4.8rem] leading-[0.95] tracking-[-0.04em] bg-gradient-to-b from-white via-amber-200 to-pink-300 bg-clip-text text-transparent">
              PHONARA
            </h1>

            <p className="text-2xl font-medium text-white/80">
              오늘도 <span className="text-emerald-400 font-bold">{todayEarned.toLocaleString()}원</span> 벌고 있습니다
            </p>

            <div className="flex justify-center items-center gap-3 text-sm text-white/70">
              <Users className="w-5 h-5" />
              실시간 <span className="text-emerald-400 font-mono font-bold">{online.toLocaleString()}</span>명 접속 중
            </div>
          </motion.div>

          {/* Limited Drop Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-violet-500/10 border border-white/10 rounded-3xl p-6 backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-pink-400 text-sm font-bold">
                  <Crown className="w-4 h-4" /> LIMITED DROP
                </div>
                <p className="text-lg font-bold text-white mt-1">오늘 한정 PHON 500% 부스트</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">남은 시간</div>
                <div className="font-mono text-3xl font-bold text-amber-400 tabular-nums">
                  {Math.floor(limitedTime / 60)}:{(limitedTime % 60).toString().padStart(2, "0")}
                </div>
              </div>
            </div>
          </motion.div>

          {/* NFT God Tier Cards */}
          <section className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {TILES.map((t) => {
                const Icon = t.icon;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    onClick={() => handleTileClick(t.title)}
                    className="group relative aspect-[13/11.5] rounded-3xl overflow-hidden border border-white/10 bg-zinc-950/70 backdrop-blur-2xl hover:border-white/30 active:scale-[0.985] transition-all duration-700 shadow-2xl"
                    style={{ touchAction: "manipulation" }}
                  >
                    {/* Multi-layer Glass Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 group-hover:from-white/20 transition-all duration-700" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${
                      t.tone === 'gold' ? 'from-amber-400/30 to-yellow-400/10' :
                      t.tone === 'pink' ? 'from-pink-500/30 to-rose-500/10' :
                      t.tone === 'azure' ? 'from-sky-400/30' : 'from-emerald-400/30'
                    } opacity-0 group-hover:opacity-100 transition-all duration-700`} />

                    {/* Neon Border Glow */}
                    <div className="absolute -inset-[1px] rounded-3xl border border-transparent group-hover:border-[hsl(var(--gold)/0.65)] transition-all duration-700" />

                    <div className="relative h-full p-6 flex flex-col justify-between z-10">
                      <div className="flex justify-between items-start">
                        <div className="p-2.5 rounded-2xl bg-black/40 backdrop-blur-md">
                          <Icon className="w-9 h-9 text-white drop-shadow-[0_0_20px_currentColor]" />
                        </div>
                        {t.live && (
                          <div className="px-4 py-1.5 text-xs font-black tracking-[1.5px] bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-2xl shadow-lg shadow-red-500/50 flex items-center gap-1.5">
                            ● LIVE NOW
                          </div>
                        )}
                        {t.limited && (
                          <div className="px-3 py-1 text-[10px] font-bold bg-gradient-to-r from-amber-400 to-yellow-400 text-black rounded-xl">LIMITED</div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-3xl font-bold tracking-[-0.02em] text-white group-hover:text-amber-100 transition-colors">
                          {t.title}
                        </div>
                        <div className="text-[15px] leading-tight text-white/80 group-hover:text-white transition-colors">
                          {t.sub}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/60 group-hover:text-white/90 transition-colors uppercase tracking-widest text-xs">지금 시작하기</span>
                        <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>

                    {/* Bottom Shine */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                  </Link>
                );
              })}
            </AnimatePresence>
          </section>

          <WhaleStrikeRail />

          <div className="text-center text-xs text-white/40 tracking-widest pt-4">
            한국인 74,291명이 오늘 <span className="text-emerald-400">고수익</span>을 내고 있습니다
          </div>
        </div>
      </div>
    </Layout>
  );
}