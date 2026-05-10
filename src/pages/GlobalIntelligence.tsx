import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "@/components/Layout";
import RedDisclaimerBanner from "@/components/trading/RedDisclaimerBanner";
import ModeToggle from "@/components/trading/ModeToggle";
import ChartWithHeader from "@/components/trading/ChartWithHeader";
import MegaOrderPanel from "@/components/trading/MegaOrderPanel";
import type { OrderTriggers } from "@/components/trading/MegaOrderPanel";
import OpenPositionsLive from "@/components/trading/OpenPositionsLive";
import TradingHistoryGold from "@/components/trading/TradingHistoryGold";
import ComboStreakHUD from "@/components/trading/ComboStreakHUD";
import DopamineLayer, { triggerFx } from "@/components/trading/DopamineLayer";
import TotalPnLHeader from "@/components/trading/TotalPnLHeader";
import { useTriggerStore } from "@/lib/trading/triggers-store";
import { usePositionTriggerWatcher } from "@/hooks/use-position-trigger-watcher";
import LiveCounterRow from "@/components/intelligence/LiveCounterRow";
import DecisionCoreCard from "@/components/intelligence/DecisionCoreCard";
import EquityCurveCard from "@/components/intelligence/EquityCurveCard";
import AchievementShowcase from "@/components/intelligence/AchievementShowcase";
import WeeklyLeaderboard from "@/components/intelligence/WeeklyLeaderboard";
import PersonalMemoryPanel from "@/components/intelligence/PersonalMemoryPanel";
import GlobalContributionBar from "@/components/intelligence/GlobalContributionBar";
import WinMomentOverlay, { pushWinMoment } from "@/components/intelligence/WinMomentOverlay";
import Disclaimer from "@/components/Disclaimer";
import LazyMount from "@/components/util/LazyMount";
import { Button } from "@/components/ui/button";
import { useBybitTicker } from "@/hooks/use-bybit-ticker";
import { useSession, useWallet } from "@/hooks/use-wallet";
import { usePaperStore } from "@/lib/paper-trading/store";
import { celebrateWin, levelFromPnl, playLossThud } from "@/lib/paper-trading/celebrate";
import { usePaperLiquidationWatcher } from "@/hooks/use-paper-positions";
import { useRealStore } from "@/lib/trading/real-store";
import { applySlippage, computeSize as engSize, liquidationPrice as engLiq } from "@/lib/trading/engine";
import { notify } from "@/lib/notify";
import { useTrackView, track } from "@/lib/telemetry";
import type { Mode } from "@/lib/trading/types";
import type { LivePosition } from "@/lib/trading/types";

export default function GlobalIntelligence() {
  useTrackView("global_intel_view");
  usePaperLiquidationWatcher();

  const { session } = useSession();
  const userId = session?.user?.id;
  const { wallet } = useWallet(userId);

  const { prices, stats, status } = useBybitTicker();
  const [mode, setMode] = useState<Mode>("paper");
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  const [busy, setBusy] = useState(false);

  // Paper store
  const paperCredit = usePaperStore((s) => s.paperCredit);
  const paperPositions = usePaperStore((s) => s.positions);
  const paperHistory = usePaperStore((s) => s.history);
  const paperOpen = usePaperStore((s) => s.open);
  const paperClose = usePaperStore((s) => s.close);
  const paperReset = usePaperStore((s) => s.resetCredit);
  const paperCombo = usePaperStore((s) => s.comboWins);

  // Real store
  const realLoad = useRealStore((s) => s.load);
  const realSubscribe = useRealStore((s) => s.subscribe);
  const realPositions = useRealStore((s) => s.positions);
  const realHistory = useRealStore((s) => s.history);
  const realOpen = useRealStore((s) => s.open);
  const realClose = useRealStore((s) => s.close);
  const realLiquidate = useRealStore((s) => s.liquidate);
  const realCombo = useRealStore((s) => s.comboWins);

  useEffect(() => { document.title = "Trading Arena · Phonara"; }, []);
  useEffect(() => { if (userId) realLoad(); }, [userId, realLoad]);
  useEffect(() => { if (userId) return realSubscribe(userId); }, [userId, realSubscribe]);

  const price = prices[symbol] ?? 0;
  const realAvailable = wallet?.available_balance ?? 0;
  const balance = mode === "real" ? realAvailable : paperCredit;

  // Convert paper positions to LivePosition shape for the unified component
  const positionsAsLive: LivePosition[] = useMemo(() => {
    if (mode === "real") return realPositions;
    return paperPositions.map((p) => ({
      id: p.id, user_id: userId ?? "paper", symbol: p.symbol, side: p.side,
      leverage: p.leverage, margin: p.margin,
      size: engSize(p.margin, p.leverage, p.entry),
      entry: p.entry,
      liq_price: engLiq(p.side, p.entry, p.leverage),
      fee_open: 0, status: "open", opened_at: new Date(p.openedAt).toISOString(),
    }));
  }, [mode, realPositions, paperPositions, userId]);

  const overlays = useMemo(() => {
    const list: { price: number; color: string; title: string }[] = [];
    for (const p of positionsAsLive) {
      if (p.symbol !== symbol) continue;
      list.push({ price: p.entry, color: p.side === "long" ? "#34d399" : "#fb7185", title: `${p.side.toUpperCase()} ${p.leverage}× E` });
      list.push({ price: p.liq_price, color: "#ef4444", title: "LIQ" });
    }
    return list;
  }, [positionsAsLive, symbol]);

  const setTrigger = useTriggerStore((s) => s.set);

  // Submit handler
  const submit = useCallback(async ({ side, leverage, margin, triggers }: { side: "long"|"short"; leverage: number; margin: number; triggers?: OrderTriggers }) => {
    if (!price) return notify.error("가격을 불러오는 중입니다.");
    if (margin <= 0) return notify.error("Margin을 입력하세요.");

    if (mode === "paper") {
      if (margin > paperCredit) return notify.error("Paper Credit이 부족합니다.");
      const entry = applySlippage(side, price, true);
      const pos = paperOpen({ symbol, side, leverage, margin, entry });
      if (!pos) return notify.error("주문을 열 수 없습니다.");
      if (triggers) setTrigger(pos.id, { ...triggers, peakRoiPct: 0 });
      notify.success(`${side === "long" ? "Long" : "Short"} 진입 (Paper)`, {
        description: `${symbol} ${leverage}× · ${margin} USDT`,
      });
      track("cta_click", { surface: "paper_trade", variant: side, meta: { symbol, leverage, margin } });
      return;
    }

    if (!userId) return notify.error("로그인이 필요합니다.");
    if (margin > realAvailable) return notify.error("Empire Balance가 부족합니다.");
    setBusy(true);
    try {
      const r = await realOpen({
        symbol, side, leverage, margin: Math.floor(margin), mark: price,
        tpPct: triggers?.tpPct, slPct: triggers?.slPct, trailingPct: triggers?.trailingPct,
      });
      if ("error" in r) return notify.error(r.error);
      if (triggers && "id" in r && typeof (r as any).id === "string") setTrigger((r as any).id, { ...triggers, peakRoiPct: 0 });
      notify.success(`${side === "long" ? "LONG" : "SHORT"} 진입 (REAL)`, {
        description: `${symbol} ${leverage}× · ${margin.toLocaleString()} USDT`,
      });
      track("cta_click", { surface: "real_trade", variant: side, meta: { symbol, leverage, margin } });
    } finally { setBusy(false); }
  }, [mode, price, paperCredit, paperOpen, symbol, userId, realAvailable, realOpen, setTrigger]);

  // Close (paper or real)
  const closePos = useCallback(async (id: string, mark: number) => {
    if (mode === "real") {
      setBusy(true);
      try {
        const r = await realClose(id, mark);
        if ("error" in r) { notify.error(r.error); return r; }
        return r;
      } finally { setBusy(false); }
    }
    const closed = paperClose(id, mark, "manual");
    const cp = closed?.closed;
    if (!cp) return { error: "fail" };
    if (cp.pnl > 0) {
      const lvl = levelFromPnl(cp.pnl); celebrateWin(lvl);
      pushWinMoment({ id, pnl: cp.pnl, roi: cp.roi, symbol: closed!.symbol, side: closed!.side, leverage: closed!.leverage, level: lvl });
    } else {
      playLossThud();
    }
    return { pnl: cp.pnl, roi: cp.roi, exit: mark, credit: closed!.margin + cp.pnl };
  }, [mode, realClose, paperClose]);

  const liquidatePos = useCallback(async (id: string, mark: number) => {
    if (mode === "real") return realLiquidate(id, mark);
    return null;
  }, [mode, realLiquidate]);

  const closeAll = useCallback(async () => {
    let total = 0;
    for (const p of [...positionsAsLive]) {
      const m = prices[p.symbol] ?? p.entry;
      const r = await closePos(p.id, m);
      if (r && !("error" in r)) total += r.pnl;
    }
    if (total > 0) triggerFx({ kind: total >= 5000 ? "legendary" : "win", pnl: total, roi: 0 });
    else if (total < 0) triggerFx({ kind: "loss", pnl: total, roi: 0 });
    notify.message(`전체 청산: ${total >= 0 ? "+" : ""}${total.toFixed(2)} USDT`);
  }, [positionsAsLive, prices, closePos]);

  const history = mode === "real" ? realHistory : paperHistory.map((p) => ({
    id: p.id, user_id: userId ?? "paper", symbol: p.symbol, side: p.side,
    leverage: p.leverage, margin: p.margin, size: engSize(p.margin, p.leverage, p.entry),
    entry: p.entry, close_price: p.closed?.price ?? 0,
    pnl: p.closed?.pnl ?? 0, roi: p.closed?.roi ?? 0,
    fee_open: 0, fee_close: 0,
    reason: p.closed?.reason === "liquidation" ? "liquidation" : "manual",
    opened_at: new Date(p.openedAt).toISOString(),
    closed_at: new Date(p.closed?.at ?? p.openedAt).toISOString(),
  } as any));

  const combo = mode === "real" ? realCombo : paperCombo;

  // Client-side SL/TP/Trailing enforcement (works for both Paper & Real).
  usePositionTriggerWatcher({
    positions: positionsAsLive,
    prices,
    onClose: (id, mark) => closePos(id, mark),
  });

  return (
    <>
      <Layout>
        <RedDisclaimerBanner />
        <div className="container py-4 sm:py-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Home
              </Link>
              <h1 className="font-display font-black text-2xl sm:text-3xl mt-1">
                <span className="text-gradient-imperial">PHONARA</span> · TRADING ARENA
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Bybit Live Feed · {status === "open" ? <span className="text-emerald-400">● LIVE</span> : <span className="text-amber-400">● {status}</span>}
                {" · "}25 Pairs · 100× Max
              </p>
            </div>
            <ComboStreakHUD wins={combo} />
          </div>

          <ModeToggle
            mode={mode}
            onChange={setMode}
            paperBalance={paperCredit}
            realAvailable={realAvailable}
          />

          <LiveCounterRow />
          <DecisionCoreCard onPick={(o) => { if (o.symbol) setSymbol(o.symbol); }} />

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="lg:col-span-2">
              <TotalPnLHeader positions={positionsAsLive} prices={prices} unit={mode === "real" ? "KRW" : "USDT"} />
            </div>
            <div className="lg:col-span-2">
              <ChartWithHeader symbol={symbol} setSymbol={setSymbol} price={price} stat={stats[symbol]} overlays={overlays} height={380} />
            </div>
            <div className="lg:col-span-2">
              <MegaOrderPanel
                mode={mode}
                symbol={symbol}
                setSymbol={setSymbol}
                price={price}
                balance={balance}
                onSubmit={submit}
                busy={busy}
              />
            </div>
            <div className="lg:col-span-2">
              <h2 className="font-display font-bold text-base mb-2">Open Positions ({mode === "real" ? "REAL" : "PAPER"})</h2>
              <OpenPositionsLive
                positions={positionsAsLive}
                prices={prices}
                busy={busy}
                onClose={closePos}
                onLiquidate={liquidatePos as any}
                onCloseAll={closeAll}
                modeLabel={mode === "real" ? "REAL" : "PAPER"}
                unit={mode === "real" ? "KRW" : "USDT"}
              />
            </div>
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-display font-bold text-base">Trade History</h2>
                {mode === "paper" && (
                  <Button size="sm" variant="outline" onClick={() => paperReset()} className="h-7 text-xs">
                    Paper 리셋 (10,000 USDT)
                  </Button>
                )}
              </div>
              <TradingHistoryGold history={history} unit={mode === "real" ? "KRW" : "USDT"} />
            </div>
            <div className="lg:col-span-2"><LazyMount minHeight={200}><EquityCurveCard /></LazyMount></div>
            <div className="lg:col-span-2"><LazyMount minHeight={200}><AchievementShowcase /></LazyMount></div>
            <LazyMount minHeight={200}><WeeklyLeaderboard /></LazyMount>
            <LazyMount minHeight={200}><PersonalMemoryPanel /></LazyMount>
            <LazyMount minHeight={120}><GlobalContributionBar /></LazyMount>
          </div>

          <Disclaimer />
        </div>
        <WinMomentOverlay />
        <DopamineLayer />
      </Layout>
    </>
  );
}
