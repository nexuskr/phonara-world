/**
 * ImperialAutoBetPanel — 황제의 자동 정복.
 *
 * 3 프리셋(안전한 확장 / 영광의 역전 / 황제의 광기) + PHON 20% 할인 Ribbon.
 * 실행 자체는 부모 onStart(preset) 이 처리.
 */
import { useState } from "react";
import { Crown, Repeat, Sparkles, X } from "lucide-react";
import { AUTO_BET_PRESETS, IMPERIAL_BET_COPY, type AutoBetPreset } from "./imperialCopy";

interface Props {
  active: boolean;
  /** Running profit/loss since auto-bet started (PHON) */
  runningPnl?: number;
  onStart: (preset: AutoBetPreset) => void;
  onStop: () => void;
  /** Show PHON 20% discount ribbon (when betting in PHON mode) */
  showPhonDiscount?: boolean;
}

export default function ImperialAutoBetPanel({
  active,
  runningPnl = 0,
  onStart,
  onStop,
  showPhonDiscount,
}: Props) {
  const [selected, setSelected] = useState<AutoBetPreset["id"]>("safe");
  const preset = AUTO_BET_PRESETS.find((p) => p.id === selected)!;

  if (active) {
    return (
      <div className="rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/15 to-amber-400/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-200">
            <Repeat className="w-4 h-4 animate-spin" />
            <span className="text-[11px] font-black tracking-[0.22em]">자동 정복 작동중</span>
          </div>
          <button
            type="button"
            onClick={onStop}
            className="px-3 py-1.5 rounded-lg border border-rose-400/50 text-rose-200 font-black text-[11px] press flex items-center gap-1"
          >
            <X className="w-3 h-3" /> 정지
          </button>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">현재 확보</div>
          <div
            className={`font-display font-black text-2xl tabular-nums ${
              runningPnl >= 0 ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {runningPnl >= 0 ? "+" : ""}
            {Math.floor(runningPnl).toLocaleString("ko-KR")} PHON
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-300/40 bg-card/60 p-4 space-y-3">
      <div className="flex items-center gap-1.5 text-amber-300">
        <Crown className="w-4 h-4" />
        <span className="text-[11px] font-black tracking-[0.22em]">
          {IMPERIAL_BET_COPY.autoTitle}
        </span>
      </div>

      {showPhonDiscount && (
        <div className="rounded-xl border border-amber-300/40 bg-gradient-to-r from-amber-400/15 to-pink-500/10 px-3 py-2 flex items-center gap-2 text-[11px] text-amber-200 font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          {IMPERIAL_BET_COPY.phonDiscountRibbon}
        </div>
      )}

      <div className="grid gap-2">
        {AUTO_BET_PRESETS.map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={[
                "text-left rounded-xl p-3 border transition press",
                active
                  ? "border-amber-300 bg-gradient-to-br from-amber-400/20 to-pink-500/10"
                  : "border-border/40 bg-background/40 hover:border-amber-300/50",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-black text-sm">{p.name}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  승×{p.onWin} · 패×{p.onLoss} ·{" "}
                  {p.maxRounds === -1 ? "∞" : `${p.maxRounds}회`}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{p.tagline}</div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onStart(preset)}
        className="w-full min-h-14 rounded-2xl bg-gradient-to-r from-amber-400 to-pink-500 text-white font-black text-sm tracking-wide press shadow-lg shadow-pink-500/30"
      >
        {preset.name} 시작
      </button>
    </div>
  );
}
