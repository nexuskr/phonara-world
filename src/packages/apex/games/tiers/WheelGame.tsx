import { useMemo, useState } from "react";
import { CircleDot } from "lucide-react";
import { NeonButton } from "../../components/NeonButton";
import { ParticleBurst } from "../../components/ParticleBurst";
import { useApexGame } from "../useApexGame";
import { TierShell, BetInput } from "../_shared/TierShell";
import { TIER_S } from "../_shared/edge";

type Risk = "low" | "med" | "high";
const SEGMENTS: Record<Risk, number[]> = {
  low:  [1.5, 1.2, 1.2, 0, 1.5, 1.2, 1.2, 0, 1.5, 1.2],
  med:  [3.0, 0, 1.7, 0, 2.0, 0, 1.7, 0, 3.0, 0],
  high: [9.9, 0, 0, 0, 0, 9.9, 0, 0, 0, 0],
};

export default function WheelGame() {
  const t = TIER_S.wheel;
  const [bet, setBet] = useState(t.minBet);
  const [risk, setRisk] = useState<Risk>("med");
  const [burst, setBurst] = useState(0);
  const { play, loading, last } = useApexGame();
  const segs = SEGMENTS[risk];
  const angle = useMemo(() => last?.result?.angle ?? (Math.random() * 360), [last]);

  async function go() {
    const res = await play(t.backing, { phon: bet }, { risk, segments: segs.length });
    if (res?.ok && Number(res.payout_phon) > bet) setBurst((b) => b + 1);
  }

  return (
    <TierShell code="wheel" icon={<CircleDot className="w-7 h-7 text-primary" />}
      hash={last?.server_seed_hash} seed={last?.client_seed} nonce={last?.nonce}>
      <ParticleBurst trigger={burst} />
      <div className="space-y-5">
        <div className="relative mx-auto h-56 w-56">
          <div className="absolute inset-0 rounded-full border-4 border-primary/40 shadow-[0_0_40px_rgba(255,107,53,0.4)]"
            style={{ transform: `rotate(${angle}deg)`, transition: "transform 1.4s cubic-bezier(.2,.7,.2,1)" }}>
            {segs.map((m, i) => (
              <div key={i} className="absolute left-1/2 top-1/2 h-1 w-24 origin-left text-[10px] font-bold"
                style={{ transform: `rotate(${(360 / segs.length) * i}deg)`, color: m > 0 ? "#FFD479" : "#666" }}>
                <span className="ml-16">{m > 0 ? `${m}x` : "—"}</span>
              </div>
            ))}
          </div>
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 border-x-8 border-t-[14px] border-x-transparent border-t-primary" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["low", "med", "high"] as Risk[]).map((r) => (
            <button key={r} onClick={() => setRisk(r)}
              className={`rounded px-2 py-2 text-xs font-bold uppercase ${risk === r ? "bg-primary text-background" : "bg-white/5 text-muted-foreground"}`}>
              {r}
            </button>
          ))}
        </div>
        <BetInput value={bet} onChange={setBet} min={t.minBet} max={t.maxBet} />
        <NeonButton onClick={go} disabled={loading} className="w-full">
          {loading ? "SPINNING…" : "SPIN"}
        </NeonButton>
      </div>
    </TierShell>
  );
}
