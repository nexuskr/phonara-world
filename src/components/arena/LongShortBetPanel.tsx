import { memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  size: number;
  onSize: (v: number) => void;
  onBet: (side: "long" | "short") => void;
  tpPct: number;
  slPct: number;
  disabled?: boolean;
  presets?: number[];
};

function LongShortBetPanelInner({
  size, onSize, onBet, tpPct, slPct, disabled, presets = [50, 100, 200, 500],
}: Props) {
  return (
    <>
      {/* Bet size */}
      <div className="glass rounded-2xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold text-muted-foreground tracking-widest">베팅 사이즈</span>
          <span className="font-display font-black tabular-nums text-base">{size} USDT</span>
        </div>
        <div className="flex gap-1.5">
          {presets.map((v) => (
            <button
              key={v}
              onClick={() => onSize(v)}
              disabled={disabled}
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
          onClick={() => onBet("long")}
          disabled={disabled}
          className="press sheen min-h-[80px] rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border-2 border-emerald-500/50 hover:border-emerald-400 disabled:opacity-50 flex flex-col items-center justify-center gap-1"
        >
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          <div className="font-display font-black text-base">📈 오른다</div>
          <div className="text-[10px] text-emerald-300/80 font-bold">Conquest · 영토 정복</div>
        </button>
        <button
          onClick={() => onBet("short")}
          disabled={disabled}
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
          <span className="text-emerald-400 font-bold">TP</span> +{tpPct}% · 자동 승리
        </div>
        <div className="glass rounded-lg p-2 text-center">
          <span className="text-rose-400 font-bold">SL</span> -{slPct}% · 자동 종료
        </div>
      </div>
    </>
  );
}

export default memo(LongShortBetPanelInner);
