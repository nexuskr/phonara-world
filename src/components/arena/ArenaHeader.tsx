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
    <div className="mb-3 contain-card">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="space-y-1">
          <div className="eyebrow-imperial">실전 아레나</div>
          <h1
            data-tutorial="title"
            className="h-imperial text-2xl sm:text-3xl imperial-halfoff-text tracking-[0.18em] flex items-center gap-2"
          >
            <Crown className="w-5 h-5 text-gold" /> 비트코인 군대 전투
          </h1>
          <p className="text-[11px] text-muted-foreground">
            가격이 폐하의 군대를 전진시킵니다. 망설이는 자에게 왕좌는 없습니다.
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

      <div className="flex flex-col sm:flex-row gap-1.5 mb-2">
        {/* Mode toggle */}
        {onModeChange && (
          <div className="glass rounded-xl p-0.5 inline-flex w-full sm:w-auto">
            {(["paper", "real"] as const).map((m) => (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                disabled={disabled}
                className={`flex-1 sm:flex-none px-3 min-h-[36px] rounded-lg text-[11px] font-black tracking-wider transition-colors ${
                  mode === m ? "bg-gradient-imperial text-primary-foreground" : "text-muted-foreground"
                } disabled:opacity-50`}
              >
                {m === "paper" ? "PAPER" : "REAL"}
              </button>
            ))}
          </div>
        )}
        {/* Symbol switcher */}
        <div className="flex-1 grid grid-cols-3 gap-1.5 w-full sm:w-auto sm:flex">
          {symbols.map((s) => (
            <button
              key={s}
              onClick={() => onSymbolChange(s)}
              disabled={disabled}
              className={`min-h-[40px] rounded-xl text-xs font-black tracking-wide transition-colors truncate px-1 sm:flex-1 ${
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
