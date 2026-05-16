import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { setVisibleInterval } from "@/lib/util/visible-interval";

export default function CountdownLossAversion({
  minutes = 15,
  label,
  storageKey = "phonara_paywall_deadline",
}: {
  minutes?: number;
  label?: string;
  storageKey?: string;
}) {
  const { t } = useTranslation("convert");
  const labelText = label ?? t("bonusExpire");
  const [left, setLeft] = useState(() => {
    if (typeof window === "undefined") return minutes * 60;
    const raw = sessionStorage.getItem(storageKey);
    const deadline = raw ? Number(raw) : 0;
    if (!deadline || isNaN(deadline) || deadline < Date.now()) {
      const next = Date.now() + minutes * 60_000;
      sessionStorage.setItem(storageKey, String(next));
      return minutes * 60;
    }
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  useEffect(() => {
    return setVisibleInterval(() => {
      const raw = sessionStorage.getItem(storageKey);
      const deadline = raw ? Number(raw) : 0;
      setLeft(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    }, 1000, { meta: { owner: "CountdownLossAversion", category: "cosmetic" } });
  }, [storageKey]);

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
        {labelText}
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
