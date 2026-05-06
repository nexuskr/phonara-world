import { useEffect } from "react";

export default function PinPad({ value, onChange, length = 6, label }: { value: string; onChange: (v: string) => void; length?: number; label?: string }) {
  useEffect(() => { if (value.length > length) onChange(value.slice(0, length)); }, [value, length, onChange]);
  return (
    <div>
      {label && <div className="text-[11px] text-muted-foreground mb-2 font-bold">{label}</div>}
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-xl glass-strong flex items-center justify-center font-display font-black text-2xl
            ${value[i] ? "text-primary glow-primary border border-primary/40" : "text-muted-foreground"}`}>
            {value[i] ? "•" : ""}
          </div>
        ))}
      </div>
      <input
        inputMode="numeric"
        maxLength={length}
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        className="mt-3 w-full bg-input/60 border border-border rounded-xl px-4 py-3 text-center font-display font-bold tracking-[0.5em] text-lg focus:outline-none focus:border-primary"
        placeholder={"".padEnd(length, "•")}
      />
    </div>
  );
}
