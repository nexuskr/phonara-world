/**
 * RealBetSlip — PHON real-currency bet slip for Imperial Duel rooms.
 * Glassmorphism + warm-king toast + potential-win glow.
 * MONEY_FLOW_NEW_PATH: phon_betting (Mode B).
 */
import { useMemo, useState } from "react";
import { useRealBetting } from "@/hooks/useRealBetting";

const CHIPS = [100, 500, 1_000, 5_000];

function haptic() {
  try { (navigator as any)?.vibrate?.(18); } catch { /* noop */ }
}

export type RealBetSlipProps = {
  roomId: string;
  defaultSide?: "left" | "right";
  leftPot: number;
  rightPot: number;
  disabled?: boolean;
};

export function RealBetSlip({ roomId, defaultSide = "left", leftPot, rightPot, disabled }: RealBetSlipProps) {
  const [side, setSide] = useState<"left" | "right">(defaultSide);
  const [amount, setAmount] = useState<number>(100);
  const { placeBet, pending } = useRealBetting();

  const potentialWin = useMemo(() => {
    const total = leftPot + rightPot + amount;
    const winningPot = (side === "left" ? leftPot : rightPot) + amount;
    if (winningPot <= 0) return 0;
    // House edge 6.2% (mirror of server constant)
    const payoutPool = total * (1 - 0.062);
    return Math.floor((payoutPool * amount) / winningPot);
  }, [side, amount, leftPot, rightPot]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 shadow-[0_8px_32px_hsl(240_50%_1%/0.55)] space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(["left", "right"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { haptic(); setSide(s); }}
            className={[
              "rounded-xl px-3 py-2 text-sm font-display font-bold transition-all",
              side === s
                ? "bg-gradient-to-br from-amber-400/30 to-amber-600/20 text-foreground border border-amber-400/60 shadow-[0_0_24px_-4px_hsl(38_92%_55%/0.45)]"
                : "bg-muted/40 text-muted-foreground border border-border/40 hover:bg-muted/60",
            ].join(" ")}
            aria-pressed={side === s}
          >
            {s === "left" ? "⚔️ LEFT" : "🛡️ RIGHT"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { haptic(); setAmount(c); }}
            className={[
              "rounded-full px-3 py-1 text-xs font-mono transition-all",
              amount === c
                ? "bg-primary/20 text-primary border border-primary/50"
                : "bg-muted/30 text-muted-foreground border border-border/40 hover:bg-muted/50",
            ].join(" ")}
          >
            {c.toLocaleString()} PHON
          </button>
        ))}
      </div>

      <input
        type="number"
        min={1}
        max={10_000_000}
        value={amount}
        onChange={(e) => setAmount(Math.max(1, Math.min(10_000_000, Number(e.target.value) || 0)))}
        className="w-full rounded-xl bg-background/60 border border-border/50 px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="베팅 금액 (PHON)"
      />

      <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-300/5 border border-amber-400/30 p-3 text-center">
        <div className="text-[10px] uppercase tracking-widest text-amber-200/80">예상 보상</div>
        <div className="text-xl font-display font-black text-amber-100 drop-shadow-[0_0_8px_hsl(45_95%_70%/0.5)]">
          {potentialWin.toLocaleString()} <span className="text-xs">PHON</span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">House Edge 6.2% 반영</div>
      </div>

      <button
        type="button"
        disabled={disabled || pending || amount <= 0}
        onClick={async () => {
          haptic();
          await placeBet({ room_id: roomId, side, amount_phon: amount });
        }}
        className="w-full rounded-xl py-3 font-display font-black text-base bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-amber-950 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_8px_24px_-8px_hsl(38_92%_55%/0.7)]"
      >
        {pending ? "출진 중…" : `⚔️ ${amount.toLocaleString()} PHON 출진`}
      </button>
    </div>
  );
}

export default RealBetSlip;
