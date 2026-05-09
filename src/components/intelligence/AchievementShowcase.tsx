import { useEffect, useMemo, useRef } from "react";
import { Award } from "lucide-react";
import { usePaperStore } from "@/lib/paper-trading/store";
import { computeAchievements } from "@/lib/paper-trading/analytics";
import { celebrate } from "@/lib/paper-trading/celebrate";

export default function AchievementShowcase() {
  const history = usePaperStore((s) => s.history);
  const paperCredit = usePaperStore((s) => s.paperCredit);
  const achievements = useMemo(() => computeAchievements(history, paperCredit), [history, paperCredit]);
  const unlocked = achievements.filter((a) => a.unlocked).length;

  // Detect newly unlocked achievements and celebrate
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(achievements.filter((a) => a.unlocked).map((a) => a.id));
    if (seenRef.current === null) {
      seenRef.current = ids;
      return;
    }
    for (const id of ids) {
      if (!seenRef.current.has(id)) {
        try { celebrate("big"); } catch { /* noop */ }
      }
    }
    seenRef.current = ids;
  }, [achievements]);

  return (
    <section className="glass rounded-3xl border border-primary/20 p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-primary" />
        <h2 className="font-display font-bold text-base">Achievements</h2>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          <span className="text-primary font-bold">{unlocked}</span> / {achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {achievements.map((a) => (
          <div
            key={a.id}
            title={`${a.name} — ${a.description}`}
            className={`relative rounded-2xl border p-3 text-center overflow-hidden transition ${
              a.unlocked
                ? "border-primary/50 bg-gradient-to-br from-primary/15 to-primary/5 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.6)]"
                : "border-border/40 bg-background/30 opacity-60"
            }`}
          >
            {a.unlocked && (
              <span className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/0 via-primary/10 to-primary/0 animate-pulse" />
            )}
            <div className={`text-2xl ${a.unlocked ? "" : "grayscale"}`}>{a.emoji}</div>
            <div className={`mt-1 text-[11px] font-bold leading-tight ${a.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
              {a.name}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight line-clamp-2">{a.description}</div>
            {!a.unlocked && a.progress !== undefined && a.progress > 0 && (
              <div className="mt-1.5 h-1 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary/70 transition-[width] duration-500"
                  style={{ width: `${Math.min(100, a.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
