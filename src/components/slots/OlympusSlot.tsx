import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Loader2, Play, RefreshCw, ShieldCheck, Square, Zap } from "lucide-react";
import { spinReal, spinDemo, getDemoBalance, claimDemoRefill, type SpinResult } from "@/lib/slots-rpc";
import { notify } from "@/lib/notify";
import { useDB } from "@/lib/store";
import { refreshWallet } from "@/lib/missions-rpc";
import { useFakePlayerCount } from "@/hooks/use-fake-player-count";
import Reel from "./reels/Reel";
import BalanceTicker from "./BalanceTicker";
import WinOverlay, { classifyWin, type WinTier } from "./overlays/WinOverlay";
import ScatterTriggerOverlay from "./overlays/ScatterTriggerOverlay";
import BonusIntroOverlay from "./overlays/BonusIntroOverlay";
import BonusWheel, { snapToSegment } from "./overlays/BonusWheel";
import AutoSpinControls, { type AutoSpinSettings } from "./AutoSpinControls";
import GameInfoSheet from "./GameInfoSheet";

import bgImage from "@/assets/slots/olympus/bg.jpg";
import logoImage from "@/assets/slots/olympus/logo.png";

const GAME_CODE = "olympus_1000";
const REELS = 5;
const BET_OPTIONS = [10, 50, 100, 500, 1000, 5000];
const REEL_DELAYS = [0, 120, 240, 360, 480];
const REEL_DURATIONS = [700, 850, 1000, 1150, 1300];

type Mode = "demo" | "real";
type Grid = number[][]; // [row][reel]

function randomGrid(): Grid {
  const g: Grid = [];
  for (let r = 0; r < 3; r++) {
    const row: number[] = [];
    for (let c = 0; c < REELS; c++) row.push(Math.floor(Math.random() * 9));
    g.push(row);
  }
  return g;
}

function describeError(msg: string) {
  if (msg.includes("trading_halted")) return "점검중 — 잠시 후 다시 시도해주세요";
  if (msg.includes("account_frozen")) return "계정이 일시 동결되었습니다";
  if (msg.includes("insufficient_phon")) return "PHON 잔고가 부족합니다";
  if (msg.includes("insufficient_demo_chips")) return "DEMO 칩 부족 — 보충해주세요";
  if (msg.includes("bet_out_of_range")) return "베팅 금액이 범위를 벗어났습니다";
  if (msg.includes("bet_invalid")) return "베팅 금액이 올바르지 않습니다";
  if (msg.includes("game_not_found")) return "게임을 찾을 수 없습니다";
  if (msg.includes("auth_required")) return "로그인이 필요합니다";
  return "스핀 실패 — 잠시 후 다시 시도해주세요";
}

export default function OlympusSlot() {
  const [db] = useDB();
  const phonBalance = (db.user as any)?.phon_balance ?? 0;

  const [mode, setMode] = useState<Mode>("demo");
  const [bet, setBet] = useState(10);
  const [grid, setGrid] = useState<Grid>(() => randomGrid());
  const [spinning, setSpinning] = useState(false);
  const [demoBalance, setDemoBalance] = useState(10000);

  // Display balance — separate from raw so we can animate count-up after wins
  const [displayBalance, setDisplayBalance] = useState<number>(0);
  const [balancePulse, setBalancePulse] = useState<"up" | "down" | null>(null);

  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [winOverlay, setWinOverlay] = useState<{ tier: WinTier; amount: number } | null>(null);

  // Bonus pipeline
  const [scatterCount, setScatterCount] = useState(0);
  const [showScatter, setShowScatter] = useState(false);
  const [showBonusIntro, setShowBonusIntro] = useState(false);
  const [bonusWheel, setBonusWheel] = useState<{ mult: number } | null>(null);

  // Auto-spin
  const [autoActive, setAutoActive] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState(0);
  const [autoSettings, setAutoSettings] = useState<AutoSpinSettings>({
    rounds: 25,
    stopOnBonus: true,
    stopOnBigWin: false,
    stopBalanceFloor: 0,
  });
  const autoActiveRef = useRef(false);

  const livePlay = useFakePlayerCount();

  const rawBalance = mode === "demo" ? demoBalance : phonBalance;
  const balanceLabel = mode === "demo" ? "DEMO 칩" : "PHON";

  // Sync display balance when mode flips
  useEffect(() => {
    setDisplayBalance(rawBalance);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync display when raw changes from external sources (refill, realtime)
  useEffect(() => {
    if (!spinning) setDisplayBalance(rawBalance);
  }, [rawBalance, spinning]);

  useEffect(() => {
    getDemoBalance().then((b) => {
      setDemoBalance(b);
      if (mode === "demo") setDisplayBalance(b);
    }).catch(() => {});
  }, []); // eslint-disable-line

  const performSpin = useCallback(async (buyBonus: boolean) => {
    if (spinning) return false;
    const cost = buyBonus ? bet * 100 : bet;
    if (mode === "real" && cost > phonBalance) {
      notify.error("PHON 잔고가 부족합니다");
      return false;
    }
    if (mode === "demo" && cost > demoBalance) {
      notify.error("DEMO 칩 부족 — 보충해주세요");
      return false;
    }

    setSpinning(true);
    setWinOverlay(null);
    setShowScatter(false);
    setShowBonusIntro(false);
    setBonusWheel(null);

    // Immediate balance debit animation
    setBalancePulse("down");
    setDisplayBalance((b) => b - cost);
    setTimeout(() => setBalancePulse(null), 400);

    try {
      const result =
        mode === "real"
          ? await spinReal(GAME_CODE, bet, buyBonus)
          : await spinDemo(GAME_CODE, bet, buyBonus);

      // Wait for the longest reel to settle visually before applying state
      const longestReel = Math.max(...REEL_DELAYS.map((d, i) => d + REEL_DURATIONS[i]));
      const settle = new Promise<void>((res) => setTimeout(res, longestReel + 100));

      // Set the target grid immediately so reels know where to land
      setGrid(result.symbols);
      await settle;

      setLastResult(result);

      const payout = (result.payout_phon ?? result.payout_chips ?? 0) as number;

      // Count scatters in the final grid
      let scatters = 0;
      for (const row of result.symbols) for (const s of row) if (s === 10) scatters++;
      setScatterCount(scatters);

      // Update raw balance from server
      if (mode === "demo" && typeof result.balance_chips === "number") {
        setDemoBalance(result.balance_chips);
      } else if (mode === "real") {
        await refreshWallet();
      }

      // BONUS PIPELINE
      if (result.bonus_triggered && result.bonus_multiplier && result.bonus_multiplier > 0) {
        // Without payout-from-bonus we replay the cinematic, then count up
        const bonusMult = snapToSegment(result.bonus_multiplier);

        if (scatters >= 3) {
          setShowScatter(true);
          await new Promise((r) => setTimeout(r, 1700));
          setShowScatter(false);
        }

        setShowBonusIntro(true);
        await new Promise<void>((res) => {
          // BonusIntro auto-completes after ~2.4s
          const id = setInterval(() => {
            if (!showBonusIntroRefVal.current) {
              clearInterval(id);
              res();
            }
          }, 100);
          // Fallback
          setTimeout(() => { clearInterval(id); res(); }, 4000);
        });

        // Wheel
        await new Promise<void>((res) => {
          setBonusWheel({ mult: bonusMult });
          // BonusWheel calls onComplete after ~6.8s
          setTimeout(res, 7200);
        });
        setBonusWheel(null);
      }

      // Final balance count-up
      if (payout > 0) {
        setBalancePulse("up");
        setDisplayBalance((b) => b + payout);
        setTimeout(() => setBalancePulse(null), 800);

        const mult = bet > 0 ? payout / bet : 0;
        const tier = classifyWin(mult);
        if (tier) {
          setWinOverlay({ tier, amount: payout });
        } else {
          notify.success(`+${payout.toLocaleString()} ${balanceLabel}`, {
            description: `${mult.toFixed(2)}× 승리`,
          });
        }
        return true;
      } else {
        // Sync to actual server balance
        if (mode === "demo" && typeof result.balance_chips === "number") {
          setDisplayBalance(result.balance_chips);
        }
        return true;
      }
    } catch (e: any) {
      notify.error(describeError(String(e?.message ?? e)));
      // Restore balance on failure
      setDisplayBalance(rawBalance);
      return false;
    } finally {
      setSpinning(false);
    }
  }, [bet, mode, spinning, phonBalance, demoBalance, balanceLabel, rawBalance]);

  // ref-trick to peek showBonusIntro inside async wait without re-render churn
  const showBonusIntroRefVal = useRef(false);
  useEffect(() => { showBonusIntroRefVal.current = showBonusIntro; }, [showBonusIntro]);

  // Auto-spin loop
  useEffect(() => {
    autoActiveRef.current = autoActive;
  }, [autoActive]);

  const startAuto = useCallback(() => {
    setAutoActive(true);
    setAutoRemaining(autoSettings.rounds);
  }, [autoSettings.rounds]);

  const stopAuto = useCallback(() => {
    setAutoActive(false);
    setAutoRemaining(0);
  }, []);

  useEffect(() => {
    if (!autoActive || spinning) return;
    if (autoSettings.rounds !== -1 && autoRemaining <= 0) {
      stopAuto();
      return;
    }
    const t = setTimeout(async () => {
      if (!autoActiveRef.current) return;
      const ok = await performSpin(false);
      if (!ok) { stopAuto(); return; }
      // Inspect last result via state (already updated)
      // Stop conditions
      const r = lastResult;
      const payout = (r?.payout_phon ?? r?.payout_chips ?? 0) as number;
      const m = bet > 0 ? payout / bet : 0;
      if (autoSettings.stopOnBonus && r?.bonus_triggered) { stopAuto(); return; }
      if (autoSettings.stopOnBigWin && m >= 50) { stopAuto(); return; }
      setAutoRemaining((n) => (autoSettings.rounds === -1 ? n : n - 1));
    }, 350);
    return () => clearTimeout(t);
  }, [autoActive, spinning, autoRemaining, autoSettings, performSpin, lastResult, bet, stopAuto]);

  const handleRefill = async () => {
    try {
      const r = await claimDemoRefill();
      if (r.refilled) {
        setDemoBalance(r.balance_chips);
        setDisplayBalance(r.balance_chips);
        notify.success("DEMO 칩 +10,000 보충 완료");
      } else if (r.reason === "balance_too_high") {
        notify.error("잔고가 5,000 이상일 때는 보충할 수 없습니다");
      } else {
        notify.error("24시간 후 다시 보충 가능합니다");
      }
    } catch (e: any) {
      notify.error("보충 실패", { description: describeError(String(e?.message ?? e)) });
    }
  };

  const reelTargets = useMemo(() => {
    return Array.from({ length: REELS }).map((_, c) => {
      return [grid[0]?.[c] ?? 0, grid[1]?.[c] ?? 0, grid[2]?.[c] ?? 0] as [number, number, number];
    });
  }, [grid]);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
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
            <img
              src={logoImage}
              alt="Olympus 1000"
              className="h-12 sm:h-14 w-auto drop-shadow-[0_0_18px_rgba(255,200,80,0.5)]"
            />
            <div>
              <div className="font-imperial text-base sm:text-lg text-gradient-imperial tracking-[0.2em] leading-none">
                OLYMPUS 1000
              </div>
              <div className="text-[10px] text-muted-foreground tracking-[0.25em] mt-1">
                BY PHONARA · RTP 96.0% · MAX 1000×
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground tracking-wider">잔고</div>
              <div className="font-mono text-base sm:text-lg font-bold text-primary">
                <BalanceTicker value={displayBalance} pulse={balancePulse} />
              </div>
              <div className="text-[10px] text-muted-foreground">{balanceLabel}</div>
            </div>
            <GameInfoSheet />
          </div>
        </div>

        {/* Mode toggle + live count */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex rounded-full bg-muted/50 p-1 border border-border/40">
            <button
              onClick={() => !spinning && !autoActive && setMode("demo")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                mode === "demo" ? "bg-muted-foreground/20 text-foreground" : "text-muted-foreground"
              }`}
            >
              DEMO
            </button>
            <button
              onClick={() => !spinning && !autoActive && setMode("real")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ${
                mode === "real"
                  ? "bg-gradient-imperial text-primary-foreground glow-imperial"
                  : "text-muted-foreground"
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
          <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-b from-amber-950/40 to-stone-950/60 p-2 sm:p-3 shadow-[inset_0_0_40px_rgba(255,200,80,0.15)]">
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
              {reelTargets.map((target, c) => (
                <Reel
                  key={c}
                  target={target}
                  spinning={spinning}
                  delayMs={REEL_DELAYS[c]}
                  durationMs={REEL_DURATIONS[c]}
                  highlightWin={!spinning && !!lastResult?.win_lines?.length}
                />
              ))}
            </div>
          </div>

          {/* Cinematic overlays — scoped to the reel area */}
          <ScatterTriggerOverlay show={showScatter} count={scatterCount} />
          <BonusIntroOverlay show={showBonusIntro} onComplete={() => setShowBonusIntro(false)} />
          {bonusWheel && (
            <BonusWheel
              show={!!bonusWheel}
              targetMultiplier={bonusWheel.mult}
              betAmount={bet}
              unitLabel={balanceLabel}
              onComplete={() => setBonusWheel(null)}
            />
          )}
          {winOverlay && (
            <WinOverlay
              show={!!winOverlay}
              tier={winOverlay.tier}
              amount={winOverlay.amount}
              unitLabel={balanceLabel}
              onClose={() => setWinOverlay(null)}
            />
          )}
        </div>

        {/* Bet controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {BET_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBet(b)}
              disabled={spinning || autoActive}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${
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
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            onClick={() => performSpin(false)}
            disabled={spinning || autoActive}
            className="h-12 sm:h-14 rounded-xl bg-gradient-imperial text-primary-foreground font-imperial tracking-[0.25em] text-sm font-black glow-imperial press flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {spinning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            SPIN
          </button>
          <AutoSpinControls
            active={autoActive}
            remaining={autoRemaining}
            settings={autoSettings}
            onSettingsChange={setAutoSettings}
            onStart={startAuto}
            onStop={stopAuto}
          />
          <button
            onClick={() => performSpin(true)}
            disabled={spinning || autoActive}
            className="h-12 sm:h-14 px-3 rounded-xl border-2 border-primary/60 text-primary font-bold text-xs flex items-center justify-center gap-1 hover:bg-primary/10 press disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            BUY 100×
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
      </div>
    </div>
  );
}
