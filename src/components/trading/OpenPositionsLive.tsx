import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, X, Heart, Target, ShieldCheck, TrendingUp as TUp, Pencil, Check } from "lucide-react";
import type { LivePosition } from "@/lib/trading/types";
import { FEE_RATE, SLIPPAGE } from "@/lib/trading/types";
import { computePnl, computeRoi, liquidationProgress } from "@/lib/trading/engine";
import { triggerFx } from "./DopamineLayer";
import { sfx } from "@/lib/trading/sounds";
import { useTriggerStore, type PositionTriggers } from "@/lib/trading/triggers-store";
import { notify } from "@/lib/notify";
import LiquidationReplayModal, { type ReplayPayload } from "./LiquidationReplayModal";

interface CloseResult { pnl: number; roi: number; credit: number; exit: number }
interface CloseError { error: string }

interface Props {
  positions: LivePosition[];
  prices: Record<string, number>;
  busy?: boolean;
  onClose: (id: string, mark: number) => Promise<CloseResult | CloseError>;
  onLiquidate: (id: string, mark: number) => Promise<unknown>;
  onCloseAll: () => void;
  modeLabel: string;
  unit?: "USDT" | "KRW";
}

function fmtFn(unit: "USDT" | "KRW") {
  return (n: number) => unit === "KRW"
    ? `${n < 0 ? "-" : ""}₩${Math.abs(Math.floor(n)).toLocaleString()}`
    : n.toFixed(2);
}

function OpenPositionsLiveImpl({
  positions, prices, busy, onClose, onLiquidate, onCloseAll, modeLabel, unit = "USDT",
}: Props) {
  const fmt = fmtFn(unit);
  const liqLock = useRef<Set<string>>(new Set());

  // Auto-liquidate when ROI <= -0.99
  useEffect(() => {
    for (const p of positions) {
      const m = prices[p.symbol] ?? 0;
      if (!m) continue;
      const roi = computeRoi(p.side, p.entry, m, p.leverage);
      if (roi <= -0.99 && !liqLock.current.has(p.id)) {
        liqLock.current.add(p.id);
        onLiquidate(p.id, m).then(() => {
          triggerFx({ kind: "liquidate", pnl: -p.margin, roi: -1, symbol: p.symbol });
        }).catch(() => liqLock.current.delete(p.id));
      }
    }
  }, [positions, prices, onLiquidate]);

  const total = useMemo(() =>
    positions.reduce((s, p) => s + computePnl(p.side, p.entry, prices[p.symbol] ?? p.entry, p.size), 0),
  [positions, prices]);

  if (!positions.length) {
    return (
      <EmptyState
        icon={<Activity className="w-5 h-5" />}
        variant="muted"
        size="sm"
        title="열린 포지션 없음"
        description={`${modeLabel} 모드에서 LONG/SHORT으로 첫 트레이드를 시작하세요.`}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs text-muted-foreground">
          {positions.length}개 · 미실현{" "}
          <span className={`font-mono font-bold ${total >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {total >= 0 ? "+" : ""}{fmt(total)}
          </span>
          <span className="ml-1 text-[10px] opacity-70">{unit}</span>
        </div>
        <Button size="sm" variant="outline" onClick={onCloseAll} className="h-7 text-xs">
          <X className="w-3 h-3 mr-1" /> Close All
        </Button>
      </div>

      {positions.map((p) => (
        <PositionRow
          key={p.id}
          position={p}
          mark={prices[p.symbol] ?? p.entry}
          busy={!!busy}
          unit={unit}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

interface RowProps {
  position: LivePosition;
  mark: number;
  busy: boolean;
  unit: "USDT" | "KRW";
  onClose: (id: string, mark: number) => Promise<CloseResult | CloseError>;
}

function priceFromRoi(side: "long" | "short", entry: number, leverage: number, roiPct: number) {
  // change = roiPct/100 / leverage; price = entry * (1 + (side=long ? change : -change))
  if (entry <= 0 || leverage <= 0) return 0;
  const change = (roiPct / 100) / leverage;
  return side === "long" ? entry * (1 + change) : entry * (1 - change);
}

function priceToRoiPct(side: "long" | "short", entry: number, leverage: number, price: number) {
  if (entry <= 0 || leverage <= 0 || price <= 0) return 0;
  const change = side === "long" ? (price - entry) / entry : (entry - price) / entry;
  return change * leverage * 100;
}

function PositionRowImpl({ position: p, mark, busy, unit, onClose }: RowProps) {
  const fmt = fmtFn(unit);
  const pnl = computePnl(p.side, p.entry, mark, p.size);
  const roi = computeRoi(p.side, p.entry, mark, p.leverage);
  const liqPct = liquidationProgress(p.side, p.entry, mark, p.leverage);
  const nearMiss = roi <= -0.85 && roi > -0.99;
  const positive = pnl >= 0;

  const triggers = useTriggerStore((s) => s.triggers[p.id]);
  const setTrigger = useTriggerStore((s) => s.set);
  const updateTrigger = useTriggerStore((s) => s.update);
  const removeTrigger = useTriggerStore((s) => s.remove);
  const tpPrice = triggers?.tpPct ? priceFromRoi(p.side, p.entry, p.leverage, triggers.tpPct) : 0;
  const slPrice = triggers?.slPct ? priceFromRoi(p.side, p.entry, p.leverage, -triggers.slPct) : 0;

  // Distance-to-SL in % of price
  const slDistPct = slPrice > 0 ? ((mark - slPrice) / mark) * 100 : 0;

  // Inline editor state
  const [editing, setEditing] = useState(false);
  const [tpInput, setTpInput] = useState<string>(triggers?.tpPct ? String(triggers.tpPct) : "");
  const [slInput, setSlInput] = useState<string>(triggers?.slPct ? String(triggers.slPct) : "");
  const [trailInput, setTrailInput] = useState<string>(triggers?.trailingPct ? String(triggers.trailingPct) : "");
  // Optional price-mode inputs for big-exchange feel
  const [tpPriceInput, setTpPriceInput] = useState<string>(tpPrice ? tpPrice.toFixed(4) : "");
  const [slPriceInput, setSlPriceInput] = useState<string>(slPrice ? slPrice.toFixed(4) : "");

  useEffect(() => {
    // sync when triggers change externally
    setTpInput(triggers?.tpPct ? String(triggers.tpPct) : "");
    setSlInput(triggers?.slPct ? String(triggers.slPct) : "");
    setTrailInput(triggers?.trailingPct ? String(triggers.trailingPct) : "");
    setTpPriceInput(triggers?.tpPct ? priceFromRoi(p.side, p.entry, p.leverage, triggers.tpPct).toFixed(4) : "");
    setSlPriceInput(triggers?.slPct ? priceFromRoi(p.side, p.entry, p.leverage, -triggers.slPct).toFixed(4) : "");
  }, [triggers, p.side, p.entry, p.leverage]);

  const saveTriggers = () => {
    const tp = tpInput ? Math.max(0, Number(tpInput)) : undefined;
    const sl = slInput ? Math.max(0, Number(slInput)) : undefined;
    const tr = trailInput ? Math.max(0, Number(trailInput)) : undefined;
    if (!tp && !sl && !tr) {
      removeTrigger(p.id);
      notify.message("TP/SL/트레일링 모두 해제됨");
    } else {
      setTrigger(p.id, { tpPct: tp, slPct: sl, trailingPct: tr, peakRoiPct: triggers?.peakRoiPct });
      notify.success("TP/SL 저장 완료");
    }
    setEditing(false);
  };

  return (
    <div
      className={`glass rounded-2xl border p-3 sm:p-4 space-y-2 transition ${
        nearMiss ? "border-red-500/70 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse"
        : positive ? "border-emerald-500/40" : "border-border/50"
      }`}
    >
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center">
        <div className="text-sm font-black flex items-center gap-1.5 flex-wrap">
          <span>{p.symbol}</span>
          {p.margin_mode === "cross" ? (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-secondary/40 bg-secondary/10 text-secondary text-[9px] font-bold uppercase tracking-wider">
              Cross
            </span>
          ) : (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
              Iso{p.allocated_margin ? ` · ${Math.round(Number(p.allocated_margin))}u` : ""}
            </span>
          )}
        </div>
        <div className={`text-xs font-black ${p.side === "long" ? "text-emerald-400" : "text-rose-400"}`}>
          {p.side.toUpperCase()} {p.leverage}×
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="block">진입</span>
          <span className="font-mono tabular-nums text-foreground">{p.entry.toFixed(4)}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="block">현재</span>
          <span className="font-mono tabular-nums text-foreground">{mark.toFixed(4)}</span>
        </div>
        <div className={`text-sm font-mono tabular-nums font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
          {positive ? "+" : ""}{fmt(pnl)}
          <span className="block text-[10px]">{(roi * 100).toFixed(1)}%</span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm" variant="ghost" disabled={busy}
            onClick={() => { sfx.click(); setEditing((e) => !e); }}
            title="TP/SL 수정"
            className="h-8 px-2"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm" variant="outline" disabled={busy}
            onClick={async () => {
              sfx.click();
              const r = await onClose(p.id, mark);
              if ("error" in r) return;
              if (r.pnl > 0) {
                triggerFx({ kind: r.roi >= 5 ? "legendary" : "win", pnl: r.pnl, roi: r.roi, symbol: p.symbol });
              } else {
                triggerFx({ kind: "loss", pnl: r.pnl, roi: r.roi, symbol: p.symbol });
              }
            }}
          >
            청산
          </Button>
        </div>
      </div>

      <div className="relative h-1.5 rounded-full bg-background/60 overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 transition-all ${
            liqPct >= 0.85 ? "bg-red-500" : liqPct >= 0.5 ? "bg-amber-400" : "bg-emerald-400"
          }`}
          style={{ width: `${Math.min(100, liqPct * 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Liq {p.liq_price.toFixed(4)}</span>
        {nearMiss && <span className="text-red-400 font-black flex items-center gap-1"><Heart className="w-3 h-3 animate-pulse" /> NEAR LIQUIDATION</span>}
        <span>{(liqPct * 100).toFixed(1)}% to liq</span>
      </div>

      {/* SL/TP/Trailing badges (read-only quick view) */}
      {!editing && triggers && (triggers.tpPct || triggers.slPct || triggers.trailingPct) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1 border-t border-border/40">
          {triggers.tpPct ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-mono tabular-nums">
              <Target className="w-3 h-3" /> TP +{triggers.tpPct}% <span className="opacity-70">@{tpPrice.toFixed(4)}</span>
            </span>
          ) : null}
          {triggers.slPct ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-500/10 text-rose-300 font-mono tabular-nums">
              <ShieldCheck className="w-3 h-3" /> SL −{triggers.slPct}% <span className="opacity-70">@{slPrice.toFixed(4)}</span>
              {slDistPct !== 0 && <span className="opacity-60">({slDistPct >= 0 ? "+" : ""}{slDistPct.toFixed(2)}%)</span>}
            </span>
          ) : null}
          {triggers.trailingPct ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-200 font-mono tabular-nums">
              <TUp className="w-3 h-3" /> Trail −{triggers.trailingPct}%
              {triggers.peakRoiPct ? <span className="opacity-70">peak {triggers.peakRoiPct.toFixed(1)}%</span> : null}
            </span>
          ) : null}
          <button
            onClick={() => setEditing(true)}
            className="ml-auto text-[10px] text-primary/80 hover:text-primary underline"
          >
            수정
          </button>
        </div>
      )}

      {!editing && !(triggers && (triggers.tpPct || triggers.slPct || triggers.trailingPct)) && (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-[10px] text-muted-foreground hover:text-foreground underline pt-1 border-t border-border/40"
        >
          + TP / SL / 트레일링 추가
        </button>
      )}

      {/* Inline editor */}
      {editing && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="block text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                <Target className="w-3 h-3" /> TP (ROI %)
              </span>
              <Input
                type="number" inputMode="decimal" step="0.1" min="0"
                placeholder="예: 20"
                value={tpInput}
                onChange={(e) => {
                  setTpInput(e.target.value);
                  const v = Number(e.target.value);
                  setTpPriceInput(v > 0 ? priceFromRoi(p.side, p.entry, p.leverage, v).toFixed(4) : "");
                }}
                className="h-8 text-xs font-mono"
              />
              <Input
                type="number" inputMode="decimal" step="0.0001" min="0"
                placeholder="가격"
                value={tpPriceInput}
                onChange={(e) => {
                  setTpPriceInput(e.target.value);
                  const v = Number(e.target.value);
                  if (v > 0) {
                    const r = priceToRoiPct(p.side, p.entry, p.leverage, v);
                    setTpInput(r > 0 ? r.toFixed(2) : "");
                  } else setTpInput("");
                }}
                className="h-7 text-[10px] font-mono opacity-80"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] text-rose-300 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> SL (ROI %)
              </span>
              <Input
                type="number" inputMode="decimal" step="0.1" min="0"
                placeholder="예: 10"
                value={slInput}
                onChange={(e) => {
                  setSlInput(e.target.value);
                  const v = Number(e.target.value);
                  setSlPriceInput(v > 0 ? priceFromRoi(p.side, p.entry, p.leverage, -v).toFixed(4) : "");
                }}
                className="h-8 text-xs font-mono"
              />
              <Input
                type="number" inputMode="decimal" step="0.0001" min="0"
                placeholder="가격"
                value={slPriceInput}
                onChange={(e) => {
                  setSlPriceInput(e.target.value);
                  const v = Number(e.target.value);
                  if (v > 0) {
                    const r = -priceToRoiPct(p.side, p.entry, p.leverage, v);
                    setSlInput(r > 0 ? r.toFixed(2) : "");
                  } else setSlInput("");
                }}
                className="h-7 text-[10px] font-mono opacity-80"
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] text-amber-300 font-bold flex items-center gap-1">
                <TUp className="w-3 h-3" /> Trail %
              </span>
              <Input
                type="number" inputMode="decimal" step="0.1" min="0"
                placeholder="예: 5"
                value={trailInput}
                onChange={(e) => setTrailInput(e.target.value)}
                className="h-8 text-xs font-mono"
              />
              <span className="block text-[9px] text-muted-foreground/70">peak 대비 하락 %</span>
            </label>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" onClick={saveTriggers} className="h-7 text-xs flex-1">
              <Check className="w-3 h-3 mr-1" /> 저장
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => { setEditing(false); }}
              className="h-7 text-xs"
            >
              취소
            </Button>
            {triggers && (
              <Button
                size="sm" variant="outline"
                onClick={() => { removeTrigger(p.id); setEditing(false); notify.message("TP/SL 해제됨"); }}
                className="h-7 text-xs text-rose-300 border-rose-500/40 hover:bg-rose-500/10"
              >
                전체 해제
              </Button>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/70 leading-relaxed">
            ROI % 또는 가격 어느 쪽이든 입력하세요. 한 쪽을 입력하면 다른 쪽은 자동 계산됩니다. 비워두면 해당 트리거는 비활성화됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

const PositionRow = memo(PositionRowImpl, (a, b) =>
  a.position.id === b.position.id &&
  a.position.entry === b.position.entry &&
  a.position.leverage === b.position.leverage &&
  a.position.size === b.position.size &&
  a.position.liq_price === b.position.liq_price &&
  a.position.margin_mode === b.position.margin_mode &&
  a.position.allocated_margin === b.position.allocated_margin &&
  a.mark === b.mark &&
  a.busy === b.busy &&
  a.unit === b.unit &&
  a.onClose === b.onClose
);

export default memo(OpenPositionsLiveImpl);
