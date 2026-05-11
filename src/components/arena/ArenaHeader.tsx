import { memo } from "react";
import { Crown } from "lucide-react";

type Props = {
  symbol: string;
  price: number;
  delta1s: number;
  mode: "paper" | "real";
  onModeChange?: (m: "paper" | "real") => void;
  symbols: readonly string[];
  onSymbolChange: (s: string) => void;
  disabled?: boolean;
};

function ArenaHeaderInner({ symbol, price, delta1s, mode, onModeChange, symbols, onSymbolChange, disabled }: Props) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 data-tutorial="title" className="font-imperial text-2xl sm:text-3xl tracking-[0.18em] text-gradient-imperial flex items-center gap-2">
            <Crown className="w-5 h-5 text-gold" /> 실전 아레나
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            비트코인 가격으로 군대가 전진합니다
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

      <div className="flex gap-1.5 mb-2">
        {/* Mode toggle */}
        {onModeChange && (
          <div className="glass rounded-xl p-0.5 inline-flex">
            {(["paper", "real"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                disabled={disabled}
                className={`px-3 min-h-[36px] rounded-lg text-[11px] font-black tracking-wider transition-colors ${
                  mode === m ? "bg-gradient-imperial text-primary-foreground" : "text-muted-foreground"
                } disabled:opacity-50`}
              >
                {m === "paper" ? "PAPER" : "REAL"}
              </button>
            ))}
          </div>
        )}
        {/* Symbol switcher */}
        <div className="flex-1 flex gap-1.5">
          {symbols.map((s) => (
            <button
              key={s}
              onClick={() => onSymbolChange(s)}
              disabled={disabled}
              className={`flex-1 min-h-[40px] rounded-xl text-xs font-black tracking-wide transition-colors ${
                symbol === s ? "bg-gradient-imperial text-primary-foreground" : "glass"
              } disabled:opacity-50`}
            >
              {s.replace("USDT", "")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(ArenaHeaderInner);
