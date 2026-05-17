import { useEffect, useMemo, useState, useSyncExternalStore, useCallback, lazy, Suspense } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { Swords, Flame, Wallet as WalletIcon, Crown } from "lucide-react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useWallet } from "@/hooks/use-wallet";
import { notify } from "@/lib/notify";
import { priceStore } from "@/lib/trading/priceStore";
import { useRealStore } from "@/lib/trading/real-store";
import { usePaperStore } from "@/lib/paper-trading/store";
import type { LivePosition, LiveTrade, Mode, Side } from "@/lib/trading/types";
import { applySlippage, computeSize, liquidationPrice } from "@/lib/trading/engine";
import { FEE_RATE } from "@/lib/trading/types";
import { preTradeValidate } from "@/lib/trading/risk-engine";
import { mapTradingError } from "@/lib/trading/errors";

import ChartWithHeader from "@/components/trading/ChartWithHeader";
import MegaOrderPanel from "@/components/trading/MegaOrderPanel";
import OpenPositionsLive from "@/components/trading/OpenPositionsLive";
import TradingHistoryGold from "@/components/trading/TradingHistoryGold";
import RedDisclaimerBanner from "@/components/trading/RedDisclaimerBanner";
import ModeToggle from "@/components/trading/ModeToggle";
import { triggerFx } from "@/components/trading/DopamineLayer";

const DopamineLayer = lazy(() => import("@/components/trading/DopamineLayer"));
const ComboStreakHUD = lazy(() => import("@/components/trading/ComboStreakHUD"));

// v3 trading UX — sibling, FREEZE-safe presentational layers
const BigPnLHeader = lazy(() => import("@/components/trading/v3/BigPnLHeader"));
const PhonAdvantageRibbon = lazy(() => import("@/components/trading/v3/PhonAdvantageRibbon"));
const HotCoinRail = lazy(() => import("@/components/trading/v3/HotCoinRail"));
const LeveragePresetRail = lazy(() => import("@/components/trading/v3/LeveragePresetRail"));
const LiveSideCounter = lazy(() => import("@/components/trading/v3/LiveSideCounter"));
const MobileOrderSheet = lazy(() => import("@/components/trading/v3/MobileOrderSheet"));
const PhonBettingNudge = lazy(() => import("@/components/trading/v3/PhonBettingNudge"));
const VipTradingRoom = lazy(() => import("@/components/trading/v3/VipTradingRoom"));
const PhonOrderPanel = lazy(() => import("@/components/trading/v3/PhonOrderPanel"));
const PhonLiveSocialProof = lazy(() => import("@/components/trading/v3/PhonLiveSocialProof"));
const PhonPositionsList = lazy(() => import("@/components/trading/v3/PhonPositionsList"));
const LiveTradingCounter = lazy(() => import("@/components/fomo/LiveTradingCounter"));
const ImperialTradeFomoBar = lazy(() => import("@/components/trade/ImperialTradeFomoBar"));
const CurrencyExchangeButton = lazy(() => import("@/components/trade/CurrencyExchangeButton"));

function usePriceStore() {
  return useSyncExternalStore(priceStore.subscribe, priceStore.getSnapshot, priceStore.getSnapshot);
}

/** Adapt paper Position[] → LivePosition[] for shared list/history components. */
function adaptPaperToLive(positions: ReturnType<typeof usePaperStore.getState>["positions"]): LivePosition[] {
  return positions.map((p) => ({
    id: p.id,
    user_id: "paper",
    symbol: p.symbol,
    side: p.side as Side,
    leverage: p.leverage,
    margin: p.margin,
    size: computeSize(p.margin, p.leverage, p.entry),
    entry: p.entry,
    liq_price: liquidationPrice(p.side as Side, p.entry, p.leverage),
    fee_open: Math.floor(p.margin * p.leverage * FEE_RATE),
    status: "open" as const,
    opened_at: new Date(p.openedAt).toISOString(),
    margin_mode: (p.marginMode ?? "isolated") as "isolated" | "cross",
    allocated_margin: p.allocatedMargin,
  }));
}

function adaptPaperHistory(history: ReturnType<typeof usePaperStore.getState>["history"]): LiveTrade[] {
  return history.filter((p) => p.closed).map((p) => ({
    id: p.id,
    user_id: "paper",
    symbol: p.symbol,
    side: p.side as Side,
    leverage: p.leverage,
    margin: p.margin,
    size: computeSize(p.margin, p.leverage, p.entry),
    entry: p.entry,
    close_price: p.closed!.price,
    pnl: p.closed!.pnl,
    roi: p.closed!.roi,
    fee_open: Math.floor(p.margin * p.leverage * FEE_RATE),
    fee_close: 0,
    reason: p.closed!.reason,
    opened_at: new Date(p.openedAt).toISOString(),
    closed_at: new Date(p.closed!.at).toISOString(),
  }));
}

export default function TradingArenaBybit() {
  const user = useRequireAuth();
  const { wallet } = useWallet(user?.id);
  const [mode, setMode] = useState<Mode>("paper");
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [busy, setBusy] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Prefill from /arena/army REAL handoff: ?mode=real&side=long&symbol=BTCUSDT&size=100
  useEffect(() => {
    const qMode = searchParams.get("mode");
    const qSymbol = searchParams.get("symbol");
    const qSide = searchParams.get("side");
    if (!qMode && !qSymbol && !qSide) return;
    if (qMode === "real") setMode("real");
    if (qSymbol && /^[A-Z]{2,10}USDT$/.test(qSymbol)) setSymbol(qSymbol);
    if (qSide === "long" || qSide === "short") {
      notify.info(qSide === "long" ? "📈 LONG 사이드 선택" : "📉 SHORT 사이드 선택", {
        description: "주문 패널에서 LONG / SHORT 버튼을 눌러 체결하세요",
      });
    }
    // Clean up query so refresh doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    ["mode", "side", "symbol", "size"].forEach((k) => next.delete(k));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const { prices, stats } = usePriceStore();
  const price = prices[symbol] ?? 0;
  const stat = stats[symbol];

  // Real store
  const realPositions = useRealStore((s) => s.positions);
  const realHistory = useRealStore((s) => s.history);
  const loadReal = useRealStore((s) => s.load);
  const openReal = useRealStore((s) => s.open);
  const closeReal = useRealStore((s) => s.close);
  const liquidateReal = useRealStore((s) => s.liquidate);
  const subscribeReal = useRealStore((s) => s.subscribe);
  const realCombo = useRealStore((s) => s.comboWins);

  // Paper store
  const paperPositions = usePaperStore((s) => s.positions);
  const paperHistory = usePaperStore((s) => s.history);
  const paperCredit = usePaperStore((s) => s.paperCredit);
  const openPaper = usePaperStore((s) => s.open);
  const closePaper = usePaperStore((s) => s.close);
  const tickPaper = usePaperStore((s) => s.tick);
  const paperCombo = usePaperStore((s) => s.comboWins);
  const comboWins = mode === "paper" ? paperCombo : realCombo;

  // Real-store load + realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    loadReal();
    const unsub = subscribeReal(user.id);
    return () => { unsub(); };
  }, [user?.id, loadReal, subscribeReal]);

  // Paper auto-liquidation tick
  useEffect(() => {
    if (mode !== "paper") return;
    const liq = tickPaper(prices);
    if (liq.length) {
      liq.forEach((p) => triggerFx({ kind: "liquidate", pnl: -p.margin, roi: -1, symbol: p.symbol, unit: "USDT" }));
    }
  }, [prices, mode, tickPaper]);

  const realAvailable = wallet?.available_balance ?? 0;
  const balance = mode === "paper" ? paperCredit : realAvailable;

  const handleSubmit = useCallback(async (args: {
    side: Side;
    leverage: number;
    margin: number;
    triggers?: { tpPct?: number; slPct?: number; trailingPct?: number; tpPrice?: number; slPrice?: number; trailingOffset?: number };
    marginMode: "isolated" | "cross";
    allocatedMargin?: number;
  }) => {
    if (!price) { notify.warning("가격 수신 대기 중"); return; }
    if (args.margin <= 0) { notify.warning("마진을 입력해주세요"); return; }
    setBusy(true);
    try {
      if (mode === "paper") {
        const entry = applySlippage(args.side, price, true);
        const pos = openPaper({
          symbol, side: args.side, leverage: args.leverage, margin: args.margin, entry,
          marginMode: args.marginMode,
          allocatedMargin: args.allocatedMargin,
        });
        if (!pos) {
          notify.error("주문 실패", { description: "Paper 잔액 부족" });
          try { navigator.vibrate?.([10, 40, 10]); } catch { /* noop */ }
        } else {
          notify.success(`${args.side.toUpperCase()} ${args.leverage}× 개시`, {
            description: `${symbol} @ ${entry.toFixed(4)} · ${args.margin} USDT · ${args.marginMode === "cross" ? "Cross" : "Iso"}`,
          });
          try { navigator.vibrate?.(15); } catch { /* noop */ }
        }
      } else {
        if (realAvailable <= 0) {
          notify.warning("Empire Balance 부족", { description: "충전 후 다시 시도하세요." });
          return;
        }
        // === Risk Engine Level 4: pre-trade validation ===
        const verdict = await preTradeValidate({
          symbol, side: args.side, leverage: args.leverage,
          margin: args.margin, markPriceFallback: price,
        });
        if (verdict.status === "REJECT") {
          notify.error("주문 거부 (Risk Engine)", {
            description: `${mapTradingError(verdict.reason)} · RPI ${(verdict.rpi*100).toFixed(1)}% · 안전거리 ${(verdict.safetyDistance*100).toFixed(1)}%`,
          });
          try { navigator.vibrate?.([10, 40, 10, 40, 10]); } catch { /* noop */ }
          return;
        }
        if (verdict.status === "WARN") {
          const ok = window.confirm(
            `⚠️ ${mapTradingError(verdict.reason)}\n\nRPI: ${(verdict.rpi*100).toFixed(1)}%\n안전거리: ${(verdict.safetyDistance*100).toFixed(1)}%\n\n그래도 진입하시겠습니까?`,
          );
          if (!ok) {
            notify.info("주문 취소됨");
            return;
          }
          notify.warning("리스크 경고를 무시하고 진입합니다");
        }
        const r = await openReal({
          symbol,
          side: args.side,
          leverage: args.leverage,
          margin: args.margin,
          mark: price,
          tpPct: args.triggers?.tpPct,
          slPct: args.triggers?.slPct,
          trailingPct: args.triggers?.trailingPct,
          tpPrice: args.triggers?.tpPrice,
          slPrice: args.triggers?.slPrice,
          trailingOffset: args.triggers?.trailingOffset,
          marginMode: args.marginMode,
          allocatedMargin: args.allocatedMargin,
        });
        if ("error" in r) {
          notify.error("주문 실패", { description: r.error });
          try { navigator.vibrate?.([10, 40, 10]); } catch { /* noop */ }
        } else {
          notify.success(`REAL ${args.side.toUpperCase()} ${args.leverage}× 체결`, {
            description: `${symbol} @ ${price.toFixed(4)}`,
          });
          try { navigator.vibrate?.(15); } catch { /* noop */ }
        }
      }
    } finally {
      setBusy(false);
    }
  }, [mode, price, symbol, openPaper, openReal, realAvailable]);

  // OpenPositionsLive adapters
  const paperLivePositions = useMemo(() => adaptPaperToLive(paperPositions), [paperPositions]);
  const paperLiveHistory = useMemo(() => adaptPaperHistory(paperHistory.slice(0, 50)), [paperHistory]);
  const positions = mode === "paper" ? paperLivePositions : realPositions;
  const history = mode === "paper" ? paperLiveHistory : realHistory.slice(0, 50);
  const unit = mode === "paper" ? "USDT" : "KRW";

  // Desktop keyboard shortcut: Esc = close all open positions (confirm).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === "INPUT" || tgt.tagName === "TEXTAREA" || tgt.isContentEditable)) return;
      if (e.key === "Escape" && positions.length > 0) {
        if (window.confirm(`모든 포지션(${positions.length}건)을 청산합니다.`)) {
          positions.forEach((p) => { void handleClose(p.id, prices[p.symbol] ?? p.entry); });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [positions, prices]);

  const handleClose = useCallback(async (id: string, mark: number) => {
    if (mode === "paper") {
      const closed = closePaper(id, mark, "manual");
      if (!closed) return { error: "포지션 없음" };
      const c = closed.closed!;
      triggerFx({ kind: c.pnl >= 0 ? "win" : "loss", pnl: c.pnl, roi: c.roi, symbol: closed.symbol, unit: "USDT" });
      notify.success("청산 완료", { description: `PnL ${c.pnl >= 0 ? "+" : ""}${c.pnl.toFixed(2)} USDT (${(c.roi * 100).toFixed(2)}%)` });
      return { pnl: c.pnl, roi: c.roi, credit: paperCredit + closed.margin + c.pnl, exit: c.price };
    }
    if (!mark || mark <= 0) {
      notify.warning("가격 수신 대기 중", { description: "차트 가격이 들어오면 다시 시도하세요." });
      return { error: "no price" };
    }
    setBusy(true);
    const tId = notify.loading("청산 진행 중…", { description: `${symbol} @ ${mark.toLocaleString()}` });
    try {
      const r = await closeReal(id, mark);
      if ("error" in r) {
        notify.error("청산 실패", { id: tId, description: r.error });
      } else {
        triggerFx({ kind: r.pnl >= 0 ? "win" : "loss", pnl: r.pnl, roi: r.roi, symbol, unit: "KRW" });
        notify.success("청산 완료", {
          id: tId,
          description: `PnL ${r.pnl >= 0 ? "+" : ""}${Math.round(r.pnl).toLocaleString()} KRW (${(r.roi * 100).toFixed(2)}%)`,
        });
      }
      return r;
    } finally {
      setBusy(false);
    }
  }, [mode, closePaper, closeReal, paperCredit, symbol]);

  const handleLiquidate = useCallback(async (id: string, mark: number) => {
    if (mode === "paper") {
      closePaper(id, mark, "liquidation");
      notify.warning("강제 청산", { description: "포지션이 강제청산되었습니다." });
      return { liquidated: true as const, margin_lost: 0 };
    }
    if (!mark || mark <= 0) {
      notify.warning("가격 수신 대기 중", { description: "차트 가격이 들어오면 다시 시도하세요." });
      return { error: "no price" };
    }
    setBusy(true);
    const tId = notify.loading("강제청산 진행 중…");
    try {
      const r = await liquidateReal(id, mark);
      if ("error" in r) notify.error("강제청산 실패", { id: tId, description: r.error });
      else notify.warning("강제청산 완료", { id: tId, description: `손실 마진 ${Math.round(r.margin_lost ?? 0).toLocaleString()} KRW` });
      return r;
    } finally {
      setBusy(false);
    }
  }, [mode, closePaper, liquidateReal]);

  const handleCloseAll = useCallback(() => {
    if (positions.length === 0) {
      notify.info("열린 포지션이 없습니다");
      return;
    }
    if (!window.confirm(`모든 포지션(${positions.length}건)을 청산합니다.`)) return;
    positions.forEach((p) => { void handleClose(p.id, prices[p.symbol] ?? p.entry); });
  }, [positions, prices, handleClose]);

  const overlays = useMemo(() => {
    const live = positions.filter((p) => p.symbol === symbol);
    const lines: { price: number; color: string; title: string }[] = [];
    live.forEach((p) => {
      lines.push({ price: p.entry, color: p.side === "long" ? "#34d399" : "#fb7185", title: `${p.side.toUpperCase()} ${p.leverage}×` });
      if (p.liq_price) lines.push({ price: p.liq_price, color: "#ef4444", title: "LIQ" });
    });
    return lines;
  }, [positions, symbol]);

  if (!user) return null;

  return (
    <Layout>
      <HubTabs hub="earn" />
      <div
        className="container pt-3 animate-fade-in space-y-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 2.5rem)" }}
      >
        {/* Imperial 글로벌 FOMO Bar */}
        <Suspense fallback={null}><ImperialTradeFomoBar /></Suspense>

        {/* Title — 황제의 실전 트레이딩 홀 */}
        <header className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" /> 황제의 실전 트레이딩 홀
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5 tracking-wide">
              바이비트급 차트 · 25 페어 · 최대 100× · Paper ↔ Real
              <span className="hidden md:inline text-muted-foreground/60"> · Esc로 전체 청산</span>
            </p>
            <div className="mt-1.5">
              <Suspense fallback={null}><LiveTradingCounter /></Suspense>
            </div>
          </div>
          <div className="inline-flex items-center gap-2">
            <Suspense fallback={null}><CurrencyExchangeButton /></Suspense>
            <div className="inline-flex gap-1.5 glass rounded-full p-1 border border-primary/30">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black tracking-wide bg-gradient-imperial text-primary-foreground glow-imperial"
                aria-current="page"
              >
                <Flame className="w-3.5 h-3.5" /> 황제의 홀
              </button>
            </div>
          </div>
        </header>

        {/* Disclaimer banner (REAL only) */}
        {mode === "real" && <RedDisclaimerBanner />}

        {/* Account mode label + toggle (paper ↔ real) */}
        <div className="space-y-1.5">
          <div className="px-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground">
            계좌 모드 · ACCOUNT
          </div>
          <ModeToggle
            mode={mode}
            onChange={setMode}
            paperBalance={paperCredit}
            realAvailable={realAvailable}
          />
        </div>

        {/* Full-width deposit CTA when REAL balance is empty */}
        {mode === "real" && realAvailable <= 0 && (
          <NavLink
            to="/wallet?tab=deposit"
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-gradient-imperial text-primary-foreground glow-imperial press border border-primary/40"
          >
            <span className="inline-flex items-center gap-2 font-black tracking-wide text-sm">
              <WalletIcon className="w-4 h-4" /> REAL 잔액이 0입니다 · 지금 충전하세요
            </span>
            <span className="text-xs font-bold opacity-90">충전하기 →</span>
          </NavLink>
        )}


        {/* v3: big PnL + PHON advantage ribbon */}
        <Suspense fallback={null}>
          <BigPnLHeader positions={positions} prices={prices} unit={unit} />
        </Suspense>
        <Suspense fallback={null}><PhonAdvantageRibbon /></Suspense>
        <Suspense fallback={null}><PhonBettingNudge /></Suspense>
        <Suspense fallback={null}><PhonLiveSocialProof /></Suspense>
        <Suspense fallback={null}><VipTradingRoom /></Suspense>

        {/* v3: hot coins */}
        <Suspense fallback={null}>
          <HotCoinRail current={symbol} onPick={setSymbol} />
        </Suspense>

        {/* Chart + Order grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3">
          <div className="space-y-3 min-w-0">
            <ChartWithHeader
              symbol={symbol}
              setSymbol={setSymbol}
              price={price}
              stat={stat}
              overlays={overlays}
              height={420}
            />
            <Suspense fallback={null}><LeveragePresetRail /></Suspense>
            <Suspense fallback={null}><LiveSideCounter symbol={symbol} /></Suspense>
          </div>

          {/* Desktop: 사이드 컬럼에 PHON 사이드카 + KRW 패널 그대로. Mobile: 숨기고 BottomSheet로 노출 */}
          <div className="hidden lg:block space-y-3" data-mega-order-panel>
            <Suspense fallback={null}><PhonOrderPanel symbol={symbol} price={price} /></Suspense>
            <MegaOrderPanel
              mode={mode}
              symbol={symbol}
              setSymbol={setSymbol}
              price={price}
              balance={balance}
              onSubmit={handleSubmit}
              busy={busy}
            />
          </div>
          {/* Mobile: PHON 사이드카는 메인 흐름에 노출, KRW 패널은 BottomSheet */}
          <div className="lg:hidden">
            <Suspense fallback={null}><PhonOrderPanel symbol={symbol} price={price} /></Suspense>
          </div>
          <Suspense fallback={null}>
            <MobileOrderSheet>
              <MegaOrderPanel
                mode={mode}
                symbol={symbol}
                setSymbol={setSymbol}
                price={price}
                balance={balance}
                onSubmit={handleSubmit}
                busy={busy}
              />
            </MobileOrderSheet>
          </Suspense>
        </div>

        {/* PHON 열린 포지션 (실연동) */}
        <section className="space-y-2">
          <h2 className="font-display font-black text-sm tracking-widest text-amber-300/90 px-1 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
            PHON 포지션
          </h2>
          <Suspense fallback={null}><PhonPositionsList /></Suspense>
        </section>

        {/* Live positions */}
        <section className="space-y-2">
          <h2 className="font-display font-black text-sm tracking-widest text-muted-foreground px-1">
            OPEN POSITIONS
          </h2>
          <OpenPositionsLive
            positions={positions}
            prices={prices}
            busy={busy}
            onClose={handleClose}
            onLiquidate={handleLiquidate}
            onCloseAll={handleCloseAll}
            modeLabel={mode === "paper" ? "PAPER" : "REAL"}
            unit={unit}
          />
        </section>

        {/* History */}
        <section className="space-y-2">
          <h2 className="font-display font-black text-sm tracking-widest text-muted-foreground px-1">
            RECENT TRADES
          </h2>
          <TradingHistoryGold history={history} unit={unit} />
        </section>
      </div>

      {/* Global FX layers */}
      <Suspense fallback={null}><DopamineLayer /></Suspense>
      <Suspense fallback={null}><ComboStreakHUD wins={comboWins} /></Suspense>
    </Layout>
  );
}
