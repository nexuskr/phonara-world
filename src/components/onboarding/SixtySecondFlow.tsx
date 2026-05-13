import { useEffect, useRef, useState } from "react";
import { useNowTick } from "@/hooks/use-now-tick";
import { useNavigate } from "react-router-dom";
import { Crown, Zap, Sparkles, X, ChevronRight, Coins } from "lucide-react";
import { track } from "@/lib/analytics";
import { isFlagOn } from "@/lib/conversion-flags";
import { formatKRW } from "@/lib/store";

export const SIXTY_SECOND_FLOW_KEY = "phonara_60s_v1";

/**
 * 60초 골든타임 풀스크린 플로우.
 * - 이전 FirstTimeOnboarding을 대체하지 않고 자동 트리거.
 * - 신규 가입 후 1회 노출. localStorage(KEY)로 dedup.
 */
export default function SixtySecondFlow({ enabled, onClosed }: { enabled: boolean; onClosed?: () => void }) {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!enabled || !isFlagOn("sixtySecondFlow")) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SIXTY_SECOND_FLOW_KEY)) return;
    const ti = setTimeout(() => {
      setOpen(true);
      track("funnel_60s_intro_shown");
    }, 400);
    return () => clearTimeout(ti);
  }, [enabled]);

  const startRef = useRef(0);
  const tickNow = useNowTick(1000);
  useEffect(() => {
    if (!open) { startRef.current = 0; return; }
    if (!startRef.current) startRef.current = Date.now();
  }, [open]);
  useEffect(() => {
    if (!open || !startRef.current) return;
    setSeconds(Math.floor((tickNow - startRef.current) / 1000));
  }, [tickNow, open]);

  function close(via: "skip" | "complete") {
    localStorage.setItem(SIXTY_SECOND_FLOW_KEY, String(Date.now()));
    setOpen(false);
    track("funnel_60s_intro_closed", { via, seconds });
    onClosed?.();
  }

  function goMissions() {
    track("funnel_first_mission_redirect", { seconds });
    close("complete");
    nav("/missions");
  }

  if (!open) return null;

  const STEPS = [
    {
      icon: Coins,
      title: "지금 즉시 적립 가능",
      sub: "60초 안에 첫 보상 받기",
      body: "오늘 내 지갑에 들어올 수 있는 금액",
      cta: "다음",
      highlight: formatKRW(8_400),
      grad: "from-gold via-primary to-gold",
    },
    {
      icon: Zap,
      title: "원클릭 미션",
      sub: "광고 시청 + 설문 + 게임",
      body: "가장 빠른 미션부터 자동 추천. 평균 30초.",
      cta: "다음",
      highlight: "+₩500 / 30초",
      grad: "from-primary via-secondary to-primary",
    },
    {
      icon: Crown,
      title: "지금 시작",
      sub: "첫 미션은 지금 추천 노출",
      body: "1초라도 빠를수록 더 많은 보상이 들어옵니다.",
      cta: "첫 미션 시작",
      highlight: "60초 안에 첫 적립",
      grad: "from-gold via-accent to-primary",
    },
  ] as const;

  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-background/90 backdrop-blur-2xl px-4 pb-6 md:pb-0 animate-liquid-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-6 md:p-8 overflow-hidden">
        {/* 60초 카운트다운 */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-bold text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          {String(Math.max(0, 60 - seconds)).padStart(2, "0")}초 안에 첫 적립
        </div>

        <button
          onClick={() => close("skip")}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/40 text-muted-foreground"
          aria-label="건너뛰기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="absolute -top-20 -right-20 w-44 h-44 rounded-full bg-gradient-primary blur-3xl opacity-40 animate-float" />

        <div className="relative flex items-center justify-center mt-6 mb-5">
          <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${s.grad} flex items-center justify-center glow-imperial`}>
            <Icon className="w-10 h-10 text-primary-foreground" />
            <div className="absolute -inset-3 rounded-3xl bg-primary/30 blur-2xl -z-10 animate-ring-pulse" />
          </div>
        </div>

        <p className="relative text-[10px] tracking-[0.3em] text-primary text-center font-bold mb-1">
          STEP {step + 1} / {STEPS.length}
        </p>
        <h2 className="relative font-imperial text-2xl text-gradient-imperial text-center tracking-[0.1em] mb-1">
          {s.title}
        </h2>
        <p className="relative text-xs text-center text-muted-foreground mb-3">{s.sub}</p>

        <div className="relative glass rounded-2xl p-4 mb-4 text-center">
          <div className="text-[10px] text-muted-foreground tracking-widest mb-1">{s.body}</div>
          <div className="font-display font-black text-2xl text-money-strong tabular-nums">
            {s.highlight}
          </div>
        </div>

        <div className="relative flex items-center justify-center gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-gradient-imperial" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="relative flex items-center gap-2">
          <button
            onClick={() => close("skip")}
            className="px-4 py-3 rounded-xl text-xs text-muted-foreground hover:text-foreground transition"
          >
            건너뛰기
          </button>
          <button
            onClick={() => (last ? goMissions() : setStep((v) => v + 1))}
            className="press flex-1 py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 glow-imperial"
          >
            {last ? <Sparkles className="w-4 h-4" /> : null}
            {s.cta} {!last && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
