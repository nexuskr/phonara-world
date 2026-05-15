import { useState } from "react";
import { Repeat, X } from "lucide-react";

const ROUND_OPTIONS = [10, 25, 50, 100, -1] as const; // -1 = ∞

export type AutoSpinSettings = {
  rounds: number; // -1 = infinite
  stopOnBonus: boolean;
  stopOnBigWin: boolean; // ≥ 50×
  stopBalanceFloor: number; // 0 = disabled
};

export default function AutoSpinControls({
  active,
  remaining,
  settings,
  onStart,
  onStop,
  onSettingsChange,
}: {
  active: boolean;
  remaining: number;
  settings: AutoSpinSettings;
  onStart: () => void;
  onStop: () => void;
  onSettingsChange: (s: AutoSpinSettings) => void;
}) {
  const [open, setOpen] = useState(false);

  if (active) {
    return (
      <button
        onClick={onStop}
        className="h-12 sm:h-14 px-3 rounded-xl border-2 border-red-500/60 text-red-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-red-500/10 press"
      >
        <X className="w-3.5 h-3.5" />
        AUTO STOP
        <span className="text-[10px] opacity-70 ml-1">
          {settings.rounds === -1 ? "∞" : `${remaining}/${settings.rounds}`}
        </span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-12 sm:h-14 px-3 rounded-xl border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-amber-500/10 press"
      >
        <Repeat className="w-3.5 h-3.5" />
        AUTO {settings.rounds === -1 ? "∞" : settings.rounds}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-50 w-64 glass border border-border/40 rounded-xl p-3 space-y-3 shadow-2xl">
            <div>
              <div className="text-[10px] tracking-[0.25em] font-bold text-muted-foreground mb-2">
                자동 스핀 횟수
              </div>
              <div className="grid grid-cols-5 gap-1">
                {ROUND_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => onSettingsChange({ ...settings, rounds: r })}
                    className={`py-1.5 rounded-md text-xs font-bold ${
                      settings.rounds === r
                        ? "bg-amber-500 text-black"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === -1 ? "∞" : r}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span>보너스 트리거 시 정지</span>
              <input
                type="checkbox"
                checked={settings.stopOnBonus}
                onChange={(e) => onSettingsChange({ ...settings, stopOnBonus: e.target.checked })}
                className="accent-amber-500"
              />
            </label>

            <label className="flex items-center justify-between text-xs cursor-pointer">
              <span>50× 이상 당첨 시 정지</span>
              <input
                type="checkbox"
                checked={settings.stopOnBigWin}
                onChange={(e) => onSettingsChange({ ...settings, stopOnBigWin: e.target.checked })}
                className="accent-amber-500"
              />
            </label>

            <button
              onClick={() => {
                setOpen(false);
                onStart();
              }}
              className="w-full py-2 rounded-lg bg-gradient-imperial text-primary-foreground font-bold text-xs glow-imperial"
            >
              시작
            </button>
          </div>
        </>
      )}
    </div>
  );
}
