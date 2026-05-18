import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Swords } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useImperialOnboarding } from "@/hooks/useImperialOnboarding";
import { notify } from "@/lib/notify";

const LS_KEY = "phonara:imperial_welcome:v1";

/**
 * Phase 4 P1 Observer Mode — 3-step welcome:
 *  1) Welcome to Imperial Empire
 *  2) Claim 15,000 PHON (idempotent)
 *  3) First Duel CTA → /duel
 *
 * Triggered once per device for users who haven't claimed signup bonus.
 */
export default function ImperialWelcomeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { state, claimSignup } = useImperialOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthed(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!authed || !state) return;
    const seen = (() => { try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; } })();
    if (!state.signup_claimed && !seen) {
      setOpen(true);
    }
  }, [authed, state]);

  const markSeen = () => { try { localStorage.setItem(LS_KEY, "1"); } catch {} };

  const onClaim = async () => {
    setClaiming(true);
    try {
      const res = await claimSignup();
      if (res.status === "granted") {
        notify.imperial("👑 15,000 PHON 지급 완료", { description: "Imperial Empire 입성을 환영합니다." });
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

  const close = () => { markSeen(); setOpen(false); };
  const goDuel = () => { markSeen(); setOpen(false); navigate("/duel"); };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md border-amber-400/50 bg-gradient-to-br from-background via-background to-amber-950/20">
        {step === 0 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/40">
                <Crown className="h-8 w-8 text-amber-300" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold">
                Imperial Empire 입성을 환영합니다
              </DialogTitle>
              <DialogDescription className="text-center">
                0원으로 시작해서 매일 돈을 버는 세계 — 지금 황제의 첫걸음을 시작하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={close}>나중에</Button>
              <Button onClick={() => setStep(1)} className="bg-amber-500 text-amber-950 hover:bg-amber-400">
                다음
              </Button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 ring-2 ring-amber-400/40">
                <Sparkles className="h-8 w-8 text-amber-300" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold">
                환영 보너스 <span className="text-amber-300">15,000 PHON</span>
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
                <Swords className="h-8 w-8 text-amber-300" />
              </div>
              <DialogTitle className="text-center text-2xl font-bold">
                첫 Duel을 시작하세요
              </DialogTitle>
              <DialogDescription className="text-center">
                30초 안에 첫 승부. Observer Mode로 안전하게 입문할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={close}>닫기</Button>
              <Button onClick={goDuel} className="bg-amber-500 text-amber-950 hover:bg-amber-400">
                Duel 입장
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
