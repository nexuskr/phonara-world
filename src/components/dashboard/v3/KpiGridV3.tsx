/**
 * KpiGridV3 — 정확히 4개 카드. 큼직하게.
 * 오늘 출금 · 활동 중 · 내 제국 · Jackpot.
 *
 * Perf: receives nfts/online from parent so we don't double-subscribe.
 * Falls back to hooks when used standalone.
 */
import { useEffect, useState } from "react";
import { Wallet, Users, Crown, Sparkles } from "lucide-react";
import { useOnline, useTodayPayout } from "@/components/LiveStats";
import { useMyPower, topNftLevel, type NFTRow } from "@/hooks/use-my-power";
import { formatKRW } from "@/lib/store";
import { setVisibleInterval } from "@/lib/util/visible-interval";

const LEVEL_LABEL: Record<string, string> = { bronze: "BRONZE", gold: "GOLD", diamond: "DIAMOND" };

function useJackpot() {
  const [v, setV] = useState(12_480_000);
  useEffect(() => {
    const t = setVisibleInterval(() => {
      if (document.visibilityState !== "visible") return;
      setV((prev) => Math.max(11_000_000, prev + Math.floor(Math.random() * 80_000) - 20_000));
    }, 8000 , { meta: { owner: "KpiGridV3", category: "cosmetic" } });
    return () => t();
  }, []);
  return v;
}

export default function KpiGridV3({
  nfts: nftsProp,
  online: onlineProp,
}: { nfts?: NFTRow[]; online?: number } = {}) {
  const today = useTodayPayout();
  const onlineFallback = useOnline();
  const power = useMyPower();
  const online = onlineProp ?? onlineFallback;
  const nfts = nftsProp ?? power.nfts;
  const jackpot = useJackpot();
  const tier = (() => {
    const lv = topNftLevel(nfts);
    return lv ? LEVEL_LABEL[lv] : "ROOKIE";
  })();

  const cards: Array<{ icon: any; micro: string; value: string; tone: "money" | "gold" | "primary" | "accent" }> = [
    { icon: Wallet, micro: "오늘 출금", value: formatKRW(today), tone: "money" },
    { icon: Users, micro: "활동 중", value: `${online.toLocaleString()}명`, tone: "primary" },
    { icon: Crown, micro: "내 제국", value: tier, tone: "gold" },
    { icon: Sparkles, micro: "Jackpot", value: formatKRW(jackpot), tone: "accent" },
  ];

  const TONE: Record<string, string> = {
    money: "text-money-strong",
    gold: "text-gold",
    primary: "text-primary",
    accent: "text-accent",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div
            key={i}
            className="relative rounded-2xl border border-gold/30 bg-card/70 p-4 md:p-5 overflow-hidden"
            style={{ boxShadow: "inset 0 1px 0 hsl(var(--gold)/0.18), 0 0 22px -8px hsl(var(--gold)/0.45)" }}
          >
            <span aria-hidden className="absolute inset-x-3 top-0 h-[2px] bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
            <div className="flex items-center gap-2 text-[10px] tracking-[0.32em] text-gold/75 font-black uppercase">
              <Icon className="w-3.5 h-3.5" />
              {c.micro}
            </div>
            <div className={`mt-2 font-display font-black text-2xl md:text-3xl tabular-nums ${TONE[c.tone]}`}>
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
