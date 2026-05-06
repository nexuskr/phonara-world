import { useEffect, useRef } from "react";

export default function PinPad({ value, onChange, length = 6, label }: { value: string; onChange: (v: string) => void; length?: number; label?: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (value.length > length) onChange(value.slice(0, length)); }, [value, length, onChange]);

  return (
    <div>
      {label && <div className="text-[11px] text-muted-foreground mb-2 font-bold tracking-widest uppercase">{label}</div>}
      <div className="grid grid-cols-6 gap-2 cursor-text" onClick={() => inputRef.current?.focus()}>
        {Array.from({ length }).map((_, i) => {
          const filled = !!value[i];
          const isNext = value.length === i;
          return (
            <div
              key={i}
              className={`relative aspect-square rounded-xl flex items-center justify-center font-display font-black text-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
                ${filled
                  ? "bg-gradient-to-br from-primary/30 to-accent/20 border border-primary/60 shadow-[0_0_24px_hsl(var(--primary)/0.45)] scale-[1.04]"
                  : isNext
                    ? "glass-strong border border-primary/30 animate-ring-pulse"
                    : "glass-strong border border-border/60 scale-[0.98]"}
              `}
            >
              <span className={`transition-all duration-300 ${filled ? "text-primary opacity-100 scale-100" : "opacity-0 scale-50"}`}>•</span>
              {filled && <span className="absolute inset-0 rounded-xl bg-primary/10 blur-md -z-10" />}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        className="sr-only"
      />
    </div>
  );
}
