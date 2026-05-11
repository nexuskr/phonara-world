import { useEffect, useSyncExternalStore, useState, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { priceStore } from "@/lib/trading/priceStore";
import { battleStore, useBattleStore } from "@/lib/trading/battleStore";
import { mapPnlToArmy, IDLE_ARMY } from "@/lib/trading/armyMapping";
import ArmyRenderer from "@/components/arena/ArmyRenderer";
import ArenaTutorialOverlay from "@/components/empire/ArenaTutorialOverlay";
import ArenaHeader from "@/components/arena/ArenaHeader";
import LongShortBetPanel from "@/components/arena/LongShortBetPanel";
import ArmyHUD from "@/components/arena/ArmyHUD";

const BattleResultOverlay = lazy(() => import("@/components/arena/BattleResultOverlay"));

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;

function usePriceStore() {
  return useSyncExternalStore(priceStore.subscribe, priceStore.getSnapshot, priceStore.getSnapshot);
}

function useDelta1s(symbol: string, currentPrice: number) {
  const histRef = useRef<{ p: number; t: number }[]>([]);
  const [delta, setDelta] = useState(0);
  useEffect(() => {
    if (!currentPrice) return;
    const now = Date.now();
    histRef.current.push({ p: currentPrice, t: now });
    histRef.current = histRef.current.filter((h) => now - h.t < 1500);
    const oldest = histRef.current[0];
    if (oldest && oldest.p > 0) {
      setDelta(((currentPrice - oldest.p) / oldest.p) * 100);
    }
  }, [currentPrice, symbol]);
  return delta;
}

export default function TradingArenaWithArmy() {
  const user = useRequireAuth();
  const [symbol, setSymbol] = useState<typeof SYMBOLS[number]>("BTCUSDT");
  const [size, setSize] = useState(100);
  const [mode, setMode] = useState<"paper" | "real">("paper");
  const { prices } = usePriceStore();
  const price = prices[symbol] ?? 0;
  const delta1s = useDelta1s(symbol, price);
  const battle = useBattleStore();
  const [showResult, setShowResult] = useState(false);

  // PnL update loop
  useEffect(() => {
    if (battle.phase !== "fighting" || !battle.entryPrice || !price) return;
    const dir = battle.side === "long" ? 1 : -1;
    const pnlPct = ((price - battle.entryPrice) / battle.entryPrice) * 100 * dir;
    battleStore.updatePnl(pnlPct);
  }, [price, battle.phase, battle.entryPrice, battle.side]);

  // Auto-end after 60s if not resolved → near_miss
  useEffect(() => {
    if (battle.phase !== "fighting") return;
    const timeout = setTimeout(() => {
      if (battleStore.getSnapshot().phase === "fighting") {
        battleStore.resolve("near_miss");
      }
    }, 60_000);
    return () => clearTimeout(timeout);
  }, [battle.startedAt, battle.phase]);

  // Show result overlay & record battle
  useEffect(() => {
    if (battle.phase !== "result" || !battle.side) return;
    setShowResult(true);
    const result = battle.result === "win" ? "win" : battle.result === "loss" ? "loss" : "near_miss";
    const pnlKRW = Math.floor(battle.size * 1300 * (battle.pnlPct / 100));
    void supabase.rpc("record_empire_battle" as any, {
      _side: battle.side, _result: result, _pnl: pnlKRW, _mode: mode,
    });
    if (result === "win") notify.success("⚔️ 승리", { description: `${battle.pnlPct.toFixed(3)}%` });
    else if (result === "near_miss") notify.warning("⚠️ 적장 도주", { description: "Recovery 발동 가능" });
    else notify.info("📉 전투 종료");
  }, [battle.phase, battle.result, battle.side, battle.size, battle.pnlPct, mode]);

  const army = useMemo(() => {
    if (battle.phase !== "fighting" && battle.phase !== "result") return IDLE_ARMY;
    return mapPnlToArmy({
      side: battle.side ?? "long",
      pnlPct: battle.pnlPct,
      delta1s,
      tpPct: battle.tpPct,
      slPct: battle.slPct,
    });
  }, [battle, delta1s]);

  const placeBet = useCallback((side: "long" | "short") => {
    if (!price) { notify.warning("가격 수신 대기 중"); return; }
    if (battle.phase === "fighting") { notify.info("전투 중"); return; }
    if (mode === "real") {
      notify.info("🔥 실전 모드", { description: "/trade 페이지에서 실거래로 진입하세요" });
      return;
    }
    battleStore.start({ side, symbol, size, entryPrice: price, tpPct: 1.0, slPct: 0.6 });
    notify.info(side === "long" ? "📈 Conquest 시작" : "📉 Raid 시작", {
      description: `${symbol} @ ${price.toFixed(2)} · ${size} USDT`,
    });
  }, [price, symbol, size, battle.phase, mode]);

  const resetBattle = useCallback(() => {
    battleStore.reset();
    setShowResult(false);
  }, []);

  const triggerRecovery = useCallback(() => {
    setShowResult(false);
    // Recovery: half-size bet in the same direction with tighter TP
    const side = battle.side ?? "long";
    battleStore.reset();
    setTimeout(() => {
      battleStore.start({
        side, symbol, size: Math.max(25, Math.floor(size / 2)),
        entryPrice: price || battle.entryPrice, tpPct: 0.6, slPct: 0.4,
      });
      notify.success("✨ Recovery 발동", { description: "절반 사이즈 · TP +0.6%" });
    }, 200);
  }, [battle.side, battle.entryPrice, symbol, size, price]);

  if (!user) return null;

  const fighting = battle.phase === "fighting";

  return (
    <Layout>
      <HubTabs hub="empire" />
      <ArenaTutorialOverlay />
      <div className="container pt-4 pb-10 animate-fade-in">
        <ArenaHeader
          symbol={symbol}
          price={price}
          delta1s={delta1s}
          mode={mode}
          onModeChange={setMode}
          symbols={SYMBOLS}
          onSymbolChange={(s) => setSymbol(s as typeof SYMBOLS[number])}
          disabled={fighting}
        />

        {/* Army battlefield */}
        <div data-tutorial="army" className="glass-strong neon-border rounded-2xl overflow-hidden mb-3 relative">
          <ArmyRenderer side={battle.side ?? "long"} state={army} />
          {fighting && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/70 backdrop-blur text-[10px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              교전중
            </div>
          )}
        </div>

        {/* HUD */}
        <div className="mb-3">
          <ArmyHUD side={battle.side ?? "long"} state={army} pnlPct={battle.pnlPct} phase={battle.phase} />
        </div>

        <LongShortBetPanel
          size={size}
          onSize={setSize}
          onBet={placeBet}
          tpPct={battle.tpPct}
          slPct={battle.slPct}
          disabled={fighting}
        />

        <p className="text-center text-[10px] text-muted-foreground mt-3">
          {mode === "paper"
            ? "⚠️ Paper 모드 — 실제 자금 손실 없음."
            : "🔥 Real 모드 — /trade 에서 실거래 진입."}
        </p>
      </div>

      <Suspense fallback={null}>
        <BattleResultOverlay
          open={showResult}
          result={battle.result}
          side={battle.side}
          pnlPct={battle.pnlPct}
          size={battle.size}
          entryPrice={battle.entryPrice}
          onClose={resetBattle}
          onRecovery={battle.result === "near_miss" ? triggerRecovery : undefined}
        />
      </Suspense>
    </Layout>
  );
}
