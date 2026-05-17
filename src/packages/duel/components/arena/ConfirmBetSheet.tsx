/**
 * ConfirmBetSheet — 봉납 확정 BottomSheet (Shadow PROOF MODE).
 */
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Crown, Swords, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  side: "left" | "right" | null;
  sideName: string;
  amount: number;
  odds: number;
  shadowBalance: number;
  serverSeedHashPreview?: string;
  onConfirm: () => void;
}

export function ConfirmBetSheet({
  open, onOpenChange, side, sideName, amount, odds, shadowBalance,
  serverSeedHashPreview, onConfirm,
}: Props) {
  const projected = Math.round(amount * odds);
  const net = projected - amount;
  const insufficient = amount > shadowBalance;
  const flavor = side === "left" ? "amber" : "pink";

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={<span className="font-imperial tracking-[0.18em] text-amber-100">옥좌에 봉납하시겠습니까</span>}
      description="시뮬레이션 PHON · 실잔액 변동 없음 · PROOF MODE"
    >
      <div className="px-4 pb-3 space-y-3">
        <div className={`rounded-2xl border-2 ${flavor === "amber" ? "border-amber-400/55" : "border-pink-400/55"} bg-black/45 p-3.5`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.26em] font-black uppercase text-amber-300/85">진영</span>
            <span className={`font-imperial text-base ${flavor === "amber" ? "text-amber-100" : "text-pink-100"}`}>{sideName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat k="봉납액" v={`${amount.toLocaleString()} PHON`} />
            <Stat k="배당" v={`×${odds.toFixed(2)}`} />
            <Stat k="예상" v={`${projected.toLocaleString()}`} accent />
          </div>
          <div className="mt-2 text-[11px] text-amber-200/85 tabular-nums flex items-center justify-between">
            <span>승리 시 순이익</span>
            <span className="font-black text-amber-100">+{net.toLocaleString()} PHON</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-400/25 bg-gradient-to-br from-[#160a05] to-[#0A0503] p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] tracking-[0.26em] font-black uppercase text-amber-300/85">
            <ShieldCheck className="w-3 h-3" /> 황실 봉인
          </div>
          <div className="font-mono text-[10px] text-amber-100/90 break-all">
            {serverSeedHashPreview ?? "—"}
          </div>
          <p className="text-[10.5px] text-amber-200/75 leading-snug break-keep">
            결투 직후 서버 시드가 공개되어 HMAC-SHA512 / Halo2 Recursive / zk-STARK 로 폐하께서 직접 검증하실 수 있습니다.
          </p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-amber-200/85 tabular-nums px-1">
          <span>나의 가상 잔고</span>
          <span className="font-black text-amber-100">{shadowBalance.toLocaleString()} PHON</span>
        </div>
        {insufficient && (
          <p className="text-[11px] text-pink-300 text-center">잔고가 부족합니다 — 다음 라운드에서 다시 봉납하소서</p>
        )}

        <button
          type="button"
          disabled={insufficient || !side}
          onClick={onConfirm}
          className="w-full inline-flex items-center justify-center gap-2 rounded-2xl py-4 font-imperial tracking-[0.22em] text-sm bg-gradient-to-r from-amber-400 via-amber-300 to-pink-500 text-[#1a0a05] font-black active:scale-[0.97] will-change-transform disabled:opacity-40"
          style={{ minHeight: 56, boxShadow: "0 0 18px hsl(38 92% 60% / 0.55)" }}
        >
          <Crown className="w-4 h-4" />
          봉납 확정 · 결투 입장
          <Swords className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="w-full rounded-xl py-2.5 text-[12px] font-black text-amber-300/85 border border-amber-400/25 active:scale-[0.98]"
        >
          취소
        </button>
      </div>
    </BottomSheet>
  );
}

function Stat({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-black/45 border border-amber-400/20 px-2 py-1.5">
      <div className="text-[9px] tracking-[0.22em] font-black uppercase text-amber-300/75">{k}</div>
      <div className={`font-imperial text-sm tabular-nums ${accent ? "text-amber-100" : "text-amber-200/90"}`}>{v}</div>
    </div>
  );
}

export default ConfirmBetSheet;
