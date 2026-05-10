import { memo, useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Zap, Flame, ShieldCheck, Target } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARENA_SYMBOLS, MAX_LEVERAGE, type Mode } from "@/lib/trading/types";
import { applySlippage, computeSize, liquidationPrice, openFee } from "@/lib/trading/engine";
import { sfx } from "@/lib/trading/sounds";
import { unitForMode, fmtMoney, approxCross } from "@/lib/trading/currency";

export interface OrderTriggers {
  /** Take-profit ROI percent (e.g. 50 means +50% ROI). */
  tpPct?: number;
  /** Stop-loss ROI percent (positive number, e.g. 25 means -25% ROI). */
  slPct?: number;
  /** Trailing stop drawdown percent from peak ROI (e.g. 10 means trail at -10% from peak ROI). */
  trailingPct?: number;
  /** Absolute take-profit price. */
  tpPrice?: number;
  /** Absolute stop-loss price. */
  slPrice?: number;
  /** Absolute trailing offset (price units from peak). */
  trailingOffset?: number;
}

export type MarginMode = "isolated" | "cross";

interface Props {
  mode: Mode;
  symbol: string;
  setSymbol: (s: string) => void;
  price: number;
  balance: number;
  onSubmit: (args: {
    side: "long" | "short";
    leverage: number;
    margin: number;
    triggers?: OrderTriggers;
    marginMode: MarginMode;
    allocatedMargin?: number;
  }) => void;
  busy?: boolean;
}

const SL_QUICK = [10, 25, 50, 75];
const TP_QUICK = [25, 50, 100, 200];

function MegaOrderPanelImpl({ mode, symbol, setSymbol, price, balance, onSubmit, busy }: Props) {
  const unit = unitForMode(mode);
  const [leverage, setLeverage] = useState(20);
  const [margin, setMargin] = useState(unit === "KRW" ? "100000" : "100");
  const [tpPct, setTpPct] = useState<string>("");
  const [slPct, setSlPct] = useState<string>("");
  const [trailingOn, setTrailingOn] = useState(false);
  const [trailingPct, setTrailingPct] = useState<string>("10");
  // Margin mode + abs price toggles
  const [marginMode, setMarginMode] = useState<MarginMode>("isolated");
  const [tpPriceMode, setTpPriceMode] = useState<"pct" | "price">("pct");
  const [slPriceMode, setSlPriceMode] = useState<"pct" | "price">("pct");
  const [tpPrice, setTpPrice] = useState<string>("");
  const [slPrice, setSlPrice] = useState<string>("");

  useEffect(() => {
    setMargin(unit === "KRW" ? "100000" : "100");
  }, [unit]);

  const marginNum = Math.max(0, parseFloat(margin) || 0);
  const tpNum = Math.max(0, parseFloat(tpPct) || 0);
  const slNum = Math.max(0, parseFloat(slPct) || 0);
  const trailNum = Math.max(0, parseFloat(trailingPct) || 0);
  const tpPriceNum = Math.max(0, parseFloat(tpPrice) || 0);
  const slPriceNum = Math.max(0, parseFloat(slPrice) || 0);

  const setPct = (p: number) => {
    const raw = balance * p;
    const v = unit === "KRW" ? Math.floor(raw) : Math.floor(raw * 100) / 100;
    setMargin(Math.max(0, v).toString());
  };

  const longEntry = useMemo(() => price ? applySlippage("long", price, true) : 0, [price]);
  const shortEntry = useMemo(() => price ? applySlippage("short", price, true) : 0, [price]);
  const sizeLong = useMemo(() => computeSize(marginNum, leverage, longEntry), [marginNum, leverage, longEntry]);
  const sizeShort = useMemo(() => computeSize(marginNum, leverage, shortEntry), [marginNum, leverage, shortEntry]);
  const liqLong = useMemo(() => liquidationPrice("long", longEntry, leverage), [longEntry, leverage]);
  const liqShort = useMemo(() => liquidationPrice("short", shortEntry, leverage), [shortEntry, leverage]);
  const fee = useMemo(() => openFee(marginNum, leverage), [marginNum, leverage]);
  const cross = approxCross(marginNum, unit);

  // Estimated PnL preview at TP/SL (in margin units — same currency as `unit`).
  const estTpPnl = tpNum > 0 ? (marginNum * tpNum) / 100 : 0;
  const estSlPnl = slNum > 0 ? -(marginNum * slNum) / 100 : 0;

  const heat = leverage / MAX_LEVERAGE;
  const hot = heat >= 0.5;

  const buildTriggers = (): OrderTriggers | undefined => {
    const t: OrderTriggers = {};
    if (tpPriceMode === "price" && tpPriceNum > 0) t.tpPrice = tpPriceNum;
    else if (tpNum > 0) t.tpPct = tpNum;
    if (slPriceMode === "price" && slPriceNum > 0) t.slPrice = slPriceNum;
    else if (slNum > 0) t.slPct = slNum;
    if (trailingOn && trailNum > 0) t.trailingPct = trailNum;
    return Object.keys(t).length ? t : undefined;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "l" || e.key === "L") { e.preventDefault(); if (!busy) doSubmit("long"); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); if (!busy) doSubmit("short"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marginNum, leverage, price, tpNum, slNum, trailingOn, trailNum, tpPriceNum, slPriceNum, tpPriceMode, slPriceMode, marginMode]);

  const doSubmit = (side: "long" | "short") => {
    sfx.click();
    onSubmit({
      side,
      leverage,
      margin: marginNum,
      triggers: buildTriggers(),
      marginMode,
      allocatedMargin: marginMode === "isolated" ? marginNum : undefined,
    });
  };

  return (
    <section className={`relative glass-strong rounded-3xl p-4 sm:p-6 space-y-4 border ${
      mode === "real" ? "border-amber-400/40 shadow-[0_0_60px_rgba(244,180,55,0.15)]" : "border-cyan-400/30"
    }`}>
      {hot && mode === "real" && (
        <div className="absolute inset-0 rounded-3xl pointer-events-none border-2 border-red-500/40 animate-pulse" />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 relative">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${mode === "real" ? "text-amber-300" : "text-cyan-300"}`} />
          <h2 className="font-display font-black text-lg tracking-wide">MEGA ORDER</h2>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            mode === "real" ? "bg-amber-500/20 text-amber-200 border border-amber-400/40" : "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
          }`}>{mode === "real" ? "REAL" : "PAPER"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/50 bg-background/60 p-0.5 text-[10px] font-black">
            {(["isolated","cross"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarginMode(m)}
                className={`px-2 py-1 rounded-md transition ${
                  marginMode === m
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >{m === "isolated" ? "Isolated" : "Cross"}</button>
            ))}
          </div>
          <Select value={symbol} onValueChange={setSymbol}>
            <SelectTrigger className="w-32 bg-background/60"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {ARENA_SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s.replace("USDT","")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Margin */}
      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-xs text-muted-foreground">
            {marginMode === "isolated" ? "Allocated Margin (이 포지션 전용)" : "Margin"} ({unit === "KRW" ? "원화 / KRW" : "USDT"})
            <span className="ml-2 text-[10px] text-muted-foreground/70">잔액 {fmtMoney(balance, unit)}</span>
          </label>
          <div className="flex gap-1">
            {[0.25, 0.5, 0.75, 1].map((p) => (
              <button
                key={p}
                onClick={() => setPct(p)}
                className={`text-[10px] font-black px-2 py-0.5 rounded border transition press ${
                  p === 1
                    ? "border-red-500/60 bg-red-500/10 text-red-300 hover:bg-red-500/20 animate-pulse"
                    : "border-border/50 bg-background/60 hover:border-primary/50 hover:text-primary"
                }`}
              >
                {p === 1 ? "ALL-IN" : `${p * 100}%`}
              </button>
            ))}
          </div>
        </div>
        <Input
          type="number" inputMode="decimal" min={0}
          value={margin} onChange={(e) => setMargin(e.target.value)}
          className="mt-1 bg-background/60 text-lg font-mono tabular-nums font-bold"
        />
        <div className="mt-1 text-[10px] text-muted-foreground/70">
          ≈ {fmtMoney(cross.value, cross.unit, { decimals: cross.unit === "USDT" ? 2 : 0 })}
        </div>
      </div>

      {/* Leverage */}
      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-xs text-muted-foreground">Leverage</label>
          <div className={`flex items-center gap-1 text-2xl font-black tabular-nums ${hot ? "text-red-400" : "text-amber-300"}`}>
            {hot && <Flame className="w-5 h-5 animate-pulse" />} {leverage}×
          </div>
        </div>
        <Slider min={1} max={100} step={1} value={[leverage]} onValueChange={([v]) => setLeverage(v)} className="mt-3" />
        <div className="grid grid-cols-5 gap-1 mt-2">
          {[5, 10, 25, 50, 100].map((v) => (
            <button
              key={v}
              onClick={() => setLeverage(v)}
              className={`text-[10px] font-black py-1 rounded border transition press ${
                leverage === v
                  ? (v >= 50 ? "border-red-500/70 bg-red-500/15 text-red-300" : "border-amber-400/60 bg-amber-500/15 text-amber-200")
                  : "border-border/40 bg-background/60 hover:border-primary/40"
              }`}
            >{v}×</button>
          ))}
        </div>
      </div>

      {/* TP / SL / Trailing */}
      <div className="rounded-2xl border border-border/50 bg-background/30 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span className="text-xs font-black tracking-wide uppercase text-muted-foreground">TP / SL / Trailing</span>
          <span className="text-[10px] text-muted-foreground/70">ROI 기준 %</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* TP */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-emerald-300 inline-flex items-center gap-1">
                <Target className="w-3 h-3" /> Take Profit %
              </label>
              <button
                onClick={() => setTpPct("")}
                className="text-[10px] text-muted-foreground/70 hover:text-foreground"
              >clear</button>
            </div>
            <Input
              type="number" inputMode="decimal" min={0} placeholder="e.g. 50"
              value={tpPct} onChange={(e) => setTpPct(e.target.value)}
              className="mt-1 bg-background/60 font-mono tabular-nums"
            />
            <div className="grid grid-cols-4 gap-1 mt-1">
              {TP_QUICK.map((v) => (
                <button
                  key={v}
                  onClick={() => setTpPct(String(v))}
                  className={`text-[10px] font-black py-1 rounded border transition press ${
                    tpNum === v
                      ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                      : "border-border/40 bg-background/60 hover:border-emerald-400/40"
                  }`}
                >+{v}%</button>
              ))}
            </div>
          </div>

          {/* SL */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-rose-300 inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Stop Loss %
              </label>
              <button
                onClick={() => setSlPct("")}
                className="text-[10px] text-muted-foreground/70 hover:text-foreground"
              >clear</button>
            </div>
            <Input
              type="number" inputMode="decimal" min={0} placeholder="e.g. 25"
              value={slPct} onChange={(e) => setSlPct(e.target.value)}
              className="mt-1 bg-background/60 font-mono tabular-nums"
            />
            <div className="grid grid-cols-4 gap-1 mt-1">
              {SL_QUICK.map((v) => (
                <button
                  key={v}
                  onClick={() => setSlPct(String(v))}
                  className={`text-[10px] font-black py-1 rounded border transition press ${
                    slNum === v
                      ? "border-rose-400/70 bg-rose-500/15 text-rose-200"
                      : "border-border/40 bg-background/60 hover:border-rose-400/40"
                  }`}
                >-{v}%</button>
              ))}
            </div>
          </div>
        </div>

        {/* Trailing */}
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-[11px] font-bold text-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={trailingOn}
              onChange={(e) => setTrailingOn(e.target.checked)}
              className="accent-amber-400"
            />
            Trailing Stop (peak ROI에서 −%)
          </label>
          <Input
            type="number" inputMode="decimal" min={0} disabled={!trailingOn}
            value={trailingPct} onChange={(e) => setTrailingPct(e.target.value)}
            className="w-24 h-8 bg-background/60 font-mono tabular-nums text-right disabled:opacity-50"
          />
        </div>

        {/* Estimated PnL */}
        {(tpNum > 0 || slNum > 0) && marginNum > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2">
              <div className="text-[10px] text-emerald-300/80 uppercase tracking-wider">Est. TP PnL</div>
              <div className="font-mono tabular-nums font-black text-emerald-300 text-sm">
                {tpNum > 0 ? `+${fmtMoney(estTpPnl, unit, { decimals: unit === "USDT" ? 2 : 0 })}` : "—"}
              </div>
            </div>
            <div className="rounded-lg bg-rose-500/5 border border-rose-500/20 p-2">
              <div className="text-[10px] text-rose-300/80 uppercase tracking-wider">Est. SL PnL</div>
              <div className="font-mono tabular-nums font-black text-rose-300 text-sm">
                {slNum > 0 ? fmtMoney(estSlPnl, unit, { decimals: unit === "USDT" ? 2 : 0 }) : "—"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Long Liq" v={liqLong.toFixed(4)} tone="loss" />
        <Stat label="Short Liq" v={liqShort.toFixed(4)} tone="loss" />
        <Stat label="Size" v={`${sizeLong.toFixed(4)}/${sizeShort.toFixed(4)}`} />
        <Stat label={`Fee 0.1% (${unit})`} v={fmtMoney(fee, unit, { decimals: 0 })} tone="warn" />
      </div>

      {/* Big buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={busy}
          onClick={() => doSubmit("long")}
          className="h-20 text-xl font-display font-black bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-emerald-50 shadow-[0_0_40px_rgba(52,211,153,0.5)] border border-emerald-300/40 disabled:opacity-60"
        >
          <TrendingUp className="w-6 h-6 mr-2" />
          {busy ? "처리 중…" : !price ? "LONG (가격 대기)" : "LONG"}
        </Button>
        <Button
          disabled={busy}
          onClick={() => doSubmit("short")}
          className="h-20 text-xl font-display font-black bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-rose-50 shadow-[0_0_40px_rgba(244,63,94,0.5)] border border-rose-400/40 disabled:opacity-60"
        >
          <TrendingDown className="w-6 h-6 mr-2" />
          {busy ? "처리 중…" : !price ? "SHORT (가격 대기)" : "SHORT"}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/80 text-center">
        Slippage 0.06% · Insurance Fund 25% · Max 5 open · 단축키 L/S
      </p>
    </section>
  );
}

export default memo(MegaOrderPanelImpl);

function Stat({ label, v, tone }: { label: string; v: string; tone?: "loss" | "warn" }) {
  return (
    <div className="rounded-xl bg-background/40 border border-border/40 p-2">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`font-mono tabular-nums font-bold mt-0.5 text-sm ${
        tone === "loss" ? "text-rose-300" : tone === "warn" ? "text-amber-300" : "text-foreground"
      }`}>{v}</div>
    </div>
  );
}
