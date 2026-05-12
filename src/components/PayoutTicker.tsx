import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SimChip } from "@/components/sim/SimChip";

// PR-1: KRW + masked Korean names removed (Hard Constraint C3/C4).
// Bot/SIM ticker now uses Empire Coin (₡) + abstract guild handles only.

const TIERS = ["FREE", "STARTER", "PRO", "VIP", "GOD MODE", "EMPIRE"] as const;
const REGIONS_KO = ["서부 길드", "동부 길드", "남부 길드", "북부 길드", "중앙 길드", "수도 길드"];
const REGIONS_EN = ["West Guild", "East Guild", "South Guild", "North Guild", "Capital Guild", "Royal Guild"];

function rand<T>(a: readonly T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function genReceipt(lng: string) {
  const tier = rand(TIERS);
  const range = tier === "FREE" ? [80, 450]
    : tier === "STARTER" ? [300, 1100]
    : tier === "PRO" ? [800, 3800]
    : tier === "VIP" ? [2000, 12000]
    : tier === "GOD MODE" ? [5000, 48000]
    : [15000, 180000];
  const amt = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
  const isEn = lng.startsWith("en");
  // Anonymous empire-citizen handle — no person names, no masking.
  const handle = (isEn ? "Empire #" : "제국민 #") + String(Math.floor(Math.random() * 9000) + 1000);
  return {
    id: Math.random().toString(36).slice(2),
    name: handle,
    region: rand(isEn ? REGIONS_EN : REGIONS_KO),
    tier,
    amt,
  };
}

export default function PayoutTicker() {
  const { t, i18n } = useTranslation("live");
  const [items, setItems] = useState(() => Array.from({ length: 6 }, () => genReceipt(i18n.language)));
  useEffect(() => {
    const tk = setInterval(() => {
      setItems(prev => [genReceipt(i18n.language), ...prev].slice(0, 6));
    }, 1800);
    return () => clearInterval(tk);
  }, [i18n.language]);
  return (
    <div className="glass-strong rounded-3xl neon-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs font-display font-black tracking-widest break-keep">{t("payoutTitle")}</span>
          <SimChip />
        </div>
        <span className="text-[10px] text-muted-foreground break-keep">{t("payoutSub")}</span>
      </div>
      <div className="divide-y divide-border/30">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center justify-between px-5 py-3 animate-fade-up" style={{ animationDuration: "0.5s" }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-4 h-4 ${i === 0 ? "text-secondary animate-pulse" : "text-muted-foreground"}`} />
              <div>
                <div className="text-xs font-bold">{it.name} <span className="text-muted-foreground font-normal">· {it.region}</span></div>
                <div className="text-[10px] text-muted-foreground">{it.tier} · {t("justSettled")}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-sm text-sim-gold tabular-nums">+{it.amt.toLocaleString()} ₡</div>
              <div className="text-[9px] text-secondary">{t("approved")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
