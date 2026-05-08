import { TrendingUp } from "lucide-react";

/** 진행도 락인 — "활동점수 73 / 결제 시 즉시 활성". */
export default function ProgressLockIn({
  score = 73,
  required = 100,
}: {
  score?: number;
  required?: number;
}) {
  const pct = Math.min(100, (score / required) * 100);
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center justify-between text-[10px] mb-1.5">
        <span className="flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="w-3 h-3 text-primary" /> 내 활동점수
        </span>
        <span className="font-bold text-primary">
          {score} / {required}
        </span>
      </div>
      <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-secondary font-bold mt-1.5">
        결제 시 → 즉시 100점 활성 + 출금 잠금 해제
      </p>
    </div>
  );
}
