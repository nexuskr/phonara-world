import { Globe2, Crown } from "lucide-react";
import { usePaperStore } from "@/lib/paper-trading/store";

const SEED_LEADERS = [
  { name: "@ThroneKing", roi: 187.4 },
  { name: "@SignalWolf", roi: 142.9 },
  { name: "@AlphaSoul", roi: 118.6 },
  { name: "@ImperialTraderX", roi: 92.1 },
];

export default function GlobalContributionBar() {
  const history = usePaperStore((s) => s.history);
  const totalRoi = history.length
    ? (history.reduce((s, p) => s + (p.closed?.roi ?? 0), 0) / history.length) * 100
    : 0;
  const myEntry = { name: "You", roi: totalRoi };
  const leaders = [...SEED_LEADERS, myEntry].sort((a, b) => b.roi - a.roi).slice(0, 5);

  return (
    <section className="glass rounded-3xl border border-primary/20 p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="w-4 h-4 text-primary" />
        <h2 className="font-display font-bold text-base">Global Intelligence Contribution</h2>
      </div>
      <div>
        <div className="text-xs text-muted-foreground">당신의 결정이 글로벌 데이터에 기여하는 비율</div>
        <div className="mt-1 text-2xl font-display font-black text-primary tabular-nums">
          {(0.0008 + history.length * 0.00007).toFixed(5)}%
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className="h-full bg-gradient-imperial" style={{ width: `${Math.min(100, history.length * 1.2)}%` }} />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Crown className="w-3.5 h-3.5 text-primary" /> Weekly Top Trader (Paper)
        </div>
        <ul className="space-y-1">
          {leaders.map((l, i) => (
            <li key={l.name + i} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${l.name === "You" ? "bg-primary/10 border border-primary/30" : "bg-muted/10"}`}>
              <div className="flex items-center gap-2">
                <span className="w-5 text-center text-muted-foreground font-bold">{i + 1}</span>
                <span className="font-bold">{l.name}</span>
              </div>
              <span className={`font-mono tabular-nums font-bold ${l.roi >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {l.roi >= 0 ? "+" : ""}{l.roi.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
