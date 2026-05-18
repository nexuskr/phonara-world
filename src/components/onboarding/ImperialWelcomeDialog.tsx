import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImperialOnboarding } from "@/hooks/useImperialOnboarding";
import { notify } from "@/lib/notify";
import FirstDuelInvite from "./FirstDuelInvite";
import ImperialVoidPreview from "./ImperialVoidPreview";

const LS_KEY = "phonara:imperial_welcome:v1";

export default function ImperialWelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { state, claimSignup } = useImperialOnboarding();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) setAuthed(!!data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!authed || !state) return;
    const seen = (() => { try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; } })();
    if (!state.signup_claimed && !seen) setOpen(true);
  }, [authed, state]);

  const markSeen = () => { try { localStorage.setItem(LS_KEY, "1"); } catch {} };
  const logWelcomeCompleted = async () => {
    try { await (supabase as any).rpc("imperial_log_observability", { _kind: "onboarding.welcome.completed", _payload: {} }); } catch {}
  };

  const onClaim = async () => {
    setClaiming(true);
    try {
      const res = await claimSignup();
      if (res.status === "granted") {
        notify.imperial("👑 15,000 PHON 지급 완료", { description: "Imperial Empire 입성을 환영합니다." });
      } else if (res.status === "fraud_rejected") {
        notify.error("보너스 지급 거부", { description: "이미 등록된 기기에서 발급된 보너스가 있습니다." });
      } else if (res.status === "cap_reached" || res.status === "paused") {
        notify.info("오늘 한도 도달", { description: "내일 다시 시도해주세요." });
      } else {
        notify.info("이미 지급된 환영 보너스");
      }
      setStep(2);
    } catch (e: any) {
      notify.error("보너스 지급 실패", { description: e?.message ?? "잠시 후 다시 시도하세요." });
    } finally {
      setClaiming(false);
    }
  };

  const close = () => { logWelcomeCompleted(); markSeen(); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md border-amber-400/50 bg-gradient-to-br from-background via-background to-amber-950/20">
        {step === 0 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/40 animate-[pulse_2s_ease-in-out_infinite]">
                <Crown className="h-8 w-8 text-amber-300" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold animate-fade-in">
                Imperial Empire 입성을 환영합니다
              </DialogTitle>
              <DialogDescription className="text-center">
                0원으로 시작해서 매일 돈을 버는 세계 — 황제의 첫걸음을 시작하세요.
              </DialogDescription>
            </DialogHeader>
            <ImperialVoidPreview />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={close}>나중에</Button>
              <Button onClick={() => setStep(1)} className="bg-amber-500 text-amber-950 hover:bg-amber-400">다음</Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/40">
                <Sparkles className="h-8 w-8 text-amber-300 animate-pulse" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold">
                환영 보너스 <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">15,000 PHON</span>
              </DialogTitle>
              <DialogDescription className="text-center">
                지금 즉시 지급됩니다. 1회 한정 · 입금 불필요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={close} disabled={claiming}>나중에</Button>
              <Button onClick={onClaim} disabled={claiming} className="bg-amber-500 text-amber-950 hover:bg-amber-400">
                {claiming ? "지급 중..." : "지금 받기"}
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/40">
                <Crown className="h-8 w-8 text-amber-300" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold">첫 Duel을 시작하세요</DialogTitle>
              <DialogDescription className="text-center">
                30초 안에 첫 승부. Observer Mode로 안전하게 입문할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <FirstDuelInvite onGo={close} />
            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={close}>닫기</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
