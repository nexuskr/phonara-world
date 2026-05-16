import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  claimed: boolean;
  amount: number;
  onClaim: () => void;
}

export default function PlayToEarnCard({ claimed, amount, onClaim }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.15 }}
      className="rounded-2xl border border-primary/40 bg-card p-5 flex flex-col gap-4 relative overflow-hidden"
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-primary/10 blur-2xl" aria-hidden />
      <header className="flex items-center gap-2 relative">
        <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <div className="text-base font-bold text-foreground">오늘 한 게임</div>
          <div className="text-xs text-muted-foreground">어느 게임이든 1판이면 +{amount} PHON</div>
        </div>
      </header>

      <div className="rounded-xl bg-background/50 border border-border/40 p-4 text-center relative">
        <div className="text-[10px] text-muted-foreground tracking-widest">오늘의 보상</div>
        <div className="text-3xl font-black text-primary tabular-nums mt-1">+{amount.toLocaleString()}</div>
      </div>

      <div className="grid grid-cols-2 gap-2 relative">
        <Link
          to="/games"
          className="h-12 rounded-xl font-bold text-sm border border-border/60 bg-background/40 hover:bg-background/60 active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
        >
          게임하기 <ArrowRight className="w-4 h-4" />
        </Link>
        <button
          onClick={onClaim}
          disabled={claimed}
          className="h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground disabled:bg-muted/40 disabled:text-muted-foreground active:scale-[0.98] transition inline-flex items-center justify-center gap-1.5"
        >
          {claimed ? (
            <>
              <Check className="w-4 h-4" /> 받음
            </>
          ) : (
            "보상 받기"
          )}
        </button>
      </div>
    </motion.div>
  );
}
