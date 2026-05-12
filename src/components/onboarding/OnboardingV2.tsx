import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Sparkles, KeyRound, Rocket, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { setPracticeMode } from "@/lib/practiceMode";
import { notify } from "@/lib/notify";

const KEY = "pm_onboarded_v2";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  title: string;
  body: string;
  accent: string;
};

const STEPS: Step[] = [
  {
    icon: Crown,
    badge: "PHONARA EMPIRE",
    title: "Baron이 될 준비, 되셨습니까?",
    body: "전 세계 상위 0.3%의 Baron 등급은 매월 평균 12배 빠른 자산 증식을 경험합니다. 첫 60초 안에 시작 등급이 결정됩니다.",
    accent: "from-primary via-primary-glow to-accent",
  },
  {
    icon: Sparkles,
    badge: "VARIABLE REWARDS",
    title: "예측할 수 없는 보상이 폭발합니다",
    body: "Crown · Empire Level · 변동성 Jackpot. Phonara의 보상 알고리즘은 0.55x~2.9x 사이에서 무작위로 폭발합니다. 평범한 게임이 아닙니다.",
    accent: "from-secondary via-accent to-primary",
  },
  {
    icon: Rocket,
    badge: "START SAFELY",
    title: "Practice Mode로 안전하게 시작",
    body: "실거래 없이 모든 메커니즘을 60초 안에 체험하세요. 준비되면 베타 코드로 정식 등급에 합류합니다.",
    accent: "from-accent via-secondary to-primary-glow",
  },
];

export function OnboardingV2({ enabled }: { enabled: boolean }) {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [enabled]);

  function close() {
    localStorage.setItem(KEY, String(Date.now()));
    setOpen(false);
  }

  function startPractice() {
    setPracticeMode(true);
    notify.success("Practice Mode 활성화됨");
    close();
    nav("/dashboard");
  }

  async function redeem() {
    const c = code.trim().toUpperCase();
    if (!c) {
      notify.warning("코드를 입력하세요.");
      return;
    }
    setRedeeming(true);
    const { error } = await supabase.rpc("redeem_beta_invite", { _code: c });
    setRedeeming(false);
    if (error) {
      const map: Record<string, string> = {
        invalid_code: "유효하지 않은 코드입니다.",
        expired_code: "만료된 코드입니다.",
        code_exhausted: "사용 한도를 초과한 코드입니다.",
      };
      notify.error(map[error.message] ?? error.message);
      return;
    }
    notify.success("정식 베타 합류 완료. Empire에 입성하셨습니다.");
    close();
    nav("/dashboard");
  }

  if (!open) return null;
  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => { /* gated */ }}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className={`relative bg-gradient-to-br ${s.accent} p-6 sm:p-8 text-foreground`}>
          <button
            onClick={close}
            className="absolute top-3 right-3 text-foreground/70 hover:text-foreground p-1 rounded-lg hover:bg-background/20"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-[10px] tracking-[0.2em] font-imperial opacity-90">{s.badge}</div>
          <Icon className="w-10 h-10 mt-3 drop-shadow-[0_0_12px_rgba(0,0,0,0.45)]" />
          <h2 className="mt-3 font-imperial font-black text-2xl sm:text-3xl tracking-[0.02em] break-keep">
            {s.title}
          </h2>
          <p className="mt-3 text-sm leading-6 opacity-95 break-keep">{s.body}</p>

          <div className="mt-5 flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-foreground" : "bg-foreground/30"}`}
              />
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-3 bg-background">
          {isLast ? (
            <>
              <Button onClick={startPractice} className="w-full font-imperial tracking-[0.04em]" size="lg">
                <Sparkles className="w-4 h-4 mr-2" />
                Practice Mode로 시작 (무료)
              </Button>
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  <span className="bg-background px-3">또는 베타 코드 입력</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="BETA-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono uppercase tracking-widest"
                  maxLength={32}
                />
                <Button onClick={redeem} disabled={redeeming || code.length === 0} variant="secondary">
                  <KeyRound className="w-4 h-4 mr-1" /> 합류
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center break-keep">
                Baron 합류 좌석은 한정되어 있습니다. 코드는 초대 받은 사용자만 사용할 수 있습니다.
              </p>
            </>
          ) : (
            <Button onClick={() => setStep((s) => s + 1)} className="w-full font-imperial tracking-[0.04em]" size="lg">
              다음 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingV2;
