import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { formatKRW } from "@/lib/store";

const seed = [
  { n: "사이버제왕", v: 38_420_000, c: "👑" },
  { n: "팬텀카운슬", v: 21_800_000, c: "🌌" },
  { n: "AI킹덤", v: 15_600_000, c: "🤖" },
  { n: "엠파이어",  v: 9_200_000,  c: "💎" },
  { n: "스타터러너", v: 5_400_000, c: "⚡" },
];

export default function LiveRanking() {
  const [list, setList] = useState(seed);

  useEffect(() => {
    const t = setInterval(() => {
      setList(prev => {
        const next = prev.map(r => ({ ...r, v: r.v + Math.floor(Math.random() * 280_000) + 5_000 }));
        next.sort((a, b) => b.v - a.v);
        return next;
      });
    }, 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass-strong rounded-2xl p-4 neon-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="font-display font-bold text-sm">실시간 랭킹</span>
        </div>
        <span className="text-[10px] text-secondary flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> LIVE
        </span>
      </div>
      {list.map((r, i) => (
        <div key={r.n} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0 transition-all">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display font-black text-xs
              ${i === 0 ? "bg-gradient-gold text-gold-foreground" : i === 1 ? "bg-secondary/30 text-secondary" : i === 2 ? "bg-accent/30 text-accent" : "bg-muted"}`}>
              {i + 1}
            </div>
            <span className="text-2xl">{r.c}</span>
            <span className="text-sm font-bold">{r.n}</span>
          </div>
          <div className="text-sm font-display font-bold text-gradient-primary tabular-nums">{formatKRW(r.v)}</div>
        </div>
      ))}
    </div>
  );
}
