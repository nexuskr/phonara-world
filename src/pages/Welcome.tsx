import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Gift, Sparkles, ArrowRight, Coins, Gamepad2, Target } from "lucide-react";
import ImperialLogo from "@/components/brand/ImperialLogo";
import { useRequireAuth } from "@/hooks/use-require-auth";

/**
 * /welcome — v19.0 Imperial Welcome Flow (Slice 1).
 *
 * 첫 로그인 직후 1회만 표시. 3 슬라이드 풀스크린, 가로 스와이프 + 점프 dot.
 * - 모든 백엔드 호출 없음 (순수 표현 화면)
 * - 디자인 토큰만 사용 (bg-gradient-imperial, glow-imperial, text-gradient-gold)
 * - 군사 어휘 0건 — "황제/제국/궁정" 톤
 * - 완료 시 localStorage `phonara:welcome:v19` = '1' 후 /dashboard 로 이동
 */

export const WELCOME_V19_KEY = "phonara:welcome:v19";

const SLIDES = [
  {
    eyebrow: "STEP 01 · 무료 지급",
    title: (
      <>
        폐하, 즉시 <span className="text-gradient-gold">10,000 PHON</span>
      </>
    ),
    sub: "가입과 동시에 자동 지급. 입금 0원으로 황제의 첫 라운드를 시작하세요.",
    icon: Gift,
    cta: "다음으로",
  },
  {
    eyebrow: "STEP 02 · 오늘의 무료 도전",
    title: (
      <>
        매일 <span className="text-gradient-gold">3가지 무료 보상</span>
      </>
    ),
    sub: "출석 · 미션 · 무료 슬롯 1회. 매일 들르시면 PHON이 계속 쌓입니다.",
    icon: Sparkles,
    cta: "다음으로",
    chips: [
      { icon: Coins, label: "출석 보상" },
      { icon: Target, label: "데일리 미션" },
      { icon: Gamepad2, label: "무료 슬롯 1회" },
    ],
  },
  {
    eyebrow: "STEP 03 · 입성",
    title: (
      <>
        준비되시면 <span className="text-gradient-gold">제국 입성</span>
      </>
    ),
    sub: "폐하의 자리는 항상 비워두었습니다. 첫 입금 시 +30% 보너스가 자동 적용됩니다.",
    icon: Crown,
    cta: "제국에 입성하기",
  },
] as const;

export default function Welcome() {
  const user = useRequireAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(0);

  // 이미 1회 본 적 있으면 대시보드 직행 (안전망)
  useEffect(() => {
    try {
      if (localStorage.getItem(WELCOME_V19_KEY) === "1") {
        nav("/dashboard", { replace: true });
      }
    } catch {}
  }, [nav]);

  if (!user) return null;

  const total = SLIDES.length;
  const slide = SLIDES[step];
  const Icon = slide.icon;

  const finish = () => {
    try { localStorage.setItem(WELCOME_V19_KEY, "1"); } catch {}
    nav("/dashboard?focus=quick-start", { replace: true });
  };

  const next = () => {
    if (step < total - 1) setStep((s) => s + 1);
    else finish();
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* warm gold radial backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 28%, hsl(var(--primary) / 0.22), transparent 70%), radial-gradient(40% 30% at 80% 80%, hsl(var(--primary) / 0.12), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.55), transparent)" }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <ImperialLogo to="" size="sm" withWordmark withWorld ariaLabel="PHONARA WORLD · EMPIRE OS" />

        <button
          onClick={finish}
          className="text-[11px] tracking-wider text-muted-foreground hover:text-foreground transition-colors press min-h-[36px] px-3"
        >
          건너뛰기
        </button>
      </header>

      {/* Slide content */}
      <main className="relative z-10 mx-auto w-full max-w-[640px] px-5 sm:px-8 pt-10 sm:pt-16 pb-32">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-imperial glow-imperial pulse-halo mb-6">
            <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground" />
          </div>

          <div className="text-[10px] sm:text-[11px] tracking-[0.32em] font-black text-primary/85 mb-3">
            {slide.eyebrow}
          </div>

          <h1
            className="font-imperial leading-[1.08] text-[32px] sm:text-[44px] lg:text-[52px] text-foreground"
            style={{ textShadow: "0 0 24px hsl(var(--primary) / 0.25)" }}
          >
            {slide.title}
          </h1>

          <p className="mt-5 text-[14px] sm:text-base text-muted-foreground leading-relaxed max-w-[480px] mx-auto break-keep">
            {slide.sub}
          </p>

          {"chips" in slide && slide.chips && (
            <div className="mt-7 grid grid-cols-3 gap-2 sm:gap-3 max-w-[420px] mx-auto">
              {slide.chips.map((c) => {
                const CIcon = c.icon;
                return (
                  <div
                    key={c.label}
                    className="rounded-2xl border border-primary/30 bg-card/40 backdrop-blur px-2 py-3 flex flex-col items-center gap-1.5"
                  >
                    <CIcon className="w-5 h-5 text-primary" />
                    <span className="text-[11px] font-bold text-foreground/85">{c.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Bottom — dots + CTA */}
      <footer
        className="fixed inset-x-0 bottom-0 z-20 px-5 sm:px-8 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-background via-background/95 to-transparent"
      >
        <div className="mx-auto max-w-[640px] flex flex-col items-center gap-4">
          <div className="flex items-center gap-2" role="tablist" aria-label="Welcome steps">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === step}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-8 bg-gradient-imperial glow-imperial" : "w-1.5 bg-muted-foreground/40"
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-full max-w-[420px] min-h-[60px] rounded-2xl bg-gradient-imperial text-primary-foreground font-black tracking-wider text-lg flex items-center justify-center gap-2 press glow-imperial transition-transform active:scale-[0.99]"
          >
            {slide.cta}
            <ArrowRight className="w-5 h-5" />
          </button>

          {step < total - 1 && (
            <button
              onClick={finish}
              className="text-[12px] text-muted-foreground hover:text-foreground transition-colors press min-h-[36px] px-3"
            >
              바로 대시보드로 이동
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
