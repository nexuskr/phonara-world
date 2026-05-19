import { useMemo, useState } from "react";
import { Dice5 } from "lucide-react";
import { GlowCard } from "../components/GlowCard";
import { NeonButton } from "../components/NeonButton";
import { ParticleBurst } from "../components/ParticleBurst";
import { ApexFairBadge } from "./ProvablyFairBadge";
import { useApexGame } from "./useApexGame";

export default function DiceGame() {
  const [target, setTarget] = useState(50);
  const [side, setSide] = useState<"under" | "over">("under");
  const [bet, setBet] = useState(100);
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();

  const winChance = side === "under" ? target : 100 - target;
  const multiplier = useMemo(() => +(99 / winChance).toFixed(4), [winChance]);

  async function handleRoll() {
    const res = await play("dice", { phon: bet }, { target, side });
    if (res?.ok && Number(res.payout_phon) > bet) setBurst((b) => b + 1);
  }

  const rollValue = last?.result?.roll;

  return (
    <div className="space-y-5">
      <ParticleBurst trigger={burst} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black apex-gradient-text flex items-center gap-2">
          <Dice5 className="w-7 h-7 text-primary" /> DICE
        </h1>
        <ApexFairBadge hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce} />
      </div>

      <GlowCard>
        <div className="p-6 space-y-5">
          <div className="text-center">
            <div className="text-6xl font-black apex-text-neon tabular-nums">
              {typeof roll === "number" ? roll.toFixed(2) : "--.--"}
            </div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
              {last?.result ? (Number(last.payout_phon) > bet ? "WIN" : "LOSS") : "ready"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target {side === "under" ? "<" : ">"} {target}</span>
              <span>{winChance.toFixed(2)}% chance</span>
            </div>
            <input
              type="range" min={2} max={98} value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("under")}
              className={`rounded-lg py-2 text-xs font-bold border transition ${side === "under" ? "border-primary bg-primary/15 apex-text-neon" : "border-border text-muted-foreground"}`}
            >ROLL UNDER</button>
            <button
              onClick={() => setSide("over")}
              className={`rounded-lg py-2 text-xs font-bold border transition ${side === "over" ? "border-accent bg-accent/15 apex-text-magenta" : "border-border text-muted-foreground"}`}
            >ROLL OVER</button>
          </div>

          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-2">
              <label className="text-[10px] uppercase text-muted-foreground">Bet (PHON)</label>
              <input
                type="number" min={10} value={bet}
                onChange={(e) => setBet(Math.max(10, Number(e.target.value) || 10))}
                className="mt-1 w-full rounded-lg bg-input border border-border px-3 py-2 text-sm font-bold"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Payout</div>
              <div className="apex-text-neon font-black text-lg">{multiplier}x</div>
            </div>
          </div>

          <NeonButton size="xl" pulse className="w-full" onClick={roll} disabled={loading}>
            {loading ? "ROLLING…" : `ROLL · ${bet.toLocaleString()} PHON`}
          </NeonButton>
          <p className="text-center text-[10px] text-muted-foreground">House Edge 1.0% · RTP 99.0% · Daily Cap 50</p>
        </div>
      </GlowCard>
    </div>
  );
}
