import { useEffect, useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Zap, Flame } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ARENA_SYMBOLS, MAX_LEVERAGE, type Mode } from "@/lib/trading/types";
import { applySlippage, computeSize, liquidationPrice, openFee } from "@/lib/trading/engine";
import { sfx } from "@/lib/trading/sounds";

interface Props {
  mode: Mode;
  symbol: string;
  setSymbol: (s: string) => void;
  price: number;
  balance: number;
  onSubmit: (args: { side: "long" | "short"; leverage: number; margin: number }) => void;
  busy?: boolean;
}

export default function MegaOrderPanel({ mode, symbol, setSymbol, price, balance, onSubmit, busy }: Props) {
  const [leverage, setLeverage] = useState(20);
  const [margin, setMargin] = useState("100");

  const marginNum = Math.max(0, parseFloat(margin) || 0);
  const setPct = (p: number) => setMargin(Math.max(0, Math.floor(balance * p * 100) / 100).toString());

  const longEntry = useMemo(() => price ? applySlippage("long", price, true) : 0, [price]);
  const shortEntry = useMemo(() => price ? applySlippage("short", price, true) : 0, [price]);
  const sizeLong = useMemo(() => computeSize(marginNum, leverage, longEntry), [marginNum, leverage, longEntry]);
  const sizeShort = useMemo(() => computeSize(marginNum, leverage, shortEntry), [marginNum, leverage, shortEntry]);
  const liqLong = useMemo(() => liquidationPrice("long", longEntry, leverage), [longEntry, leverage]);
  const liqShort = useMemo(() => liquidationPrice("short", shortEntry, leverage), [shortEntry, leverage]);
  const fee = useMemo(() => openFee(marginNum, leverage), [marginNum, leverage]);

  const heat = leverage / MAX_LEVERAGE; // 0..1
  const hot = heat >= 0.5;

  // Hotkeys
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
  }, [marginNum, leverage, price]);

  const doSubmit = (side: "long" | "short") => {
    sfx.click();
    onSubmit({ side, leverage, margin: marginNum });
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
        <Select value={symbol} onValueChange={setSymbol}>
          <SelectTrigger className="w-40 bg-background/60"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72">
            {ARENA_SYMBOLS.map((s) => <SelectItem key={s} value={s}>{s.replace("USDT","")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Margin */}
      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-xs text-muted-foreground">Margin (USDT)</label>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Stat label="Long Liq" v={liqLong.toFixed(4)} tone="loss" />
        <Stat label="Short Liq" v={liqShort.toFixed(4)} tone="loss" />
        <Stat label="Size" v={`${sizeLong.toFixed(4)}/${sizeShort.toFixed(4)}`} />
        <Stat label="Fee 0.1%" v={fee.toLocaleString()} tone="warn" />
      </div>

      {/* Big buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={busy || !price}
          onClick={() => doSubmit("long")}
          className="h-20 text-xl font-display font-black bg-gradient-to-b from-emerald-400 to-emerald-600 hover:from-emerald-300 hover:to-emerald-500 text-emerald-50 shadow-[0_0_40px_rgba(52,211,153,0.5)] border border-emerald-300/40"
        >
          <TrendingUp className="w-6 h-6 mr-2" />
          LONG
        </Button>
        <Button
          disabled={busy || !price}
          onClick={() => doSubmit("short")}
          className="h-20 text-xl font-display font-black bg-gradient-to-b from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 text-rose-50 shadow-[0_0_40px_rgba(244,63,94,0.5)] border border-rose-400/40"
        >
          <TrendingDown className="w-6 h-6 mr-2" />
          SHORT
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground/80 text-center">
        Slippage 0.06% · Insurance Fund 25% · Max 5 open · 단축키 L/S
      </p>
    </section>
  );
}

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
