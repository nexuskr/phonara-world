import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Zap, Wallet, X, ChevronRight } from "lucide-react";

const KEY = "phonara_onboarded_v1";

const STEPS = [
  {
    icon: Crown,
    title: "환영합니다, 사령관",
    subtitle: "Phonara 제국의 문이 열렸습니다",
    body: "지구 반대편에서도 당신의 Empire를 세울 시간입니다.",
    accent: "from-primary via-primary-glow to-primary",
  },
  {
    icon: Zap,
    title: "EARN — 돈 버는 곳",
    subtitle: "미션 · 퀘스트 · 룰렛 · 시즌패스",
    body: "하단 가운데 골드 버튼을 누르면 모든 수익 활동이 한 곳에 있습니다.",
    accent: "from-accent via-primary to-primary-glow",
  },
  {
    icon: Wallet,
    title: "TREASURY — 출금하는 곳",
    subtitle: "최소 10,000원부터 즉시 정산",
    body: "잔고는 항상 화면 상단에서 빛나고 있습니다.",
    accent: "from-secondary via-accent to-primary",
  },
] as const;

export default function FirstTimeOnboarding({ enabled }: { enabled: boolean }) {
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(t);
  }, [enabled]);

  function close() {
    localStorage.setItem(KEY, String(Date.now()));
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-background/80 backdrop-blur-xl px-4 pb-6 md:pb-0 animate-liquid-in">
      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-6 md:p-8">
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/40 text-muted-foreground"
          aria-label="건너뛰기"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center mb-5">
          <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${s.accent} flex items-center justify-center glow-imperial`}>
            <Icon className="w-10 h-10 text-primary-foreground" />
            <div className="absolute -inset-3 rounded-3xl bg-primary/30 blur-2xl -z-10 animate-ring-pulse" />
          </div>
        </div>

        <p className="text-[10px] tracking-[0.3em] text-primary text-center font-bold mb-1">
          STEP {step + 1} / {STEPS.length}
        </p>
        <h2 className="font-imperial text-2xl text-gradient-imperial text-center tracking-[0.1em] mb-1">
          {s.title}
        </h2>
        <p className="text-xs text-center text-muted-foreground mb-3">{s.subtitle}</p>
        <p className="text-sm text-center text-foreground/85 leading-relaxed mb-6">
          {s.body}
        </p>

        {/* progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-8 bg-gradient-imperial" : "w-1.5 bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={close}
            className="px-4 py-3 rounded-xl text-xs text-muted-foreground hover:text-foreground transition"
          >
            건너뛰기
          </button>
          {last ? (
            <Link
              to="/missions"
              onClick={close}
              className="flex-1 py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 glow-imperial press"
            >
              제국을 시작하다 <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 glow-imperial press"
            >
              다음 <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
