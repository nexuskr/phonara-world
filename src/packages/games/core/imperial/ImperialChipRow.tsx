/** ImperialChipRow — quick bet chips with luxury gold treatment. */
import { memo } from "react";

interface Props {
  values: number[];
  active: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (v >= 1000) return `${v / 1000}k`;
  return String(v);
}

function ImperialChipRowImpl({ values, active, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {values.map((v) => {
        const isActive = active === v;
        return (
          <button
            key={v}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v)}
            className={`h-11 rounded-xl font-bold text-sm border transition active:scale-95 disabled:opacity-50 ${
              isActive
                ? "bg-gradient-to-br from-[hsl(var(--gold))]/30 to-[hsl(var(--pink))]/20 border-[hsl(var(--gold))]/60 text-[hsl(var(--gold))] shadow-[0_0_20px_hsla(45,90%,55%,0.3)]"
                : "bg-background/40 border-border/40 text-foreground hover:border-[hsl(var(--gold))]/40"
            }`}
          >
            {fmt(v)}
          </button>
        );
      })}
    </div>
  );
}

export const ImperialChipRow = memo(ImperialChipRowImpl);
export default ImperialChipRow;
