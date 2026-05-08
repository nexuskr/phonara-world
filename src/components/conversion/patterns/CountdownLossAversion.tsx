import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/** 손실 회피 카운트다운 — 보너스 소멸까지 남은 시간. */
export default function CountdownLossAversion({
  minutes = 15,
  label = "보너스 소멸까지",
}: {
  minutes?: number;
  label?: string;
}) {
  const [left, setLeft] = useState(minutes * 60);

  useEffect(() => {
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const danger = left < 60;

  return (
    <div
      className={`glass rounded-xl px-3 py-2 flex items-center justify-between ${
        danger ? "border border-destructive/60 animate-pulse" : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Clock className={`w-3.5 h-3.5 ${danger ? "text-destructive" : "text-primary"}`} />
        {label}
      </div>
      <div
        className={`font-display font-black text-lg tabular-nums ${
          danger ? "text-destructive" : "text-gradient-gold"
        }`}
      >
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </div>
    </div>
  );
}
