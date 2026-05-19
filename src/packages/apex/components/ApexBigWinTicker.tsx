// ApexForge — 실시간 빅윈 티커 (홈 하단 FOMO).
// money-flow 0 터치. 공개 RPC apex_get_live_bigwins 사용.
import { useEffect, useState } from "react";
import { apexGetLiveBigwins, type ApexBigWin } from "../lib/api";

const GAME_LABEL: Record<string, string> = {
  dice: "Dice", crash: "Crash", plinko: "Plinko", mines: "Mines",
  slots_lite: "Slots", sportsbook: "Sports",
};

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}

export function ApexBigWinTicker({ className = "" }: { className?: string }) {
  const [items, setItems] = useState<ApexBigWin[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => apexGetLiveBigwins(20).then(d => alive && setItems(d));
    load();
    const t = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(t); };
  }, []);
  if (items.length === 0) return null;
  // duplicate for seamless marquee
  const loop = [...items, ...items];
  return (
    <div className={`overflow-hidden border-y border-primary/20 bg-background/60 backdrop-blur-md ${className}`}>
      <div className="flex animate-[marquee_45s_linear_infinite] gap-6 whitespace-nowrap py-2 text-xs sm:text-sm">
        {loop.map((w, i) => (
          <span key={i} className="flex items-center gap-2 px-3">
            <span className="text-primary">⚡</span>
            <span className="font-semibold text-foreground">{w.nick}</span>
            <span className="text-muted-foreground">{GAME_LABEL[w.game_code] ?? w.game_code}</span>
            <span className="text-emerald-400">×{Number(w.multiplier).toFixed(2)}</span>
            <span className="font-mono text-amber-300">+{fmt(Number(w.payout_phon_eq))} PHON</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

export default ApexBigWinTicker;
