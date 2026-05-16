import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { G } from "@/lib/glossary";
import { setVisibleInterval } from "@/lib/util/visible-interval";

interface Props {
  active: boolean;
  multiplier: number;
  endsAt?: string | null;
}

function fmtRemain(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}일 ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function VipBoostCard({ active, multiplier, endsAt }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || !endsAt) return;
    return setVisibleInterval(() => setTick((n) => n + 1), 1000, { meta: { owner: "VipBoostCard", category: "cosmetic" } });
  }, [active, endsAt]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.18 }}
      className={`rounded-2xl border p-5 flex flex-col gap-4 relative overflow-hidden ${
        active
          ? "border-pink-400/50 bg-gradient-to-br from-pink-500/10 via-card to-amber-400/10"
          : "border-border/60 bg-card"
      }`}
    >
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-pink-500/20 blur-3xl" aria-hidden />

      <header className="flex items-center gap-2 relative">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? "bg-pink-500/20 text-pink-300" : "bg-muted/30 text-muted-foreground"}`}>
          <Crown className="w-5 h-5" />
        </span>
        <div>
          <div className="text-base font-bold text-foreground">
            {active ? G.earnVipBoostOn : G.earnVipBoostOff}
          </div>
          <div className="text-sm text-muted-foreground">
            {active ? `모든 미션/룰렛/공유 보상 ×${multiplier}` : G.earnVipBoostHint}
          </div>
        </div>
      </header>

      {active ? (
        <div className="rounded-xl bg-background/60 border border-pink-400/30 p-4 text-center relative">
          <div className="text-[10px] text-muted-foreground tracking-widest">{G.earnVipBoostEndsIn}</div>
          <div className="text-2xl font-black tabular-nums text-pink-300 mt-1" key={tick}>
            {endsAt ? fmtRemain(endsAt) : "—"}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-background/50 border border-border/40 p-4 text-center">
          <div className="text-[10px] text-muted-foreground tracking-widest">예상 추가 적립</div>
          <div className="text-2xl font-black tabular-nums text-amber-300 mt-1">+2,000 ~ +3,000 PHON / 일</div>
        </div>
      )}

      <Link
        to="/vip"
        className={`min-h-[52px] rounded-xl font-black text-base inline-flex items-center justify-center gap-2 active:scale-[0.98] transition shadow-lg ${
          active
            ? "bg-background/60 text-pink-300 border border-pink-400/40"
            : "bg-gradient-to-r from-pink-500 to-amber-400 text-black"
        }`}
      >
        <Zap className="w-5 h-5" /> {active ? "VIP 혜택 보기" : G.earnVipBoostCta}
      </Link>
    </motion.div>
  );
}
