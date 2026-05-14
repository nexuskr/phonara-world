import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { formatKRW } from "@/lib/store";
import { Gift, Wallet as WalletIcon, Sparkles } from "lucide-react";
import { setVisibleInterval } from "@/lib/util/visible-interval";

type Stats = {
  today_bonus_count: number;
  today_bonus_total: number;
  withdraw_total: number;
  total_users: number;
};

export default function TrustCounter() {
  const { t } = useTranslation("guide");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data } = await supabase.rpc("get_starter_trust_stats");
        if (!mounted) return;
        if (data && typeof data === "object") setStats(data as unknown as Stats);
      } catch {
        /* backend unreachable — keep null so i18n fallback strings render */
      }
    };
    void load();
    const stop = setVisibleInterval(load, 30_000);
    return () => {
      mounted = false;
      stop();
    };
  }, []);

  const fresh = stats && (stats.today_bonus_count > 0 || stats.withdraw_total > 0);

  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      <div className="glass rounded-xl p-3 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-gold blur-2xl opacity-25 pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Gift className="w-3 h-3 text-gold" /> {t("trust.todayBonus")}
          </div>
          <div className="font-display font-black text-base text-money-strong tabular-nums mt-0.5">
            {fresh ? `+${formatKRW(stats!.today_bonus_total)}` : t("trust.fallbackFresh")}
          </div>
          {fresh && (
            <div className="text-[10px] text-muted-foreground tabular-nums">
              {stats!.today_bonus_count}{t("trust.cases")}
            </div>
          )}
        </div>
      </div>
      <div className="glass rounded-xl p-3 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-gradient-imperial blur-2xl opacity-25 pointer-events-none" />
        <div className="relative">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <WalletIcon className="w-3 h-3 text-primary" /> {t("trust.feeFreeWithdraw")}
          </div>
          <div className="font-display font-black text-base text-gradient-primary tabular-nums mt-0.5">
            {fresh ? formatKRW(stats!.withdraw_total) : t("trust.fallbackEarly")}
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-secondary" /> {t("trust.feeFreeNote")}
          </div>
        </div>
      </div>
    </div>
  );
}
