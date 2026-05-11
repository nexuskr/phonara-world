import { useEffect, useSyncExternalStore, useState, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, TrendingUp, TrendingDown, Sword, Shield, Trophy, Flame, Zap, X } from "lucide-react";
import Layout from "@/components/Layout";
import HubTabs from "@/components/HubTabs";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { supabase } from "@/integrations/supabase/client";
import { notify } from "@/lib/notify";
import { formatKRW } from "@/lib/store";
import { priceStore } from "@/lib/trading/priceStore";
import { battleStore, useBattleStore } from "@/lib/trading/battleStore";
import { mapPnlToArmy, IDLE_ARMY } from "@/lib/trading/armyMapping";
import ArmyRenderer from "@/components/arena/ArmyRenderer";
import ArenaTutorialOverlay from "@/components/empire/ArenaTutorialOverlay";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"] as const;

function usePriceStore() {
  return useSyncExternalStore(priceStore.subscribe, priceStore.getSnapshot, priceStore.getSnapshot);
}

/** Δ1s tracker — keeps last 1s price for delta% computation */
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
  const [mode] = useState<"paper">("paper"); // Real mode wired via separate page
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
      _side: battle.side, _result: result, _pnl: pnlKRW, _mode: "paper",
    });
    if (result === "win") {
      notify.success("⚔️ 승리", { description: `+${formatKRW(pnlKRW)}` });
    } else if (result === "near_miss") {
      notify.warning("⚠️ 적장 도주", { description: "30초 안에 Recovery Bonus 발동" });
    } else {
      notify.info("📉 전투 종료", { description: formatKRW(pnlKRW) });
    }
  }, [battle.phase, battle.result]);

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
    battleStore.start({ side, symbol, size, entryPrice: price, tpPct: 1.0, slPct: 0.6 });
    notify.info(side === "long" ? "📈 Conquest 시작" : "📉 Raid 시작", {
      description: `${symbol} @ ${price.toFixed(2)} · ${size} USDT`,
    });
  }, [price, symbol, size, battle.phase]);

  const resetBattle = useCallback(() => {
    battleStore.reset();
    setShowResult(false);
  }, []);

  if (!user) return null;

  return (
    <Layout>
      <HubTabs hub="empire" />
      <ArenaTutorialOverlay />
      <div className="container pt-4 pb-10 animate-fade-in">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 data-tutorial="title" className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" /> 실전 아레나
            </h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              비트코인 가격으로 군대가 전진합니다 · Paper 모드
            </p>
          </div>
          <div data-tutorial="price" className="glass rounded-xl px-3 py-2 text-right">
            <div className="text-[9px] text-muted-foreground font-bold tracking-widest">{symbol} LIVE</div>
            <div className="font-mono tabular-nums font-black text-sm">
              ${price ? price.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "..."}
            </div>
            <div className={`text-[9px] tabular-nums font-bold ${delta1s >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {delta1s >= 0 ? "▲" : "▼"} {Math.abs(delta1s).toFixed(3)}%
            </div>
          </div>
        </div>

        {/* Symbol switcher */}
        <div className="flex gap-1.5 mb-3">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              disabled={battle.phase === "fighting"}
              className={`flex-1 min-h-[40px] rounded-xl text-xs font-black tracking-wide transition-colors ${
                symbol === s ? "bg-gradient-imperial text-primary-foreground" : "glass"
              } disabled:opacity-50`}
            >
              {s.replace("USDT", "")}
            </button>
          ))}
        </div>

        {/* Army battlefield */}
        <div data-tutorial="army" className="glass-strong neon-border rounded-2xl overflow-hidden mb-3 relative">
          <ArmyRenderer side={battle.side ?? "long"} state={army} />
          {battle.phase === "fighting" && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-background/70 backdrop-blur text-[10px] font-black">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
              교전중 · PnL <span className={battle.pnlPct >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {battle.pnlPct >= 0 ? "+" : ""}{battle.pnlPct.toFixed(3)}%
              </span>
            </div>
          )}
        </div>

        {/* Bet size */}
        <div className="glass rounded-2xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted-foreground tracking-widest">베팅 사이즈</span>
            <span className="font-display font-black tabular-nums text-base">{size} USDT</span>
          </div>
          <div className="flex gap-1.5">
            {[50, 100, 200, 500].map((v) => (
              <button
                key={v}
                onClick={() => setSize(v)}
                disabled={battle.phase === "fighting"}
                className={`flex-1 min-h-[36px] rounded-lg text-xs font-bold transition-colors ${
                  size === v ? "bg-primary text-primary-foreground" : "glass-strong"
                } disabled:opacity-50`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Long/Short buttons */}
        <div data-tutorial="bet" className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={() => placeBet("long")}
            disabled={battle.phase === "fighting"}
            className="press sheen min-h-[80px] rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-2 border-emerald-500/50 hover:border-emerald-400 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
          >
            <TrendingUp className="w-6 h-6 text-emerald-400" />
            <div className="font-display font-black text-base">📈 오른다</div>
            <div className="text-[10px] text-emerald-300/80 font-bold">Conquest · 영토 정복</div>
          </button>
          <button
            onClick={() => placeBet("short")}
            disabled={battle.phase === "fighting"}
            className="press sheen min-h-[80px] rounded-2xl bg-gradient-to-br from-rose-500/30 to-rose-600/20 border-2 border-rose-500/50 hover:border-rose-400 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
          >
            <TrendingDown className="w-6 h-6 text-rose-400" />
            <div className="font-display font-black text-base">📉 내린다</div>
            <div className="text-[10px] text-rose-300/80 font-bold">Raid · 적국 약탈</div>
          </button>
        </div>

        {/* TP/SL hint */}
        <div className="grid grid-cols-2 gap-2 mb-2 text-[10px] text-muted-foreground">
          <div className="glass rounded-lg p-2 text-center">
            <span className="text-emerald-400 font-bold">TP</span> +{battle.tpPct}% · 자동 승리
          </div>
          <div className="glass rounded-lg p-2 text-center">
            <span className="text-rose-400 font-bold">SL</span> -{battle.slPct}% · 자동 종료
          </div>
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-3">
          ⚠️ Paper 모드 — 실제 자금 손실 없음. 실전 트레이딩은 별도 페이지.
        </p>
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {showResult && battle.result && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-background/85 backdrop-blur-sm flex items-center justify-center p-5"
            onClick={resetBattle}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass-strong neon-border rounded-3xl p-6 max-w-sm w-full text-center"
            >
              <button onClick={resetBattle} className="absolute top-3 right-3 w-8 h-8 rounded-full glass flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
              <div className="text-6xl mb-3">
                {battle.result === "win" ? "🏆" : battle.result === "near_miss" ? "⚠️" : "💀"}
              </div>
              <h3 className="font-imperial text-2xl mb-2">
                {battle.result === "win"
                  ? `${battle.side === "long" ? "Conquest" : "Raid"} 승리`
                  : battle.result === "near_miss"
                  ? "적장 도주 — Near Miss"
                  : "전투 종료"}
              </h3>
              <div className="text-3xl font-display font-black tabular-nums my-3">
                <span className={battle.pnlPct >= 0 ? "text-money-strong" : "text-rose-400"}>
                  {battle.pnlPct >= 0 ? "+" : ""}{battle.pnlPct.toFixed(3)}%
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {battle.size} USDT · 진입 ${battle.entryPrice.toFixed(2)}
              </p>
              <button
                onClick={resetBattle}
                className="press w-full min-h-[52px] rounded-xl bg-gradient-primary text-primary-foreground font-display font-black"
              >
                다시 출진
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
