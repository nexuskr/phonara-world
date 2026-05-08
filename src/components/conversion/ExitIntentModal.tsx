import { useEffect, useState } from "react";
import { Gift, X } from "lucide-react";
import { formatKRW } from "@/lib/store";
import { track } from "@/lib/analytics";
import { isFlagOn } from "@/lib/conversion-flags";

const KEY = "phonara_exit_intent_v1";

/**
 * Exit-intent modal — 결제 페이지 이탈 시도 시 1회 한정 +₩2,000 보너스 제안.
 * 트리거 조건:
 *   - 마우스가 화면 상단 밖으로 빠져나갈 때 (desktop)
 *   - 뒤로가기 history popstate (mobile)
 */
export default function ExitIntentModal({
  bonus = 2_000,
  onAccept,
}: {
  bonus?: number;
  onAccept?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isFlagOn("exitIntentModal")) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(KEY)) return;

    function onLeave(e: MouseEvent) {
      if (shown) return;
      if (e.clientY <= 0) {
        setOpen(true);
        setShown(true);
        sessionStorage.setItem(KEY, "1");
        track("funnel_exit_intent_shown");
      }
    }
    document.addEventListener("mouseleave", onLeave);
    return () => document.removeEventListener("mouseleave", onLeave);
  }, [shown]);

  if (!open) return null;

  function close() {
    setOpen(false);
  }

  function accept() {
    track("funnel_exit_intent_recovered", { bonus });
    onAccept?.();
    close();
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-background/80 backdrop-blur-xl px-4 animate-liquid-in">
      <div className="relative w-full max-w-sm glass-strong neon-border rounded-3xl p-6 overflow-hidden">
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/40 text-muted-foreground"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-gradient-gold blur-3xl opacity-50" />
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-gold mx-auto flex items-center justify-center glow-imperial">
            <Gift className="w-8 h-8 text-gold-foreground" />
          </div>
          <div className="text-[10px] tracking-[0.3em] text-secondary font-black mt-3">
            기다려요!
          </div>
          <h3 className="font-imperial text-2xl text-gradient-gold mt-1">
            +{formatKRW(bonus)} 보너스
          </h3>
          <p className="text-xs text-muted-foreground mt-2">
            지금 결제 시 추가 보너스 1회 한정
          </p>
          <button
            onClick={accept}
            className="press mt-5 w-full py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm glow-imperial"
          >
            보너스 받고 결제하기
          </button>
          <button
            onClick={close}
            className="mt-2 w-full py-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            괜찮아요
          </button>
        </div>
      </div>
    </div>
  );
}
