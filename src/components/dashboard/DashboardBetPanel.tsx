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

type Side = "long" | "short";

const SYMBOL = "BTCUSDT";
const LAST_AMOUNT_KEY = "phonara_last_bet_amount_v1";
const LAST_LEV_KEY = "phonara_last_leverage_v1";
const FIRST_TRADE_KEY = "first_trade_done";

// PHON gates for high leverage tiers
const LEVERAGE_GATES: Array<{ x: number; phon: number }> = [
  { x: 25, phon: 500 },
  { x: 50, phon: 1200 },
  { x: 100, phon: 5000 },
];

export interface BetPanelHandle {
  resubmit: () => void;
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
  const lastSideRef = useRef<Side>("long");
  const [firstDone, setFirstDone] = useState<boolean>(() => {
    try { return sessionStorage.getItem(FIRST_TRADE_KEY) === "1"; } catch { return false; }
  });
  const [flash, setFlash] = useState<Side | null>(null);

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
    try {
      localStorage.setItem(LAST_AMOUNT_KEY, String(amountNum));
      localStorage.setItem(LAST_LEV_KEY, String(leverage));
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
        <LightweightChartPanel symbol={SYMBOL} price={price} height={isMobile ? 140 : 220} />
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

        {/* AUTO REPEAT */}
        <button
          type="button"
          onClick={() => setAutoOn(!autoOn)}
          className={`w-full h-11 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition press ${
            autoOn
              ? "bg-gradient-imperial text-primary-foreground border-primary glow-imperial animate-pulse"
              : "border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40"
          }`}
        >
          <Repeat className={`w-4 h-4 ${autoOn ? "animate-spin" : ""}`} />
          {autoOn ? "AUTO REPEAT 활성 · 3.5s 간격" : "♻️ AUTO REPEAT"}
        </button>
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
