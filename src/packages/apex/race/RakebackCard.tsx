/**
 * P3-D — Rakeback claim CTA card.
 */
import { useRakeback, RAKEBACK_TABLE } from "./useRakeback";
import { GlowCard } from "@/packages/apex/components/GlowCard";
import { Button } from "@/components/ui/button";

export function RakebackCard() {
  const { busy, claim } = useRakeback();
  return (
    <GlowCard>
      <div className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-300/80">Rakeback</div>
            <div className="text-xl font-bold">매일 자동 누적, 클릭 한 번에 수령</div>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
          {Object.entries(RAKEBACK_TABLE).map(([tier, pct]) => (
            <div key={tier} className="rounded bg-white/5 px-1 py-2">
              <div className="uppercase text-muted-foreground">{tier}</div>
              <div className="font-bold text-emerald-300">{(pct * 100).toFixed(1)}%</div>
            </div>
          ))}
        </div>
        <Button onClick={claim} disabled={busy} className="w-full">
          {busy ? "처리중…" : "Rakeback 수령"}
        </Button>
      </div>
    </GlowCard>
  );
}

export default RakebackCard;
