import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

const NAMES = ["민지", "현우", "수아", "재훈", "지원", "태리", "다은", "성훈", "유나", "지민", "도윤", "서아", "예린", "준호", "하린"];
const REGIONS = ["서울", "부산", "대전", "인천", "광주", "대구", "수원", "일산", "제주", "성남"];
const TIERS = ["FREE", "STARTER", "PRO", "VIP", "GOD MODE", "EMPIRE"];

function rand<T>(a: T[]) { return a[Math.floor(Math.random() * a.length)]; }
function genReceipt() {
  const tier = rand(TIERS);
  const range = tier === "FREE" ? [8000, 45000]
    : tier === "STARTER" ? [30000, 110000]
    : tier === "PRO" ? [80000, 380000]
    : tier === "VIP" ? [200000, 1200000]
    : tier === "GOD MODE" ? [500000, 4800000]
    : [1500000, 18000000];
  const amt = Math.floor(Math.random() * (range[1] - range[0])) + range[0];
  return {
    id: Math.random().toString(36).slice(2),
    name: rand(NAMES) + "**",
    region: rand(REGIONS),
    tier,
    amt,
  };
}

export default function PayoutTicker() {
  const [items, setItems] = useState(() => Array.from({ length: 6 }, genReceipt));
  useEffect(() => {
    const t = setInterval(() => {
      setItems(prev => [genReceipt(), ...prev].slice(0, 6));
    }, 1800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="glass-strong rounded-3xl neon-border overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
          <span className="text-xs font-display font-black tracking-widest">실시간 출금 정산</span>
        </div>
        <span className="text-[10px] text-muted-foreground">LIVE · 매일 12,000건+</span>
      </div>
      <div className="divide-y divide-border/30">
        {items.map((it, i) => (
          <div key={it.id} className="flex items-center justify-between px-5 py-3 animate-fade-up" style={{ animationDuration: "0.5s" }}>
            <div className="flex items-center gap-3">
              <CheckCircle2 className={`w-4 h-4 ${i === 0 ? "text-secondary animate-pulse" : "text-muted-foreground"}`} />
              <div>
                <div className="text-xs font-bold">{it.name} <span className="text-muted-foreground font-normal">· {it.region}</span></div>
                <div className="text-[10px] text-muted-foreground">{it.tier} · 방금 정산 완료</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display font-black text-sm text-gradient-gold">+₩{it.amt.toLocaleString()}</div>
              <div className="text-[9px] text-secondary">승인됨</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
