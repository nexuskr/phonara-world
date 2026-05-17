import { Zap, Lock } from "lucide-react";
import { useMyPower } from "@/hooks/use-my-power";
import { notify } from "@/lib/notify";

const PRESETS = [5, 10, 25, 50, 100] as const;

/**
 * LeveragePresetRail — 정보형 레버리지 칩.
 * 패널 내부 슬라이더는 FREEZE이므로 가시성·교육 강화에 집중.
 */
export default function LeveragePresetRail() {
  const { maxLeverage, phon } = useMyPower();

  const onTap = (lv: number) => {
    if (lv > maxLeverage) {
      notify.info(`레버리지 ${lv}x는 PHON 보유량이 더 필요합니다`, {
        description: "PHON을 충전하시면 즉시 해금됩니다 · 폐하의 선택을 기다리고 있어요",
      });
      return;
    }
    notify.info(`${lv}x 레버리지 선택`, {
      description: "오른쪽 주문 패널에서 슬라이더로 동일하게 설정해 주세요",
    });
    // panel은 FREEZE — 직접 set 불가. 대신 패널까지 스무스 스크롤.
    const el = document.querySelector('[data-mega-order-panel]') as HTMLElement | null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 px-1 mb-1.5">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-[11px] font-black tracking-[0.18em] text-muted-foreground">
            레버리지 빠른 선택
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          폐하 최대 <span className="text-amber-300 font-black">{maxLeverage}x</span>
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
        {PRESETS.map((lv) => {
          const locked = lv > maxLeverage;
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onTap(lv)}
              className={[
                "shrink-0 min-w-[64px] min-h-12 px-3 py-2 rounded-xl border text-sm font-black tabular-nums tracking-wide transition-colors press",
                locked
                  ? "border-border/40 bg-muted/20 text-muted-foreground/60"
                  : lv >= 50
                    ? "border-amber-300/70 bg-gradient-to-br from-amber-400/20 to-pink-500/20 text-amber-100"
                    : "border-primary/40 bg-primary/10 text-foreground hover:border-primary/70",
              ].join(" ")}
              aria-label={locked ? `${lv}x 잠김` : `${lv}x 선택`}
            >
              <div className="flex items-center justify-center gap-1">
                {locked && <Lock className="w-3 h-3" />}
                {lv}x
              </div>
            </button>
          );
        })}
      </div>
      {phon === 0 && (
        <div className="text-[10px] text-muted-foreground mt-1.5 px-1">
          PHON을 보유하시면 25x · 50x · 100x가 차례로 열립니다
        </div>
      )}
    </div>
  );
}
