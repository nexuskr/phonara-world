import { useState } from "react";
import { Flame } from "lucide-react";
import { NeonButton } from "../../components/NeonButton";
import { ParticleBurst } from "../../components/ParticleBurst";
import { useApexGame } from "../useApexGame";
import { TierShell, BetInput } from "../_shared/TierShell";
import { TIER_S } from "../_shared/edge";

export default function PumpGame() {
  const t = TIER_S.pump;
  const [bet, setBet] = useState(t.minBet);
  const [target, setTarget] = useState(2.0);
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();

  async function go() {
    const res = await play(t.backing, { phon: bet }, { auto_cashout: target });
    if (res?.ok && Number(res.payout_phon) > bet) setBurst((b) => b + 1);
  }

  return (
    <TierShell code="pump" icon={<Flame className="w-7 h-7 text-primary" />}
      hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce}>
      <ParticleBurst trigger={burst} />
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-6xl font-black apex-text-neon tabular-nums">
            {last?.result?.crash_at ? `${Number(last.result.crash_at).toFixed(2)}x` : `${target.toFixed(2)}x`}
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">
            {last ? (Number(last.payout_phon) > bet ? "PUMP!" : "RUG") : "ready"}
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Auto cashout</span>
            <span className="tabular-nums">{target.toFixed(2)}x · {(99 / target).toFixed(2)}%</span>
          </div>
          <input type="range" min={1.1} max={50} step={0.05} value={target}
            onChange={(e) => setTarget(Number(e.target.value))} className="w-full accent-primary" />
        </div>
        <BetInput value={bet} onChange={setBet} min={t.minBet} max={t.maxBet} />
        <NeonButton onClick={go} disabled={loading} className="w-full">
          {loading ? "PUMPING…" : `PUMP @ ${target.toFixed(2)}x`}
        </NeonButton>
      </div>
    </TierShell>
  );
}
