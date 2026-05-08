import { useEffect, useState } from "react";
import { formatKRW } from "@/lib/store";

/**
 * 적립 성공 시 동전 애니 + 햅틱 토스트.
 * 사용: window.dispatchEvent(new CustomEvent("phonara:earned", { detail: { amount: 500 } }))
 */
export default function EarnedToast() {
  const [items, setItems] = useState<{ id: string; amount: number }[]>([]);

  useEffect(() => {
    function onEarn(e: Event) {
      const detail = (e as CustomEvent<{ amount: number }>).detail;
      const amount = detail?.amount ?? 0;
      if (!amount) return;
      try { navigator.vibrate?.(20); } catch { /* noop */ }
      const id = Math.random().toString(36).slice(2);
      setItems((prev) => [...prev, { id, amount }]);
      setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2400);
    }
    window.addEventListener("phonara:earned", onEarn);
    return () => window.removeEventListener("phonara:earned", onEarn);
  }, []);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] pointer-events-none flex flex-col items-center gap-2">
      {items.map((it) => (
        <div
          key={it.id}
          className="glass-strong neon-border rounded-2xl px-5 py-3 flex items-center gap-3 animate-fade-up shadow-2xl"
        >
          <span className="text-2xl animate-money-burst">💰</span>
          <div>
            <div className="text-[10px] tracking-widest text-secondary font-black">REWARD</div>
            <div className="font-display font-black text-lg text-money-strong tabular-nums">
              +{formatKRW(it.amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** 외부에서 호출하기 쉬운 헬퍼. */
export function emitEarned(amount: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("phonara:earned", { detail: { amount } }));
}
