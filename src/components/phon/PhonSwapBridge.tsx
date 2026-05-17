/**
 * PhonSwapBridge — Pass 2: 실동작 PhonSwapDialog 호출 + /wallet 보조 링크.
 */
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, ArrowDownUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { lazy, Suspense } from "react";

const PhonSwapDialog = lazy(() => import("@/components/phon/PhonSwapDialog"));

export default function PhonSwapBridge() {
  return (
    <Card className="rounded-2xl border-primary/30 bg-card/60 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] tracking-[0.3em] font-black text-primary uppercase">
          PHON 교환
        </div>
        <span className="text-[10px] text-muted-foreground">즉시 처리 · 2단계 인증</span>
      </div>

      <Suspense fallback={null}>
        <PhonSwapDialog
          trigger={
            <Button className="w-full min-h-14 bg-gradient-to-r from-primary to-pink text-primary-foreground font-bold text-base">
              <ArrowDownUp className="w-5 h-5 mr-2" />
              PHON ↔ 원화 즉시 교환
            </Button>
          }
        />
      </Suspense>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          to="/wallet?tab=deposit"
          className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3 press"
        >
          <div className="flex items-center gap-1.5 text-primary text-[11px] font-bold">
            <ArrowDownToLine className="w-3.5 h-3.5" /> 외부에서 충전
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">USDT · 원화 입금 시 PHON 자동 환산</div>
        </Link>
        <Link
          to="/wallet?tab=withdraw"
          className="rounded-xl border border-pink/30 bg-gradient-to-br from-pink/5 to-transparent p-3 press"
        >
          <div className="flex items-center gap-1.5 text-pink text-[11px] font-bold">
            <ArrowUpFromLine className="w-3.5 h-3.5" /> 외부로 출금
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">원화 · USDT 영업일 기준 평균 10분</div>
        </Link>
      </div>
    </Card>
  );
}
