import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Repeat, Lock, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LightweightChartPanel from "@/components/trading/LightweightChartPanel";
import { useBybitTicker } from "@/hooks/use-bybit-ticker";
import { usePaperStore } from "@/lib/paper-trading/store";
import { useDB } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAutoBet } from "@/hooks/use-auto-bet";
import { notify } from "@/lib/notify";
import { track } from "@/lib/telemetry";
import { useMyPower } from "@/hooks/use-my-power";

type Side = "long" | "short";

const SYMBOL = "BTCUSDT";
const LAST_AMOUNT_KEY = "phonara_last_bet_amount_v1";
const LAST_LEV_KEY = "phonara_last_leverage_v1";
const LAST_SIDE_KEY = "phonara_last_side_v1";
const FIRST_TRADE_KEY = "first_trade_done";

// PHON gates for high leverage tiers
const LEVERAGE_GATES: Array<{ x: number; phon: number }> = [
  { x: 25, phon: 500 },
  { x: 50, phon: 1200 },
  { x: 100, phon: 5000 },
];

export interface BetPanelHandle {
  resubmit: () => void;
  focusAmount: () => void;
}

/**
 * 우주 끝판왕 — 베팅 패널.
 * PHON 잔액 → 가격 → 미니차트 → 금액 → 배율(PHON 게이트) → LONG/SHORT.
 * + B1 첫 베팅 보너스 / B2 0.15s 햅틱 / B4 PHON 게이트 / B5 AUTO REPEAT.
 */
const DashboardBetPanel = forwardRef<BetPanelHandle>(function DashboardBetPanel(_props, ref) {
  const isMobile = useIsMobile();
  const [db] = useDB();
  const phon = db.user?.coinBalance ?? 0;
  const { prices } = useBybitTicker();
  const price = prices[SYMBOL] ?? 0;
  const credit = usePaperStore((s) => s.paperCredit);
  const open = usePaperStore((s) => s.open);

  const [amount, setAmount] = useState<string>(() => {
    try { return localStorage.getItem(LAST_AMOUNT_KEY) || "100"; } catch { return "100"; }
  });
  const [leverage, setLeverage] = useState<number>(() => {
    try { return Number(localStorage.getItem(LAST_LEV_KEY)) || 10; } catch { return 10; }
  });
  const [autoSide, setAutoSide] = useState<Side>(() => {
    try { return (localStorage.getItem(LAST_SIDE_KEY) as Side) === "short" ? "short" : "long"; } catch { return "long"; }
  });
  const lastSideRef = useRef<Side>(autoSide);
  const [firstDone, setFirstDone] = useState<boolean>(() => {
    try { return sessionStorage.getItem(FIRST_TRADE_KEY) === "1"; } catch { return false; }
  });
  const [flash, setFlash] = useState<Side | null>(null);
  const [showLevCalc, setShowLevCalc] = useState(false);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const { maxLeverage: serverMaxLev, boostPct: serverBoost } = useMyPower();

  const amountNum = Math.max(0, parseFloat(amount) || 0);

  function unlocked(x: number): boolean {
    const gate = LEVERAGE_GATES.find((g) => g.x === x);
    if (!gate) return true;
    return phon >= gate.phon;
  }

  function nextLockedGate(): { x: number; phon: number } | null {
    return LEVERAGE_GATES.find((g) => leverage >= g.x && phon < g.phon) ?? null;
  }

  function submit(side: Side) {
    if (!price) { notify.error("가격을 불러오는 중입니다."); return false; }
    if (amountNum <= 0) { notify.error("금액을 입력하세요."); return false; }
    if (amountNum > credit) { notify.error("잔액이 부족합니다."); return false; }
    const gate = LEVERAGE_GATES.find((g) => g.x === leverage);
    if (gate && phon < gate.phon) {
      notify.warning(`${leverage}× 잠김`, { description: `PHON ${gate.phon.toLocaleString()} 필요 (현재 ${phon.toLocaleString()})` });
      return false;
    }

    // B2 — 0.15s 즉시 피드백
    setFlash(side);
    try { (navigator as any).vibrate?.(15); } catch {}
    setTimeout(() => setFlash(null), 200);

    const pos = open({ symbol: SYMBOL, side, leverage, margin: amountNum, entry: price });
    if (!pos) { notify.error("주문을 열 수 없습니다."); return false; }

    lastSideRef.current = side;
    setAutoSide(side);
    try {
      localStorage.setItem(LAST_AMOUNT_KEY, String(amountNum));
      localStorage.setItem(LAST_LEV_KEY, String(leverage));
      localStorage.setItem(LAST_SIDE_KEY, side);
    } catch {}
    if (!firstDone) {
      try { sessionStorage.setItem(FIRST_TRADE_KEY, "1"); } catch {}
      setFirstDone(true);
    }
    track("cta_click", { surface: "dashboard_bet", variant: side, meta: { symbol: SYMBOL, leverage, amount: amountNum } });
    return true;
  }

  useImperativeHandle(ref, () => ({
    resubmit: () => { submit(lastSideRef.current); },
    focusAmount: () => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select();
      amountInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // B5 — AUTO REPEAT
  const [autoOn, setAutoOn] = useAutoBet({ enabled: false, onTick: () => submit(lastSideRef.current) });

  const setMarginPct = (pct: number) => {
    const v = Math.max(0, Math.floor(credit * pct * 100) / 100);
    setAmount(v.toString());
  };

  const lockedGateForCurrent = useMemo(() => nextLockedGate(), [leverage, phon]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="relative rounded-3xl border border-primary/30 bg-card/60 backdrop-blur-xl p-4 sm:p-5 space-y-3 shadow-[0_20px_80px_-20px_hsl(var(--primary)/0.4)]">
      {/* PHON balance + price header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.3em] font-bold text-primary/80">PHON · TRADING CREDIT</div>
          <div className="font-imperial text-2xl sm:text-3xl text-gradient-imperial tabular-nums">
            {credit.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-xs font-bold text-muted-foreground">USDT</span>
          </div>
          <div className="text-[11px] text-muted-foreground tabular-nums">PHON {phon.toLocaleString()}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.2em] font-bold text-muted-foreground">{SYMBOL}</div>
          <motion.div
            key={`p-${flash ?? "0"}-${Math.floor(price)}`}
            animate={flash ? { color: ["hsl(var(--primary))", "hsl(var(--foreground))"], scale: [1.05, 1] } : {}}
            transition={{ duration: 0.15 }}
            className="font-mono tabular-nums font-black text-lg sm:text-xl"
          >
            {price ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "—"}
          </motion.div>
        </div>
      </div>

      {/* Mini chart */}
      <div className="rounded-2xl overflow-hidden border border-border/40 bg-background/40">
        <LightweightChartPanel symbol={SYMBOL} price={price} height={isMobile ? 140 : 220} mode={isMobile ? "line" : "candle"} />
      </div>

      {/* Mobile: buttons FIRST (above amount/leverage), Desktop: traditional flow */}
      <div className={isMobile ? "flex flex-col gap-3" : "grid grid-cols-1 gap-3"}>
        {isMobile && (
          <ButtonsRow flash={flash} onLong={() => submit("long")} onShort={() => submit("short")} />
        )}

        {/* Amount */}
        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="bet-amount" className="text-[11px] font-bold tracking-wide text-muted-foreground">금액 (USDT)</label>
            <div className="flex gap-1">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setMarginPct(p)}
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-border/50 bg-background/60 hover:border-primary/50 hover:text-primary transition press"
                >
                  {p === 1 ? "MAX" : `${p * 100}%`}
                </button>
              ))}
            </div>
          </div>
          <Input
            id="bet-amount"
            name="bet-amount"
            type="number"
            inputMode="decimal"
            min={0}
            ref={amountInputRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 bg-background/60 text-lg font-bold tabular-nums h-12"
          />
        </div>

        {/* Leverage with PHON gates */}
        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-[11px] font-bold tracking-wide text-muted-foreground">레버리지</label>
            <span className="text-xl font-imperial text-primary tabular-nums">{leverage}×</span>
          </div>
          <Slider min={1} max={100} step={1} value={[leverage]} onValueChange={([v]) => setLeverage(v)} className="mt-3" />
          <div className="flex justify-between mt-2 text-[10px] tabular-nums">
            {[10, 25, 50, 100].map((x) => {
              const ok = unlocked(x);
              const gate = LEVERAGE_GATES.find((g) => g.x === x);
              return (
                <button
                  key={x}
                  type="button"
                  onClick={() => {
                    if (!ok && gate) {
                      notify.warning(`${x}× 잠김`, { description: `PHON ${gate.phon.toLocaleString()} 필요 (현재 ${phon.toLocaleString()}) — 지갑에서 충전` });
                      return;
                    }
                    setLeverage(x);
                  }}
                  className={`px-2 py-1 rounded-md font-bold border transition ${
                    leverage === x
                      ? "bg-gradient-imperial text-primary-foreground border-primary"
                      : ok
                        ? "border-border/50 hover:border-primary/50 text-foreground"
                        : "border-muted/40 text-muted-foreground/60"
                  }`}
                >
                  {!ok && <Lock className="w-2.5 h-2.5 inline mr-0.5" />}
                  {x}×
                  {!ok && gate && <span className="ml-1 text-primary/70">{gate.phon.toLocaleString()}</span>}
                </button>
              );
            })}
          </div>
          {lockedGateForCurrent && (
            <div className="mt-1.5 text-[10px] text-amber-400/90 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              {lockedGateForCurrent.x}× 해금까지 PHON {(lockedGateForCurrent.phon - phon).toLocaleString()} 더 필요
            </div>
          )}
          {serverMaxLev > 0 && leverage > serverMaxLev && (
            <>
              <button
                type="button"
                onClick={() => setShowLevCalc((v) => !v)}
                className="mt-1 w-full text-left text-[10px] text-rose-400 flex items-center gap-1 hover:text-rose-300"
              >
                <Lock className="w-2.5 h-2.5" />
                현재 최대 {serverMaxLev}× — 자세히 보기 {showLevCalc ? "▴" : "▾"}
              </button>
              <AnimatePresence>
                {showLevCalc && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5 text-[10px] space-y-1"
                  >
                    {(() => {
                      const base = phon >= 5000 ? 100 : phon >= 1200 ? 50 : phon >= 500 ? 25 : 10;
                      const cap = Math.min(100, Math.max(0, serverBoost || 0));
                      return (
                        <>
                          <div className="flex justify-between"><span className="text-muted-foreground">PHON 보유</span><span className="font-mono tabular-nums">{phon.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">PHON 등급 기본 배율</span><span className="font-mono tabular-nums text-foreground">{base}×</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">NFT 부스트 (cap 100%)</span><span className="font-mono tabular-nums text-amber-300">+{cap}%</span></div>
                          <div className="flex justify-between border-t border-rose-500/20 pt-1 mt-1">
                            <span className="font-bold">= {base} × (1 + {cap}/100)</span>
                            <span className="font-mono tabular-nums font-black text-primary">{serverMaxLev}×</span>
                          </div>
                          <div className="text-muted-foreground/80 leading-relaxed pt-1">
                            현재 선택: <span className="font-bold text-rose-400">{leverage}×</span> · 차이: <span className="font-bold">{leverage - serverMaxLev}×</span> 초과<br/>
                            PHON을 더 모으거나 NFT 부스트를 올려 해금하세요.
                          </div>
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* B1 — first-trade bonus banner */}
        <AnimatePresence>
          {!firstDone && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-3 py-2 flex items-center gap-2 animate-pulse-glow"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <div className="text-xs font-bold">
                🔥 지금 <span className="text-primary">첫 베팅</span> 시 <span className="text-money-strong">+10% PHON 보너스</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop buttons */}
        {!isMobile && (
          <ButtonsRow flash={flash} onLong={() => submit("long")} onShort={() => submit("short")} />
        )}

        {/* 자동 반복 베팅 — 방향 선택 + 70대 친화 직관 라벨 */}
        <div className="space-y-2">
          {/* 방향 선택 (자동 반복 시 어느 쪽으로 베팅할지) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setAutoSide("long"); lastSideRef.current = "long"; try { localStorage.setItem(LAST_SIDE_KEY, "long"); } catch {} }}
              className={`h-10 rounded-lg text-sm font-bold border-2 transition press ${
                autoSide === "long"
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-border/50 text-muted-foreground hover:border-emerald-500/40"
              }`}
            >
              🔴 자동 = 롱(상승)
            </button>
            <button
              type="button"
              onClick={() => { setAutoSide("short"); lastSideRef.current = "short"; try { localStorage.setItem(LAST_SIDE_KEY, "short"); } catch {} }}
              className={`h-10 rounded-lg text-sm font-bold border-2 transition press ${
                autoSide === "short"
                  ? "border-rose-500 bg-rose-500/15 text-rose-300"
                  : "border-border/50 text-muted-foreground hover:border-rose-500/40"
              }`}
            >
              🔵 자동 = 숏(하락)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAutoOn(!autoOn)}
            aria-label={autoOn ? "자동 반복 베팅 끄기" : "자동 반복 베팅 켜기"}
            className={`w-full h-14 rounded-xl border-2 font-black text-base flex items-center justify-center gap-2.5 transition press ${
              autoOn
                ? "bg-gradient-imperial text-primary-foreground border-primary glow-imperial animate-pulse"
                : "border-border/60 text-foreground hover:text-primary hover:border-primary/60 bg-background/60"
            }`}
          >
            <Repeat className={`w-5 h-5 ${autoOn ? "animate-spin" : ""}`} />
            {autoOn ? (
              <span className="flex flex-col items-start leading-tight">
                <span>🟢 자동 {autoSide === "long" ? "롱(상승)" : "숏(하락)"} 베팅 작동중</span>
                <span className="text-[11px] font-semibold opacity-90">3.5초마다 자동 반복 — 누르면 멈춤</span>
              </span>
            ) : (
              <span className="flex flex-col items-start leading-tight">
                <span>▶️ {autoSide === "long" ? "롱(상승)" : "숏(하락)"} 자동으로 계속 베팅</span>
                <span className="text-[11px] font-semibold text-muted-foreground">눌러서 켜기 · 3.5초마다 자동</span>
              </span>
            )}
          </button>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/70 leading-relaxed flex items-center gap-1">
        <Zap className="w-3 h-3" /> Paper Trading — 학습용 시뮬레이션. 실제 잔액에 영향 없음.
      </p>
    </section>
  );
});

function ButtonsRow({ flash, onLong, onShort }: { flash: "long" | "short" | null; onLong: () => void; onShort: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Button
        onClick={onLong}
        className={`h-16 text-lg font-display font-black bg-emerald-500 hover:bg-emerald-500/90 text-emerald-50 shadow-lg shadow-emerald-500/30 transition-transform ${flash === "long" ? "scale-95" : "scale-100"}`}
      >
        <TrendingUp className="w-5 h-5 mr-2" /> LONG
      </Button>
      <Button
        onClick={onShort}
        className={`h-16 text-lg font-display font-black bg-rose-500 hover:bg-rose-500/90 text-rose-50 shadow-lg shadow-rose-500/30 transition-transform ${flash === "short" ? "scale-95" : "scale-100"}`}
      >
        <TrendingDown className="w-5 h-5 mr-2" /> SHORT
      </Button>
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="col-span-2 -mt-1 text-center text-[11px] font-bold tracking-[0.3em] text-primary"
          >
            POSITION OPENED
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DashboardBetPanel;
