import { Link } from "react-router-dom";
import { Sparkles, Wallet } from "lucide-react";
import { useDB, formatKRW } from "@/lib/store";
import { isPracticeMode } from "@/lib/practiceMode";

/**
 * CosmicSidePanel — 슬림한 우측 패널 (PHON 잔액 + Practice + SIM)
 * 데스크톱 전용 floating, 모바일에서는 숨김 (정보는 TopHUD/Triad에 이미 노출).
 */
export default function CosmicSidePanel() {
  const [db] = useDB();
  const user = db.user;
  if (!user) return null;
  const practice = isPracticeMode();

  return (
    <aside className="hidden lg:flex absolute top-6 right-6 z-20 flex-col gap-2 w-56 pointer-events-none">
      <div
        className="pointer-events-auto rounded-xl px-3 py-2.5 border border-gold/35 backdrop-blur-md"
        style={{
          background: "hsl(240 35% 6% / 0.7)",
          boxShadow: "inset 0 1px 0 hsl(var(--gold) / 0.2)",
        }}
      >
        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.35em] text-gold/80 font-black">
          <Wallet className="w-3 h-3" /> PHON BALANCE
        </div>
        <div className="mt-0.5 font-display font-black text-base text-money-strong tabular-nums">
          {formatKRW(user.balance)}
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black border"
          style={{
            color: "hsl(var(--sim-gold))",
            borderColor: "hsl(var(--sim-gold) / 0.5)",
            background: "hsl(var(--sim-gold) / 0.08)",
          }}
        >
          <Sparkles className="w-3 h-3" /> SIM
        </span>
        {practice && (
          <Link
            to="/wallet"
            className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-black border border-secondary/50 text-secondary bg-secondary/10"
          >
            PRACTICE
          </Link>
        )}
      </div>
    </aside>
  );
}
