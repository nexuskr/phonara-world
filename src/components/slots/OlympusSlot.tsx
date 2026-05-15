import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Crown, Loader2, Play, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { SYMBOL_IMAGES, PREMIUM_INDICES } from "./symbolMap";
import { spinReal, spinDemo, getDemoBalance, claimDemoRefill, type SpinResult } from "@/lib/slots-rpc";
import { notify } from "@/lib/notify";
const notifyError = (msg: string, opts?: any) => notify.error(msg, opts);
const notifySuccess = (msg: string, opts?: any) => notify.success(msg, opts);
import { useDB } from "@/lib/store";
import { refreshWallet } from "@/lib/missions-rpc";
import bgImage from "@/assets/slots/olympus/bg.jpg";
import logoImage from "@/assets/slots/olympus/logo.png";
import frameImage from "@/assets/slots/olympus/frame.png";

type Mode = "demo" | "real";
const ROWS = 3;
const REELS = 5;
const GAME_CODE = "olympus_1000";

// Random reel filler used during the spin animation
function randomGrid(): number[][] {
  const g: number[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: number[] = [];
    for (let c = 0; c < REELS; c++) row.push(Math.floor(Math.random() * 9));
    g.push(row);
  }
  return g;
}

const BET_OPTIONS = [10, 50, 100, 500, 1000, 5000];

export default function OlympusSlot() {
  const [db] = useDB();
  const phonBalance = (db.user as any)?.phon_balance ?? 0;

  const [mode, setMode] = useState<Mode>("demo");
  const [bet, setBet] = useState(10);
  const [grid, setGrid] = useState<number[][]>(() => randomGrid());
  const [spinning, setSpinning] = useState(false);
  const [reelKey, setReelKey] = useState(0);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [demoBalance, setDemoBalance] = useState(10000);
  const [winLines, setWinLines] = useState<Set<string>>(new Set());
  const [bigWinShown, setBigWinShown] = useState<{ mult: number; amount: number } | null>(null);
  const [playCount] = useState(() => 200 + Math.floor(Math.random() * 100));
  const reelTimerRef = useRef<number | null>(null);

  // Load demo balance
  useEffect(() => {
    getDemoBalance().then(setDemoBalance).catch(() => {});
  }, []);

  // Drift play count slightly
  const [livePlay, setLivePlay] = useState(playCount);
  useEffect(() => {
    const i = window.setInterval(() => {
      setLivePlay((p) => Math.max(180, Math.min(320, p + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 4))));
    }, 30000);
    return () => clearInterval(i);
  }, []);

  const balance = mode === "demo" ? demoBalance : phonBalance;
  const balanceLabel = mode === "demo" ? "DEMO 칩" : "PHON";

  async function doSpin(buyBonus = false) {
    if (spinning) return;
    const cost = buyBonus ? bet * 100 : bet;
    if (mode === "real") {
      if (cost > phonBalance) {
        notifyError("PHON 잔고가 부족합니다");
        return;
      }
    } else {
      if (cost > demoBalance) {
        notifyError("DEMO 칩이 부족합니다 — 보충 버튼을 눌러주세요");
        return;
      }
    }

    setSpinning(true);
    setWinLines(new Set());
    setBigWinShown(null);

    // Animate reels with random fillers
    let ticks = 0;
    reelTimerRef.current = window.setInterval(() => {
      setGrid(randomGrid());
      setReelKey((k) => k + 1);
      ticks++;
    }, 80);

    try {
      const result = mode === "real"
        ? await spinReal(GAME_CODE, bet, buyBonus)
        : await spinDemo(GAME_CODE, bet, buyBonus);

      // Wait for at least 900ms of spin animation for satisfying feel
      const minSpin = 900;
      const elapsed = ticks * 80;
      if (elapsed < minSpin) {
        await new Promise((r) => setTimeout(r, minSpin - elapsed));
      }

      if (reelTimerRef.current) {
        clearInterval(reelTimerRef.current);
        reelTimerRef.current = null;
      }

      setGrid(result.symbols);
      setReelKey((k) => k + 1);
      setLastResult(result);

      // Highlight winning cells
      const wins = new Set<string>();
      result.win_lines?.forEach((wl: any) => {
        // mark the whole line for visual (server doesn't return cells, but symbol+line idx is enough for glow)
        for (let c = 0; c < wl.count; c++) wins.add(`line-${wl.line}-${c}`);
      });
      setWinLines(wins);

      // Update balances
      if (mode === "demo") {
        setDemoBalance(result.balance_chips ?? demoBalance);
      } else {
        await refreshWallet();
      }

      const payout = (result.payout_phon ?? result.payout_chips ?? 0) as number;
      const mult = bet > 0 ? payout / bet : 0;

      if (mult >= 50) {
        setBigWinShown({ mult, amount: payout });
        setTimeout(() => setBigWinShown(null), 4000);
      } else if (payout > 0) {
        notifySuccess(`+${payout.toLocaleString()} ${balanceLabel}`, { description: `${mult.toFixed(2)}× 승리` });
      }

      if (result.bonus_triggered && result.bonus_multiplier) {
        notifySuccess(`🎰 보너스 ${result.bonus_multiplier}× 당첨!`);
      }
    } catch (e: any) {
      const msg = String(e?.message || e || "");
      if (msg.includes("trading_halted")) notifyError("점검중입니다 — 잠시 후 다시 시도해주세요");
      else if (msg.includes("account_frozen")) notifyError("계정이 일시 동결되었습니다");
      else if (msg.includes("insufficient_phon")) notifyError("PHON 잔고가 부족합니다");
      else if (msg.includes("insufficient_demo_chips")) notifyError("DEMO 칩이 부족합니다");
      else if (msg.includes("bet_out_of_range")) notifyError("베팅 금액이 범위를 벗어났습니다");
      else notifyError("스핀 실패", { description: msg });
    } finally {
      if (reelTimerRef.current) {
        clearInterval(reelTimerRef.current);
        reelTimerRef.current = null;
      }
      setSpinning(false);
    }
  }

  async function handleRefill() {
    try {
      const r = await claimDemoRefill();
      if (r.refilled) {
        setDemoBalance(r.balance_chips);
        notifySuccess("DEMO 칩 보충 완료 +10,000");
      } else if (r.reason === "balance_too_high") {
        notifyError("잔고가 5,000보다 많습니다");
      } else {
        notifyError("24시간 후 다시 보충 가능합니다");
      }
    } catch (e: any) {
      notifyError("보충 실패", { description: String(e?.message || e) });
    }
  }

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10 rounded-3xl overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, hsl(var(--background) / 0.7), hsl(var(--background) / 0.95)), url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative p-3 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Olympus 1000" className="h-12 sm:h-14 w-auto drop-shadow-[0_0_18px_rgba(255,200,80,0.5)]" />
            <div>
              <div className="font-imperial text-base sm:text-lg text-gradient-imperial tracking-[0.2em] leading-none">
                OLYMPUS 1000
              </div>
              <div className="text-[10px] text-muted-foreground tracking-[0.25em] mt-1">
                BY PHONARA · RTP 96.0% · MAX 1000×
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground tracking-wider">잔고</div>
            <div className="font-mono text-base sm:text-lg font-bold text-primary">
              {Number(balance).toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">{balanceLabel}</div>
          </div>
        </div>

        {/* Mode toggle + live count */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-full bg-muted/50 p-1 border border-border/40">
            <button
              onClick={() => setMode("demo")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                mode === "demo" ? "bg-muted-foreground/20 text-foreground" : "text-muted-foreground"
              }`}
            >
              DEMO
            </button>
            <button
              onClick={() => setMode("real")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                mode === "real" ? "bg-gradient-imperial text-primary-foreground glow-imperial" : "text-muted-foreground"
              }`}
            >
              <Crown className="w-3 h-3" /> REAL
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono">{livePlay}</span>명 플레이 중
          </div>
        </div>

        {/* Reels */}
        <div className="relative">
          <div
            className="rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-amber-950/40 to-stone-950/60 p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,200,80,0.15)]"
            style={{
              backgroundImage: `url(${frameImage})`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          >
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
              {Array.from({ length: REELS }).map((_, reelIdx) => (
                <div key={reelIdx} className="space-y-1 sm:space-y-1.5 overflow-hidden">
                  {Array.from({ length: ROWS }).map((_, rowIdx) => {
                    const symIdx = grid[rowIdx]?.[reelIdx] ?? 0;
                    const isPremium = PREMIUM_INDICES.has(symIdx);
                    return (
                      <motion.div
                        key={`${reelKey}-${reelIdx}-${rowIdx}`}
                        initial={spinning ? { y: -20, opacity: 0.6 } : false}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.18, delay: spinning ? 0 : reelIdx * 0.08 }}
                        className={`relative aspect-square rounded-lg flex items-center justify-center bg-black/40 border ${
                          !spinning && isPremium ? "border-primary/60 shadow-[0_0_12px_rgba(255,200,80,0.4)]" : "border-border/30"
                        }`}
                      >
                        <img
                          src={SYMBOL_IMAGES[symIdx]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain p-1"
                        />
                      </motion.div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* BIG WIN overlay */}
          <AnimatePresence>
            {bigWinShown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              >
                <div className="bg-gradient-imperial px-6 py-4 rounded-2xl glow-imperial text-center">
                  <div className="font-imperial text-xs text-primary-foreground/80 tracking-[0.3em]">EPIC WIN</div>
                  <div className="font-mono text-3xl font-black text-primary-foreground mt-1">
                    {bigWinShown.mult.toFixed(2)}×
                  </div>
                  <div className="text-sm font-bold text-primary-foreground mt-1">
                    +{bigWinShown.amount.toLocaleString()} {balanceLabel}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bet controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {BET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBet(b)}
              disabled={spinning}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                bet === b
                  ? "bg-primary text-primary-foreground"
                  : "glass border border-border/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {b.toLocaleString()}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => doSpin(false)}
            disabled={spinning}
            className="h-14 rounded-2xl bg-gradient-imperial text-primary-foreground font-imperial tracking-[0.25em] text-sm font-black glow-imperial press flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {spinning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            SPIN
          </button>
          <button
            onClick={() => doSpin(true)}
            disabled={spinning}
            className="h-14 rounded-2xl border-2 border-primary/60 text-primary font-bold text-sm hover:bg-primary/10 press flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            Buy Bonus 100×
            <span className="text-[10px] opacity-70 ml-1">{(bet * 100).toLocaleString()}</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>Provably Fair · 서버 시드 해시 공개</span>
          </div>
          {mode === "demo" && (
            <button
              onClick={handleRefill}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border/40 hover:bg-muted/40 transition"
            >
              <RefreshCw className="w-3 h-3" /> DEMO 칩 보충
            </button>
          )}
          {lastResult?.server_seed_hash && (
            <div className="font-mono text-[9px] truncate max-w-[60%]">
              hash: {lastResult.server_seed_hash.slice(0, 16)}…
            </div>
          )}
        </div>

        {/* Last result panel */}
        {lastResult && (
          <div className="flex items-center justify-between text-[11px] glass rounded-xl px-3 py-2 border border-border/30">
            <div className="flex items-center gap-2">
              <Coins className="w-3.5 h-3.5 text-primary" />
              <span>마지막 결과</span>
            </div>
            <div className="font-mono">
              {(lastResult.payout_phon ?? lastResult.payout_chips ?? 0) > 0 ? (
                <span className="text-emerald-500 font-bold">
                  +{(lastResult.payout_phon ?? lastResult.payout_chips ?? 0).toLocaleString()}
                </span>
              ) : (
                <span className="text-muted-foreground">No win</span>
              )}
              {lastResult.bonus_triggered && lastResult.bonus_multiplier ? (
                <span className="ml-2 text-primary font-bold">+ Bonus {lastResult.bonus_multiplier}×</span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
