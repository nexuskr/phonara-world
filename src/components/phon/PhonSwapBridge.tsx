/**
 * PhonSwapBridge — PHON ↔ KRW 교환의 "다리" 역할.
 *
 * 실제 스왑 RPC 가 아니라, 기존 입출금 흐름(/wallet)으로 정직하게 보내는 카드.
 * Pass 2 에서 swap_phon_krw 도입 시 이 컴포넌트가 진짜 스왑 패널로 교체됩니다.
 */
import { Link } from "react-router-dom";
import { ArrowDownToLine, ArrowUpFromLine, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function PhonSwapBridge() {
  return (
    <Card className="rounded-2xl border-primary/30 bg-card/60 p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[11px] tracking-[0.3em] font-black text-primary uppercase">
          PHON 교환
        </div>
        <span className="text-[10px] text-muted-foreground">즉시 처리</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/wallet?tab=deposit"
          className="group rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4 press"
        >
          <div className="flex items-center gap-2 text-primary mb-2">
            <ArrowDownToLine className="w-4 h-4" />
            <span className="font-imperial text-sm">KRW · USDT → PHON</span>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            원화나 USDT 로 충전하면 PHON 으로 자동 환산됩니다.
            <br />
            첫 입금 시 <span className="text-primary font-bold">+10% PHON</span> 즉시 지급.
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary opacity-80 group-hover:opacity-100">
            지금 충전 <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>

        <Link
          to="/wallet?tab=withdraw"
          className="group rounded-xl border border-pink/40 bg-gradient-to-br from-pink/10 to-transparent p-4 press"
        >
          <div className="flex items-center gap-2 text-pink mb-2">
            <ArrowUpFromLine className="w-4 h-4" />
            <span className="font-imperial text-sm">PHON → KRW · USDT</span>
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            보유한 PHON 을 원화나 USDT 로 출금합니다.
            <br />
            평균 처리 <span className="text-pink font-bold">10분 이내</span>, 영업일 기준.
          </div>
          <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-pink opacity-80 group-hover:opacity-100">
            지금 출금 <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>

      <div className="mt-3 text-[10px] text-muted-foreground/80 leading-relaxed">
        ※ 다이렉트 PHON ↔ KRW 스왑(단일 화면 즉시 교환)은 곧 공개됩니다.
        지금은 입금 · 출금이 동일한 결과를 가져옵니다.
      </div>
    </Card>
  );
}
