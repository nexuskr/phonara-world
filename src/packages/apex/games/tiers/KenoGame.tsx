import { useState } from "react";
import { Grid3x3 } from "lucide-react";
import { NeonButton } from "../../components/NeonButton";
import { ParticleBurst } from "../../components/ParticleBurst";
import { useApexGame } from "../useApexGame";
import { TierShell, BetInput } from "../_shared/TierShell";
import { TIER_S } from "../_shared/edge";

const CELLS = Array.from({ length: 40 }, (_, i) => i + 1);
const MAX_PICKS = 10;

export default function KenoGame() {
  const t = TIER_S.keno;
  const [bet, setBet] = useState(t.minBet);
  const [picks, setPicks] = useState<number[]>([]);
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();
  const drawn: number[] = last?.result?.drawn ?? [];

  function toggle(n: number) {
    setPicks((p) => p.includes(n) ? p.filter((x) => x !== n) : p.length < MAX_PICKS ? [...p, n] : p);
  }
  async function go() {
    if (picks.length === 0) return;
    const res = await play(t.backing, { phon: bet }, { picks });
    if (res?.ok && Number(res.payout_phon) > bet) setBurst((b) => b + 1);
  }

  return (
    <TierShell code="keno" icon={<Grid3x3 className="w-7 h-7 text-primary" />}
      hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce}>
      <ParticleBurst trigger={burst} />
      <div className="space-y-5">
        <div className="grid grid-cols-8 gap-1.5">
          {CELLS.map((n) => {
            const isPicked = picks.includes(n);
            const isHit = drawn.includes(n);
            return (
              <button key={n} onClick={() => toggle(n)}
                className={`aspect-square rounded text-xs font-bold transition ${
                  isHit && isPicked ? "bg-amber-400 text-background shadow-[0_0_10px_rgba(255,212,121,0.8)]" :
                  isPicked ? "bg-primary text-background" :
                  isHit ? "bg-amber-500/30 text-amber-300" :
                  "bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}>{n}</button>
            );
          })}
        </div>
        <div className="text-center text-xs text-muted-foreground">
          {picks.length}/{MAX_PICKS} picked · RTP 95%
        </div>
        <BetInput value={bet} onChange={setBet} min={t.minBet} max={t.maxBet} />
        <NeonButton onClick={go} disabled={loading || picks.length === 0} className="w-full">
          {loading ? "DRAWING…" : "DRAW"}
        </NeonButton>
      </div>
    </TierShell>
  );
}
