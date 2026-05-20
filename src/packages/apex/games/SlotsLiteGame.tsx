import { useState } from "react";
import { Sparkles } from "lucide-react";
import { GlowCard } from "../components/GlowCard";
import { NeonButton } from "../components/NeonButton";
import { ParticleBurst } from "../components/ParticleBurst";
import { ApexFairBadge } from "./ProvablyFairBadge";
import { useApexGame } from "./useApexGame";
import type { HybridEngine } from "../engine";

const SYMS = ["💎", "🍒", "⭐", "7️⃣", "💎", "🍋"];

export default function SlotsLiteGame({ engine }: { engine?: HybridEngine }) {
  void engine;
  const [bet, setBet] = useState(100);
  const [reels, setReels] = useState<string[]>(["?", "?", "?"]);
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();

  async function spin() {
    const res = await play("slots_lite", { phon: bet }, {});
    if (!res?.ok) return;
    const arr: string[] = res.result?.reels ?? [SYMS[0], SYMS[1], SYMS[2]];
    // animate
    let ticks = 0;
    const it = setInterval(() => {
      setReels([SYMS[Math.floor(Math.random() * 6)], SYMS[Math.floor(Math.random() * 6)], SYMS[Math.floor(Math.random() * 6)]]);
      if (++ticks >= 10) {
        clearInterval(it);
        setReels(arr);
        if (Number(res.payout_phon) > bet) setBurst((x) => x + 1);
      }
    }, 60);
  }

  return (
    <div className="space-y-5">
      <ParticleBurst trigger={burst} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black apex-gradient-text flex items-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" /> SLOTS LITE
        </h1>
        <ApexFairBadge hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce} />
      </div>

      <GlowCard glow="magenta">
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {reels.map((r, i) => (
              <div key={i} className="aspect-square rounded-xl border-2 border-accent/40 bg-background/80 flex items-center justify-center text-6xl shadow-[inset_0_0_30px_hsl(var(--apex-magenta)/0.3)]">
                {r}
              </div>
            ))}
          </div>

          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Bet (PHON)</label>
            <input type="number" min={10} value={bet}
              onChange={(e) => setBet(Math.max(10, Number(e.target.value) || 10))}
              className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm font-bold" />
          </div>

          <NeonButton size="xl" variant="magenta" pulse className="w-full" onClick={spin} disabled={loading}>
            {loading ? "SPINNING…" : `SPIN · ${bet.toLocaleString()} PHON`}
          </NeonButton>
          <p className="text-center text-[10px] text-muted-foreground">3-reel · House Edge 3.0% · RTP 97.0%</p>
        </div>
      </GlowCard>
    </div>
  );
}
