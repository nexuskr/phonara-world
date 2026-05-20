import { Banknote, Coins, Sparkles } from "lucide-react";
import { useDB } from "@/lib/store";
import { useMyPower } from "@/hooks/use-my-power";
import { useCurrencyPref } from "@/hooks/use-currency-pref";
import {
  type DisplayCurrency,
  formatCurrency,
  formatFromPhon,
  convert,
  LABEL,
} from "@/lib/displayCurrency";
import { cn } from "@/lib/utils";

const ORDER: DisplayCurrency[] = ["KRW", "USDT", "PHON"];

/**
 * Tri-currency wallet header — KRW (bank balance, native), USDT (coin balance, native),
 * PHON (token balance, native). Each row also shows the cross-display in the user's
 * preferred currency. Pref lives in localStorage via useCurrencyPref.
 */
export default function MultiCurrencyBalance({
  className,
  compact = false,
  inline = false,
}: { className?: string; compact?: boolean; inline?: boolean }) {
  const [db] = useDB();
  const { phon } = useMyPower();
  const [pref, setPref] = useCurrencyPref();

  const krw = (db.user as any)?.balance ?? 0;          // native KRW (bank)
  const usdt = (db.user as any)?.coinBalance ?? 0;     // native USDT (coin wallet)
  const phonBal = phon ?? (db.user as any)?.phon_balance ?? 0;

  // Total value in user's preferred currency
  const totalPhon = phonBal + convert(krw, "KRW", "PHON") + convert(usdt, "USDT", "PHON");
  const totalDisplay = formatFromPhon(totalPhon, pref, { compact: true });

  const rows: { key: DisplayCurrency; icon: any; native: number; label: string }[] = [
    { key: "KRW", icon: Banknote, native: krw, label: "원화 잔고" },
    { key: "USDT", icon: Coins, native: usdt, label: "USDT 잔고" },
    { key: "PHON", icon: Sparkles, native: phonBal, label: "PHON 토큰" },
  ];

  if (inline) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", className)}>
        <div className="min-w-0 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-[0.24em] text-muted-foreground">총 자산</div>
              <div className="truncate text-sm font-black tabular-nums text-money-strong">{totalDisplay}</div>
            </div>
            <div className="flex shrink-0 gap-1 rounded-full bg-muted/40 p-1">
              {ORDER.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPref(c)}
                  className={cn(
                    "min-h-8 rounded-full px-2.5 text-[10px] font-black transition",
                    pref === c
                      ? "bg-primary text-primary-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-pressed={pref === c}
                  aria-label={`표시 통화 ${LABEL[c]}`}
                >
                  {LABEL[c]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 lg:flex items-center gap-1.5 rounded-full border border-border/60 bg-card/65 px-2 py-1 backdrop-blur">
          {rows.map(({ key, icon: Icon, native }) => (
            <div key={key} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold tabular-nums text-foreground">
              <Icon className="size-3 text-primary" />
              <span className="text-muted-foreground">{LABEL[key]}</span>
              <span>{formatCurrency(native, key, { compact: true })}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card/60 backdrop-blur p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">총 자산</div>
          <div className="text-2xl font-black text-money-strong tabular-nums">{totalDisplay}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            ※ 표시 환산 — 결제는 각 통화 그대로 처리됩니다
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
          {ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPref(c)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-bold transition",
                pref === c
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={pref === c}
              aria-label={`표시 통화 ${LABEL[c]}`}
            >
              {LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {!compact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {rows.map(({ key, icon: Icon, native, label }) => {
            const cross = key !== pref ? formatFromPhon(convert(native, key, "PHON"), pref) : null;
            return (
              <div key={key} className="rounded-lg bg-background/60 border border-border/60 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="size-3.5" /> {label}
                </div>
                <div className="text-lg font-bold tabular-nums mt-1">
                  {formatCurrency(native, key)}
                </div>
                {cross && (
                  <div className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                    ≈ {cross}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
