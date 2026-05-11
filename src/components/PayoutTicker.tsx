import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const NAMES_KO = ["민지", "현우", "수아", "재훈", "지원", "태리", "다은", "성훈", "유나", "지민", "도윤", "서아", "예린", "준호", "하린"];
const NAMES_EN = ["Min", "Jay", "Sue", "Ron", "Will", "Terry", "Dan", "Sung", "Yuna", "Jimin", "Doyun", "Seo", "Erin", "Jun", "Harin"];
const REGIONS_KO = ["서울", "부산", "대전", "인천", "광주", "대구", "수원", "일산", "제주", "성남"];
const REGIONS_EN = ["Seoul", "Busan", "Daejeon", "Incheon", "Gwangju", "Daegu", "Suwon", "Ilsan", "Jeju", "Seongnam"];
const TIERS = ["FREE", "STARTER", "PRO", "VIP", "GOD MODE", "EMPIRE"];

function rand<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }
function genReceipt(lng: string) {
  const tier = rand(TIERS);
  const range = tier === "FREE" ? [8000, 45000]
    : tier === "STARTER" ? [30000, 110000]
    : tier === "PRO" ? [80000, 380000]
    : tier === "VIP" ? [200000, 1200000]
    : tier === "GOD MODE" ? [500000, 4800000]
    : [1500000, 18000000];
  const amt = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
  const isEn = lng.startsWith("en");
  return {
    id: Math.random().toString(36).slice(2),
    name: rand(isEn ? NAMES_EN : NAMES_KO) + "**",
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
          <span className="text-[9px] tracking-widest font-black border border-border/60 text-muted-foreground px-1.5 py-0.5 rounded">SIM</span>
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
              <div className="font-display font-black text-sm text-money-strong text-gradient-gold tabular-nums">+₩{it.amt.toLocaleString()}</div>
              <div className="text-[9px] text-secondary">{t("approved")}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
