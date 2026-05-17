import { Crown, ShieldCheck, Swords } from "lucide-react";

export function DuelHud({
  round,
  state,
  stake,
  onRoll,
  onOpenOracle,
  rollDisabled,
  lastReward,
}: {
  round: number;
  state: "idle" | "rolling" | "settled";
  stake: number;
  onRoll: () => void;
  onOpenOracle: () => void;
  rollDisabled: boolean;
  lastReward?: string | null;
}) {
  return (
    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
      <div className="imperial-card p-3 bg-black/45 border border-amber-400/25">
        <div className="text-[10px] tracking-[0.28em] font-black uppercase text-amber-300/75">Round</div>
        <div className="font-imperial text-xl text-amber-100 tabular-nums">#{round}</div>
      </div>
      <div className="imperial-card p-3 bg-black/45 border border-amber-400/25">
        <div className="text-[10px] tracking-[0.28em] font-black uppercase text-amber-300/75">Stake</div>
        <div className="font-imperial text-xl text-amber-100 tabular-nums">{stake.toLocaleString()} PHON</div>
      </div>
      <div className="imperial-card p-3 bg-black/45 border border-pink-400/30 col-span-2 md:col-span-1">
        <div className="text-[10px] tracking-[0.28em] font-black uppercase text-pink-300/85">Last Reward</div>
        <div className="font-imperial text-base text-amber-100 truncate">
          {lastReward ?? "황제의 첫 결투를 기다립니다"}
        </div>
      </div>

      <button
        type="button"
        onClick={onRoll}
        disabled={rollDisabled || state === "rolling"}
        className="col-span-2 md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-imperial tracking-[0.22em] text-base bg-gradient-to-r from-amber-400 via-amber-300 to-pink-500 text-[#1a0a05] font-black active:scale-[0.97] will-change-transform disabled:opacity-60"
        style={{ boxShadow: "0 0 22px hsl(38 92% 60% / 0.55), 0 0 38px hsl(330 90% 60% / 0.3)" }}
      >
        <Swords className="w-4 h-4" />
        {state === "rolling" ? "황실이 운명을 가르는 중…" : state === "settled" ? "다시 옥좌에 오르소서" : "옥좌에 오르소서"}
      </button>

      <button
        type="button"
        onClick={onOpenOracle}
        className="col-span-2 md:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-imperial tracking-[0.22em] text-sm border border-amber-400/45 text-amber-100 bg-black/40 hover:bg-black/60 active:scale-[0.97] will-change-transform"
      >
        <ShieldCheck className="w-4 h-4" />
        황실 검증
      </button>
    </div>
  );
}

export default DuelHud;
