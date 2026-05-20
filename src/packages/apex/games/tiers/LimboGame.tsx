import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { NeonButton } from "../../components/NeonButton";
import { ParticleBurst } from "../../components/ParticleBurst";
import { useApexGame } from "../useApexGame";
import { TierShell, BetInput } from "../_shared/TierShell";
import { TIER_S } from "../_shared/edge";

export default function LimboGame() {
  const t = TIER_S.limbo;
  const [bet, setBet] = useState(t.minBet);
  const [target, setTarget] = useState(2.0);
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();
  const winChance = +(99 / target).toFixed(4);
  const rolled = Number(last?.result?.crash_at ?? last?.multiplier ?? 0);

  async function go() {
    const res = await play(t.backing, { phon: bet }, { target });
    if (res?.ok && Number(res.payout_phon) > bet) setBurst((b) => b + 1);
  }

  return (
    <TierShell code="limbo" icon={<TrendingUp className="w-7 h-7 text-primary" />}
      hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce}>
      <ParticleBurst trigger={burst} />
      <div className="space-y-5">
        <div className="text-center">
          <div className={`text-6xl font-black tabular-nums ${rolled >= target ? "apex-text-neon" : "text-muted-foreground"}`}>
            {rolled > 0 ? `${rolled.toFixed(2)}x` : `${target.toFixed(2)}x`}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            target {target.toFixed(2)}x · {winChance.toFixed(2)}% win
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Target multiplier</span>
            <span className="tabular-nums">{target.toFixed(2)}x</span>
          </div>
          <input type="number" min={1.01} max={1_000_000} step={0.01} value={target}
            onChange={(e) => setTarget(Math.max(1.01, Number(e.target.value) || 1.01))}
            className="w-full rounded bg-background/60 px-3 py-2 text-sm" />
        </div>
        <BetInput value={bet} onChange={setBet} min={t.minBet} max={t.maxBet} />
        <NeonButton onClick={go} disabled={loading} className="w-full">
          {loading ? "ROLLING…" : `BET ${(target).toFixed(2)}x`}
        </NeonButton>
      </div>
    </TierShell>
  );
}
