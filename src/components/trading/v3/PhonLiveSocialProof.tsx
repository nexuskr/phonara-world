/**
 * PhonLiveSocialProof — 라이브 FOMO 마키 (Global #1 Floor).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { usePhonTraders24h } from "@/hooks/use-phon-traders-24h";
import { useRecentPhonWins } from "@/hooks/use-recent-phon-wins";
import { fakePhonWins, mergeCount, phonTradersFloor, type FakeWin } from "@/lib/fakeTradingFloor";

export default function PhonLiveSocialProof() {
  const traders = usePhonTraders24h();
  const wins = useRecentPhonWins(8);
  const [floor, setFloor] = useState<number>(() => phonTradersFloor());
  const [fakes, setFakes] = useState<FakeWin[]>(() => fakePhonWins(16));
  useEffect(() => {
    const id = window.setInterval(() => {
      setFloor(phonTradersFloor());
      setFakes(fakePhonWins(16));
    }, 38_000);
    return () => window.clearInterval(id);
  }, []);

  const tradersDisplay = mergeCount(traders, floor);
  const merged = wins.length > 0
    ? [...wins, ...fakes].slice(0, 22)
    : fakes;
  const loop = merged.length > 0 ? [...merged, ...merged] : [];

  return (
    <div className="rounded-2xl border border-pink-400/30 bg-gradient-to-r from-rose-500/8 via-card/60 to-amber-400/8 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30">
        <div className="relative shrink-0">
          <Flame className="w-4 h-4 text-rose-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </div>
        <div className="text-xs">
          <span className="font-black text-amber-200 mr-1">황제들의 승리 기록</span>
          <span className="text-muted-foreground">·</span>
          <span className="ml-1">지금 </span>
          <span className="font-black text-rose-300 tabular-nums">
            {tradersDisplay.toLocaleString("ko-KR")}
          </span>
          <span className="text-muted-foreground">명의 폐하가 PHON 으로 실시간 트레이딩 중</span>
        </div>
      </div>

      <div className="relative overflow-hidden h-9">
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center gap-6 whitespace-nowrap will-change-transform"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: Math.max(28, loop.length * 2.4), ease: "linear", repeat: Infinity }}
        >
          {loop.map((w, i) => (
            <span key={`${w.closed_at}-${i}`} className="text-[11px] flex items-center gap-1.5 px-2">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span className="text-amber-200 font-bold">👑 {w.masked_nick}</span>
              <span className="text-muted-foreground">님이</span>
              <span className="font-black tabular-nums text-emerald-300">
                +{Math.floor(Number(w.pnl_phon)).toLocaleString("ko-KR")} PHON
              </span>
              <span className="text-muted-foreground">수익 실현</span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
