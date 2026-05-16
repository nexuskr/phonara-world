import { usePracticeMode } from "@/lib/practiceMode";
import { Sparkles, X } from "lucide-react";
import { notify } from "@/lib/notify";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * 화면 상단 고정 배너 — Practice Mode가 켜져 있을 때만 표시.
 */
export function PracticeModeBanner() {
  const [on, setOn] = usePracticeMode();
  const nav = useNavigate();
  const loc = useLocation();
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
            notify.success("실거래 모드 활성화", {
              description: "이제 입출금/베팅이 활성화됐어요. 지갑으로 이동합니다.",
            });
            window.setTimeout(() => {
              if (loc.pathname === "/wallet") {
                window.location.reload();
              } else {
                nav("/wallet");
              }
            }, 1000);
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
