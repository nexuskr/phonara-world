// Pass 2 — single achievement card (locked / in-progress / unlocked / claimed).
import { motion } from "framer-motion";
import { Lock, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AchievementRow } from "@/hooks/use-achievements-v3";

type Props = {
  row: AchievementRow;
  onClaim: (row: AchievementRow) => void;
  claiming: boolean;
};

export default function AchievementCard({ row, onClaim, claiming }: Props) {
  const unlocked = !!row.unlocked_at;
  const claimed = !!row.claimed_at;
  const pct = row.target > 0 ? Math.min(100, Math.round((row.progress / row.target) * 100)) : 0;

  const state: "claimed" | "claimable" | "progress" | "locked" =
    claimed ? "claimed" : unlocked ? "claimable" : row.progress > 0 ? "progress" : "locked";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
      className={[
        "relative overflow-hidden rounded-2xl border p-4 transition-colors",
        state === "claimed" && "border-emerald-500/30 bg-emerald-500/5",
        state === "claimable" && "border-amber-400/50 bg-gradient-to-br from-amber-500/15 via-yellow-400/5 to-transparent shadow-[0_8px_24px_-12px_rgba(245,196,74,0.5)]",
        state === "progress" && "border-border bg-card",
        state === "locked" && "border-border/60 bg-muted/30",
      ].filter(Boolean).join(" ")}
    >
      {state === "claimable" && (
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/50 pointer-events-none"
          animate={{ opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      )}

      <div className="flex items-start gap-3">
        <div
          className={[
            "text-2xl shrink-0 size-10 rounded-xl flex items-center justify-center",
            state === "locked" ? "bg-muted text-muted-foreground" : "bg-background/70",
          ].join(" ")}
          aria-hidden
        >
          {state === "locked" ? <Lock className="size-5" /> : row.icon || "🏆"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-sm break-keep truncate">{row.title}</div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
              T{row.tier}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 break-keep line-clamp-2">
            {row.description}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className={[
              "h-full rounded-full",
              state === "claimed"
                ? "bg-emerald-500"
                : state === "claimable"
                ? "bg-gradient-to-r from-amber-400 to-yellow-300"
                : "bg-gradient-to-r from-amber-500/60 to-yellow-400/60",
            ].join(" ")}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {row.progress.toLocaleString()} / {row.target.toLocaleString()}
          </span>
          <span className="text-amber-400 font-medium">+{row.reward_phon.toLocaleString()} PHON</span>
        </div>
      </div>

      <div className="mt-3">
        {state === "claimed" && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="size-3.5" /> 보상 수령 완료
          </div>
        )}
        {state === "claimable" && (
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 hover:from-amber-400 hover:to-yellow-300"
            disabled={claiming}
            onClick={() => onClaim(row)}
          >
            <Sparkles className="size-3.5 mr-1" />
            {claiming ? "수령 중…" : "보상 수령"}
          </Button>
        )}
        {state === "progress" && (
          <div className="text-[11px] text-muted-foreground">진행 중 — {pct}%</div>
        )}
        {state === "locked" && (
          <div className="text-[11px] text-muted-foreground">시작 전</div>
        )}
      </div>
    </motion.div>
  );
}
