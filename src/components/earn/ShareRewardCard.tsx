import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { fireBigWinShare } from "@/lib/bigwinShare";

interface Props {
  claimedChannels: string[];
  amountEach: number;
}

const TOTAL_CHANNELS = 8;

export default function ShareRewardCard({ claimedChannels, amountEach }: Props) {
  const done = claimedChannels.length;
  const remain = Math.max(0, TOTAL_CHANNELS - done);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      className="rounded-2xl border border-secondary/40 bg-card p-5 flex flex-col gap-4"
    >
      <header className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl bg-secondary/20 text-secondary-foreground flex items-center justify-center">
          <Share2 className="w-5 h-5" />
        </span>
        <div>
          <div className="text-base font-bold text-foreground">공유하고 받기</div>
          <div className="text-xs text-muted-foreground">
            8개 채널 · 채널당 +{amountEach.toLocaleString()} PHON
          </div>
        </div>
      </header>

      <div className="rounded-xl bg-background/50 border border-border/40 p-4 text-center">
        <div className="text-[10px] text-muted-foreground tracking-widest">오늘 남은 채널</div>
        <div className="text-3xl font-black text-foreground tabular-nums mt-1">
          {remain}<span className="text-base text-muted-foreground"> / {TOTAL_CHANNELS}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          최대 +{(remain * amountEach).toLocaleString()} PHON 추가 적립 가능
        </div>
      </div>

      <button
        onClick={() => fireBigWinShare({ amount: 50000, symbol: "PHON" })}
        className="h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground active:scale-[0.98] transition"
      >
        공유 이미지 만들기
      </button>
    </motion.div>
  );
}
