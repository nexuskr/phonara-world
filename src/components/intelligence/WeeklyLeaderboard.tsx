import { useMemo } from "react";
import { Trophy, Crown, Medal } from "lucide-react";
import { usePaperStore } from "@/lib/paper-trading/store";

interface Row {
  rank: number;
  name: string;
  pnl: number;
  trades: number;
  winRate: number;
  isMe?: boolean;
}

const SEED: Omit<Row, "rank">[] = [
  { name: "Maverick.eth", pnl: 18420.55, trades: 47, winRate: 72 },
  { name: "Kira_77", pnl: 12880.10, trades: 39, winRate: 68 },
  { name: "Hex.Protocol", pnl: 9842.30, trades: 51, winRate: 61 },
  { name: "0xSamurai", pnl: 7715.92, trades: 28, winRate: 64 },
  { name: "NoctisLabs", pnl: 5290.40, trades: 33, winRate: 57 },
  { name: "Δelta.bit", pnl: 3940.18, trades: 22, winRate: 59 },
  { name: "Phonara_Q", pnl: 2218.55, trades: 18, winRate: 55 },
];

const WEEK_MS = 7 * 24 * 3600_000;

export default function WeeklyLeaderboard() {
  const history = usePaperStore((s) => s.history);

  const me = useMemo(() => {
    const since = Date.now() - WEEK_MS;
    const recent = history.filter((h) => (h.closed?.at ?? 0) >= since);
    const pnl = recent.reduce((s, r) => s + (r.closed?.pnl ?? 0), 0);
    const wins = recent.filter((r) => (r.closed?.pnl ?? 0) > 0).length;
    return {
      name: "You",
      pnl,
      trades: recent.length,
      winRate: recent.length ? Math.round((wins / recent.length) * 100) : 0,
      isMe: true,
    };
  }, [history]);

  const rows = useMemo<Row[]>(() => {
    const merged = [...SEED, me]
      .sort((a, b) => b.pnl - a.pnl)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return merged;
  }, [me]);

  return (
    <section className="glass-strong rounded-3xl border border-primary/30 p-4 sm:p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-lg flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Weekly Top Trader
        </h2>
        <span className="text-[10px] text-muted-foreground tracking-widest">7D · PAPER</span>
      </div>

      <ol className="space-y-1.5">
        {rows.slice(0, 8).map((r) => {
          const positive = r.pnl >= 0;
          return (
            <li
              key={r.rank + r.name}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 border ${
                r.isMe
                  ? "border-primary/60 bg-primary/10"
                  : r.rank === 1
                    ? "border-primary/40 bg-primary/5"
                    : "border-border/40 bg-background/40"
              }`}
            >
              <div className="w-8 text-center font-display font-black text-sm">
                {r.rank === 1 ? <Crown className="w-4 h-4 text-primary mx-auto" /> :
                 r.rank === 2 ? <Medal className="w-4 h-4 text-foreground/70 mx-auto" /> :
                 r.rank === 3 ? <Medal className="w-4 h-4 text-amber-700 mx-auto" /> :
                 `#${r.rank}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate ${r.isMe ? "text-primary" : ""}`}>
                  {r.name}{r.isMe && " (Me)"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {r.trades} trades · {r.winRate}% WR
                </div>
              </div>
              <div className={`text-sm font-mono tabular-nums font-bold ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                {positive ? "+" : ""}{r.pnl.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-[10px] text-muted-foreground/70">
        시드 데이터 + 본인 세션 기반. 실제 보상 정산 없음.
      </p>
    </section>
  );
}
