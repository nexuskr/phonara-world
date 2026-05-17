/**
 * PhonLiveSocialProof — 라이브 FOMO 마키.
 * - "지금 N명의 폐하가 PHON 으로 트레이딩 중"
 * - 최근 수익 청산 마키 (30초 1회전)
 */
import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { usePhonTraders24h } from "@/hooks/use-phon-traders-24h";
import { useRecentPhonWins } from "@/hooks/use-recent-phon-wins";

export default function PhonLiveSocialProof() {
  const traders = usePhonTraders24h();
  const wins = useRecentPhonWins(8);

  const loop = wins.length > 0 ? [...wins, ...wins] : [];

  return (
    <div className="rounded-2xl border border-pink-400/30 bg-gradient-to-r from-rose-500/8 via-card/60 to-amber-400/8 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/30">
        <div className="relative shrink-0">
          <Flame className="w-4 h-4 text-rose-400" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        </div>
        <div className="text-xs">
          지금 <span className="font-black text-rose-300 tabular-nums">
            {traders.toLocaleString("ko-KR")}
          </span>
          <span className="text-muted-foreground">명의 폐하가 PHON 으로 트레이딩 중</span>
        </div>
      </div>

      {loop.length === 0 ? (
        <div className="px-4 py-2.5 text-[11px] text-muted-foreground">
          첫 PHON 수익을 폐하께서 만들어 보세요 · 24시간 안에 여기에 표시돼요
        </div>
      ) : (
        <div className="relative overflow-hidden h-9">
          <motion.div
            className="absolute inset-y-0 left-0 flex items-center gap-6 whitespace-nowrap will-change-transform"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: Math.max(20, loop.length * 3), ease: "linear", repeat: Infinity }}
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
      )}
    </div>
  );
}
