import { markDepositIntent } from "@/lib/funnel";

type Props = {
  value: string;
  onChange: (v: string) => void;
  /** 기본 한국 핀테크 표준 6단계. */
  presets?: number[];
};

const DEFAULTS = [50_000, 100_000, 300_000, 1_000_000, 3_000_000, 10_000_000];

export default function AmountPresetChips({ value, onChange, presets = DEFAULTS }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {presets.map((v) => {
        const active = value === String(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => {
              onChange(String(v));
              markDepositIntent("amount_preset", { amount: v });
            }}
            className={`min-h-[48px] py-2.5 rounded-xl text-xs font-bold tabular-nums transition press border ${
              active
                ? "border-primary bg-primary/15 text-primary glow-imperial"
                : "border-border/40 glass hover:border-primary/40 hover:text-primary"
            }`}
          >
            {v >= 10_000 ? `${(v / 10_000).toLocaleString()}만` : v.toLocaleString()}
          </button>
        );
      })}
    </div>
  );
}
