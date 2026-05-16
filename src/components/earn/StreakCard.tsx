import { motion } from "framer-motion";
import { CalendarCheck, Check } from "lucide-react";

interface Props {
  days: number;
  claimedToday: boolean;
  nextReward: number;
  onClaim: () => void;
}

export default function StreakCard({ days, claimedToday, nextReward, onClaim }: Props) {
  const dots = Array.from({ length: 7 }, (_, i) => i < (claimedToday ? days : days));
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-primary/30 bg-card p-5 flex flex-col gap-4"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </span>
          <div>
            <div className="text-base font-bold text-foreground">출석체크</div>
            <div className="text-xs text-muted-foreground">7일 연속이면 1,500 PHON</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground">오늘 받을 보상</div>
          <div className="text-lg font-black text-primary">+{nextReward.toLocaleString()}</div>
        </div>
      </header>

      <div className="flex items-center gap-1.5">
        {dots.map((on, i) => (
          <div
            key={i}
            className={`flex-1 h-2.5 rounded-full transition-colors ${
              i < days ? "bg-primary" : "bg-muted/40"
            }`}
            aria-label={`D${i + 1}`}
          />
        ))}
      </div>

      <button
        onClick={onClaim}
        disabled={claimedToday}
        className="h-12 rounded-xl font-bold text-base bg-primary text-primary-foreground disabled:bg-muted/40 disabled:text-muted-foreground transition active:scale-[0.98]"
      >
        {claimedToday ? (
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" /> 오늘 출석 완료
          </span>
        ) : (
          `+${nextReward.toLocaleString()} PHON 받기`
        )}
      </button>
    </motion.div>
  );
}
