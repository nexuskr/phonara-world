import { ShieldCheck } from "lucide-react";

/** 리스크 역전 — 7일 환불 보장 배지. */
export default function RiskReversal() {
  return (
    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
      <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
      <span>
        <span className="font-bold text-foreground">7일 무조건 환불 보장</span>
        <span> · 전자상거래법 기반</span>
      </span>
    </div>
  );
}
