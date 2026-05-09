import { useEffect, useState } from "react";
import { Activity, TrendingUp, Users } from "lucide-react";
import { usePaperStore } from "@/lib/paper-trading/store";

export default function LiveCounterRow() {
  const history = usePaperStore((s) => s.history);
  const positions = usePaperStore((s) => s.positions);
  const [traders, setTraders] = useState(() => 1840 + Math.floor(Math.random() * 380));

  useEffect(() => {
    const t = setInterval(() => {
      setTraders((n) => Math.max(1500, n + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 4)));
    }, 6_000);
    return () => clearInterval(t);
  }, []);

  const totalPnl = history.reduce((s, p) => s + (p.closed?.pnl ?? 0), 0);
  const todayMs = Date.now() - 24 * 3600_000;
  const todayVolume = [
    ...history.filter((p) => p.openedAt > todayMs),
    ...positions.filter((p) => p.openedAt > todayMs),
  ].reduce((s, p) => s + p.margin * p.leverage, 0);

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Card icon={<Activity />} label="Today Volume" value={`${todayVolume.toFixed(0)} USDT`} />
      <Card icon={<Users />} label="Live Traders" value={traders.toLocaleString()} pulse />
      <Card icon={<TrendingUp />} label="My Total PnL" value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`} accent={totalPnl >= 0 ? "up" : "down"} />
    </div>
  );
}

function Card({ icon, label, value, pulse, accent }: { icon: React.ReactNode; label: string; value: string; pulse?: boolean; accent?: "up" | "down" }) {
  const tone = accent === "up" ? "text-emerald-400" : accent === "down" ? "text-rose-400" : "text-foreground";
  return (
    <div className="glass rounded-2xl border border-border/40 p-3 sm:p-4">
      <div className="flex items-center gap-2 text-[10px] tracking-widest text-muted-foreground">
        <span className={`text-primary ${pulse ? "animate-pulse" : ""}`}>{icon}</span>
        {label}
      </div>
      <div className={`mt-1 font-display font-black text-lg sm:text-xl tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}
