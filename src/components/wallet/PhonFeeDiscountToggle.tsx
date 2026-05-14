/**
 * PhonFeeDiscountToggle — 출금 화면 PHON 수수료 할인 토글
 * 토글 ON + 활성화 버튼 → spend_phon_for_fee_discount(amount) 호출
 * 활성화 시 다음 출금 1회에 할인 슬롯 적립 (서버 RPC 보관)
 */
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Coins, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMyPower } from "@/hooks/use-my-power";
import { spendPhonForFeeDiscount, PHON_COSTS } from "@/lib/phonSpend";
import { notify } from "@/lib/notify";

export default function PhonFeeDiscountToggle({ withdrawAmount }: { withdrawAmount: number }) {
  const { phon } = useMyPower();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activated, setActivated] = useState(false);

  // 권장 PHON: 출금액 1만원당 1 PHON, 최대 1000
  const recommended = Math.min(PHON_COSTS.feeDiscountMax, Math.max(PHON_COSTS.feeDiscountMin, Math.floor((withdrawAmount || 0) / 10000)));
  const canActivate = phon >= recommended && recommended >= PHON_COSTS.feeDiscountMin && !activated;

  async function activate() {
    if (!canActivate) return;
    setBusy(true);
    try {
      await spendPhonForFeeDiscount(recommended);
      setActivated(true);
      notify.success(`수수료 50% 할인 슬롯 활성 · ${recommended} PHON 사용됨`);
    } catch (e: any) {
      notify.error(e.message ?? "활성화 실패");
    } finally { setBusy(false); }
  }

  return (
    <div className={`rounded-xl p-3 border transition ${enabled ? "border-primary/50 bg-primary/[0.04]" : "border-border/40 glass"}`}>
      <div className="flex items-center gap-3">
        <Coins className={`w-4 h-4 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
        <div className="flex-1">
          <div className="text-xs font-black flex items-center gap-1.5">
            PHON으로 수수료 할인 받기
            {activated && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">활성</span>}
          </div>
          <div className="text-[10px] text-muted-foreground">
            보유 {phon.toLocaleString()} PHON · 다음 출금 1회 50% 할인
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} disabled={activated} />
      </div>

      {enabled && !activated && (
        <div className="mt-3 pt-3 border-t border-border/40 space-y-2">
          {phon < PHON_COSTS.feeDiscountMin ? (
            <div className="text-[11px] text-destructive flex items-center justify-between">
              <span>PHON이 부족합니다</span>
              <Link to="/packages" className="text-primary underline-offset-2 hover:underline">패키지 보기 →</Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">사용할 PHON</span>
                <span className="font-mono font-bold tabular-nums">{recommended} PHON</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">예상 절감</span>
                <span className="font-bold text-primary tabular-nums">−{(recommended * 50).toLocaleString()}원</span>
              </div>
              <Button
                size="sm"
                disabled={!canActivate || busy}
                onClick={activate}
                className="w-full h-8 text-[11px] font-bold mt-1"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "할인 슬롯 활성화"}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
