import { useEffect, useRef, useState } from "react";
import { useDB, formatKRW, MAIN_MILESTONE_AMOUNT, MAIN_MAX_INTERVAL_MS, MINI_MAX_INTERVAL_MS, jackpotPayoutPct, jackpotResetBase, miniJackpotResetBase, miniJackpotAmount, randomFakeNick, type Tier } from "@/lib/store";
import { Flame, Crown, Trophy, Sparkles } from "lucide-react";

// Global jackpot ticker that grows every second (shared across all sessions via localStorage).
// Auto-explodes when milestone reached or interval expired (rare bot-claimed → fake winner shown).
export function useJackpotEngine() {
  const [, setDb] = useDB();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const tick = () => {
      setDb(d => {
        const now = Date.now();
        const j = { ...d.jackpot };
        // Organic growth from simulated game contributions (8% of stakes)
        j.amount += Math.floor(3000 + Math.random() * 18000);
        j.mini   += Math.floor(400 + Math.random() * 2200);
        j.totalContrib += 1;

        // Main explosion: hit milestone (3천만원) OR 6h cap
        const milestoneHit = j.amount >= MAIN_MILESTONE_AMOUNT;
        const timeExpired = now - j.lastMainExplode > MAIN_MAX_INTERVAL_MS;
        if (milestoneHit || timeExpired) {
          const won = Math.floor(j.amount * jackpotPayoutPct());
          const tiers: Tier[] = ["EMPIRE","EMPIRE","EMPIRE","GOD","VIP"];
          const wt = tiers[Math.floor(Math.random() * tiers.length)];
          j.recentWins = [{ nickname: randomFakeNick(), amount: won, tier: wt, when: now, type: "main" as const }, ...j.recentWins].slice(0, 12);
          // Reset pool to random 1천만~1.5천만원 base
          j.amount = jackpotResetBase();
          j.lastMainExplode = now;
        }
        // Mini explosion (every 1h or amount cap)
        if (now - j.lastMiniExplode > MINI_MAX_INTERVAL_MS || j.mini > 3_000_000) {
          const won = miniJackpotAmount();
          const tiers: Tier[] = ["NORMAL","NORMAL","VIP","GOD"];
          const wt = tiers[Math.floor(Math.random() * tiers.length)];
          j.recentWins = [{ nickname: randomFakeNick(), amount: won, tier: wt, when: now, type: "mini" as const }, ...j.recentWins].slice(0, 12);
          j.mini = miniJackpotResetBase();
          j.lastMiniExplode = now;
        }
        return { ...d, jackpot: j };
      });
    };
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [setDb]);
}

export default function JackpotBanner({ compact = false }: { compact?: boolean }) {
  useJackpotEngine();
  const [db] = useDB();
  const j = db.jackpot;
  const [pulse, setPulse] = useState(false);
  const prev = useRef(j.amount);
  useEffect(() => {
    if (j.amount < prev.current - 1_000_000) { setPulse(true); setTimeout(() => setPulse(false), 1500); }
    prev.current = j.amount;
  }, [j.amount]);

  const nextMs = Math.max(0, j.lastMainExplode + MAIN_MAX_INTERVAL_MS - Date.now());
  const h = Math.floor(nextMs / 3_600_000);
  const m = Math.floor((nextMs % 3_600_000) / 60_000);
  const nextMile = MAIN_MILESTONE_AMOUNT;
  const pctMile = Math.min(100, (j.amount / nextMile) * 100);

  if (compact) {
    return (
      <div className="glass-strong neon-border rounded-2xl p-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-cyber opacity-20" />
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gold/40 blur-2xl animate-pulse" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-gold flex items-center justify-center glow-gold animate-crown">
            <Crown className="w-5 h-5 text-gold-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[9px] tracking-widest text-gold font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> MEGA JACKPOT · LIVE
            </div>
            <div className="font-display font-black text-base sm:text-lg text-gradient-gold tabular-nums truncate">{formatKRW(j.amount)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-3xl p-5 overflow-hidden ${pulse ? "animate-pulse-glow" : ""}`}>
      <div className="absolute inset-0 glass-strong rounded-3xl neon-border" />
      <div className="absolute inset-0 bg-gradient-cyber opacity-25 rounded-3xl" />
      <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-gold/40 blur-3xl animate-float" />
      <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-accent/40 blur-3xl animate-float-slow" />
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9px] tracking-[0.3em] text-gold font-black flex items-center gap-1">
              <Flame className="w-3 h-3" /> PROGRESSIVE MEGA JACKPOT
            </span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary/20 text-secondary font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> LIVE
          </span>
        </div>

        <div className="mt-2 flex items-end gap-2">
          <div className="font-display font-black text-3xl sm:text-5xl text-gradient-gold tabular-nums leading-none">
            {formatKRW(j.amount)}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          미니 잭팟 <span className="text-secondary font-bold tabular-nums">{formatKRW(j.mini)}</span> · 다음 자동 폭발 <span className="text-primary font-bold">{h}h {m}m</span>
        </div>

        {/* Milestone progress */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>다음 마일스톤</span>
            <span className="tabular-nums">{formatKRW(nextMile)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden relative">
            <div className="h-full bg-gradient-gold glow-gold transition-all duration-500" style={{ width: `${pctMile}%` }} />
            <div className="absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent,hsl(0_0%_100%_/_0.25),transparent)] bg-[length:200%_100%]" />
          </div>
        </div>

        {/* Recent winners */}
        <div className="mt-3 grid grid-cols-1 gap-1.5">
          {j.recentWins.slice(0, 3).map((w, i) => (
            <div key={i} className="glass rounded-xl px-3 py-2 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                {w.type === "main" ? <Trophy className="w-3.5 h-3.5 text-gold" /> : <Sparkles className="w-3.5 h-3.5 text-secondary" />}
                <span className="font-bold">{w.nickname}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${w.tier === "EMPIRE" ? "bg-gold/20 text-gold" : w.tier === "GOD" ? "bg-accent/20 text-accent" : w.tier === "VIP" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>{w.tier}</span>
              </div>
              <div className="font-display font-black text-gradient-gold tabular-nums">+{formatKRW(w.amount)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
