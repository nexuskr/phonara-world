import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown, Zap, Wallet, X, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const KEY = "phonara_onboarded_v1";

const STEP_ICONS = [Crown, Zap, Wallet] as const;
const STEP_ACCENTS = [
  "from-primary via-primary-glow to-primary",
  "from-accent via-primary to-primary-glow",
  "from-secondary via-accent to-primary",
] as const;

export default function FirstTimeOnboarding({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);

  const STEPS = [
    { title: t("step1Title"), subtitle: t("step1Sub"), body: t("step1Body") },
    { title: t("step2Title"), subtitle: t("step2Sub"), body: t("step2Body") },
    { title: t("step3Title"), subtitle: t("step3Sub"), body: t("step3Body") },
  ];

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const ti = setTimeout(() => setOpen(true), 350);
    return () => clearTimeout(ti);
  }, [enabled]);

  function close() {
    localStorage.setItem(KEY, String(Date.now()));
    setOpen(false);
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = STEP_ICONS[step];
  const accent = STEP_ACCENTS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-background/80 backdrop-blur-xl px-4 pb-6 md:pb-0 animate-liquid-in">
      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-6 md:p-8">
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted/40 text-muted-foreground"
          aria-label={t("skip")}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center mb-5">
          <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${accent} flex items-center justify-center glow-imperial`}>
            <Icon className="w-10 h-10 text-primary-foreground" />
            <div className="absolute -inset-3 rounded-3xl bg-primary/30 blur-2xl -z-10 animate-ring-pulse" />
          </div>
        </div>

        <p className="text-[10px] tracking-[0.3em] text-primary text-center font-bold mb-1">
          {t("stepLabel", { i: step + 1, n: STEPS.length })}
        </p>
        <h2 className="font-imperial text-2xl text-gradient-imperial text-center tracking-[0.1em] mb-1">
          {s.title}
        </h2>
        <p className="text-xs text-center text-muted-foreground mb-3">{s.subtitle}</p>
        <p className="text-sm text-center text-foreground/85 leading-relaxed mb-6">
          {s.body}
        </p>

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
            {t("skip")}
          </button>
          {last ? (
            <Link
              to="/missions"
              onClick={close}
              className="flex-1 py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 glow-imperial press"
            >
              {t("start")} <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3 rounded-xl bg-gradient-imperial text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 glow-imperial press"
            >
              {t("next")} <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
