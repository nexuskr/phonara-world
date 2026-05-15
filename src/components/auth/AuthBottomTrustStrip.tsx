import { ShieldCheck, Lock, Globe2, TrendingUp, Users } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, title: "100% 익명", sub: "KYC 없음" },
  { icon: Lock,        title: "AAL2 보안", sub: "최고 등급 암호화" },
  { icon: Globe2,      title: "24/7 운영", sub: "글로벌 서버" },
  { icon: TrendingUp,  title: "8,247억+",  sub: "24시간 거래액" },
  { icon: Users,       title: "500,000+", sub: "전체 황제 수" },
];

export default function AuthBottomTrustStrip() {
  return (
    <div className="rounded-2xl border border-gold/30 bg-background/65 backdrop-blur-md p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {ITEMS.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.title} className="flex items-center gap-2 px-1">
            <span className="w-9 h-9 rounded-full bg-background/80 border border-gold/30 flex items-center justify-center text-gold shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-black text-foreground/95 leading-tight truncate">{it.title}</div>
              <div className="text-[10px] text-muted-foreground leading-tight truncate">{it.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
