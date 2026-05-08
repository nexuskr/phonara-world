import { Gift } from "lucide-react";
import { formatKRW } from "@/lib/store";
import { useTranslation } from "react-i18next";

export default function ReciprocityBonus({ amount = 3_000 }: { amount?: number }) {
  const { t } = useTranslation("convert");
  return (
    <div className="glass rounded-xl p-3 flex items-center gap-3 border border-secondary/30">
      <div className="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center shrink-0">
        <Gift className="w-4 h-4 text-secondary" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] text-muted-foreground tracking-widest font-bold break-keep">
          {t("depositNow")}
        </div>
        <div className="font-display font-black text-base text-money-strong tabular-nums">
          {t("bonusVal", { val: formatKRW(amount) })}
        </div>
      </div>
    </div>
  );
}
