import { usePracticeMode } from "@/lib/practiceMode";
import { Sparkles, X } from "lucide-react";
import { notify } from "@/lib/notify";

/**
 * 화면 상단 고정 배너 — Practice Mode가 켜져 있을 때만 표시.
 */
export function PracticeModeBanner() {
  const [on, setOn] = usePracticeMode();
  if (!on) return null;
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-secondary/30 via-primary/30 to-accent/30 border-b border-secondary/40 backdrop-blur-md">
      <div className="container py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="font-imperial tracking-[0.04em] text-secondary">PRACTICE MODE</span>
          <span className="text-muted-foreground hidden sm:inline">— 실거래 비활성. 모든 보상은 시뮬레이션 표기입니다.</span>
        </div>
        <button
          onClick={() => {
            setOn(false);
            notify.success("실거래 모드 활성화", { description: "출금/입금이 활성화되었습니다." });
          }}
          className="text-[11px] text-foreground/80 hover:text-foreground inline-flex items-center gap-1 min-h-[32px] px-2 rounded-lg hover:bg-background/40"
          aria-label="Practice Mode 종료"
        >
          실거래 모드 전환 <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default PracticeModeBanner;
