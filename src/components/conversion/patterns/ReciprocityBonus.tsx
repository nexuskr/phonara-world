import { Gift } from "lucide-react";
import { formatKRW } from "@/lib/store";

/** 결제 시 즉시 보너스 입금 카드. */
export default function ReciprocityBonus({ amount = 3_000 }: { amount?: number }) {
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3 border border-secondary/30">
      <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
        <Gift className="w-4 h-4 text-secondary" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] text-muted-foreground tracking-widest font-bold">
          결제 시 즉시 입금
        </div>
        <div className="font-display font-black text-base text-money-strong tabular-nums">
          +{formatKRW(amount)} 보너스
        </div>
      </div>
    </div>
  );
}
