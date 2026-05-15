import { Crown, Dice5, Gem, TrendingUp, Bot, Gift } from "lucide-react";

const ITEMS = [
  { icon: Crown,       title: "CROWN WAR",    line1: "실시간 제국 전쟁",   line2: "전 세계와 경쟁",    tone: "text-gold" },
  { icon: Dice5,       title: "SLOT & GAMES", line1: "자체 슬롯 & 카지노", line2: "RTP 96% 이상",     tone: "text-amber-300" },
  { icon: Gem,         title: "NFT ATELIER",  line1: "전설의 NFT 제작",   line2: "수집하고 거래",     tone: "text-sky-300" },
  { icon: TrendingUp,  title: "REAL TRADING", line1: "실시간 시장 거래",  line2: "1000+ 마켓",       tone: "text-emerald-400" },
  { icon: Bot,         title: "AI COACH",     line1: "AI 황제 코치",      line2: "승리를 도와드립니다", tone: "text-violet-300" },
  { icon: Gift,        title: "DAILY REWARDS",line1: "매일 보상 & 이벤트", line2: "Crown & PHON",     tone: "text-rose-300" },
];

export default function AuthFeatureGrid() {
  return (
    <div className="w-full">
      <h2 className="text-center font-imperial text-xl sm:text-2xl text-foreground mb-4 tracking-wide">
        세계 1위 LIVE EMPIRE의 6가지 강력한 차별점
      </h2>
      <div className="rounded-2xl border border-gold/30 bg-background/65 backdrop-blur-md p-3 sm:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="flex flex-col items-center text-center gap-1 px-1 py-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-background/80 border border-gold/30 flex items-center justify-center mb-1">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${it.tone}`} />
              </div>
              <div className={`text-[10px] sm:text-xs font-black tracking-widest ${it.tone}`}>{it.title}</div>
              <div className="text-[11px] sm:text-xs font-bold text-foreground/90 leading-tight">{it.line1}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{it.line2}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
