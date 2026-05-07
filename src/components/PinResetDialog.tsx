import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Lock, X, KeyRound, ShieldCheck } from "lucide-react";
import PinPad from "./PinPad";

type Step = "reauth" | "pin" | "done";

export default function PinResetDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const [step, setStep] = useState<Step>("reauth");
  const [pw, setPw] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [busy, setBusy] = useState(false);

  async function doReauth() {
    if (!pw) { toast({ title: "비밀번호 입력", variant: "destructive" }); return; }
    setBusy(true);
    try {
      // 재인증: 현재 비밀번호로 다시 로그인 → last_sign_in_at 갱신 (서버 RPC가 10분 이내 검증)
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw new Error("비밀번호가 일치하지 않습니다");
      setPw("");
      setStep("pin");
    } catch (e: any) {
      toast({ title: "재인증 실패", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function doReset() {
    if (!/^\d{6}$/.test(pin)) { toast({ title: "PIN은 6자리 숫자", variant: "destructive" }); return; }
    if (pin !== pin2) { toast({ title: "PIN 불일치", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("reset_withdraw_pin", {
        _new_pin: pin, _method: "password",
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error("재설정 실패");
      setStep("done");
      toast({ title: "✅ 출금 PIN이 재설정되었습니다" });
      setTimeout(onClose, 1200);
    } catch (e: any) {
      const msg = e.message?.includes("session_too_old") ? "재인증이 만료되었습니다. 다시 로그인 해주세요"
        : e.message?.includes("rate_limit") ? "24시간 내 최대 3회까지만 가능합니다"
        : e.message?.includes("invalid_pin") ? "PIN 형식 오류"
        : e.message;
      toast({ title: "오류", description: msg, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md glass-strong rounded-3xl p-6 neon-border relative animate-fade-up space-y-3">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
        <h2 className="font-display font-black text-lg flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" /> 출금 PIN 재설정
        </h2>

        <div className="flex items-center gap-2 text-[10px]">
          <Pill on={step === "reauth"} done={step !== "reauth"}>1. 재인증</Pill>
          <Pill on={step === "pin"} done={step === "done"}>2. 새 PIN</Pill>
          <Pill on={step === "done"}>3. 완료</Pill>
        </div>

        {step === "reauth" && (
          <>
            <p className="text-[11px] text-muted-foreground">
              보안을 위해 현재 로그인 비밀번호를 다시 입력해주세요.
            </p>
            <div className="text-[11px] font-bold mt-2">현재 비밀번호</div>
            <input
              type="password" value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === "Enter" && doReauth()}
              autoFocus
              className="w-full px-4 py-3 rounded-xl glass border border-border focus:border-primary text-sm"
            />
            <button onClick={doReauth} disabled={busy}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-50">
              {busy ? "확인 중..." : "재인증"}
            </button>
          </>
        )}

        {step === "pin" && (
          <>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-secondary" /> 재인증 완료. 새 PIN을 설정하세요.
            </p>
            <PinPad value={pin} onChange={setPin} label="새 PIN 6자리" />
            <PinPad value={pin2} onChange={setPin2} label="PIN 재입력" />
            <button onClick={doReset} disabled={busy}
              className="w-full mt-2 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary disabled:opacity-50">
              {busy ? "재설정 중..." : "재설정"}
            </button>
          </>
        )}

        {step === "done" && (
          <div className="py-6 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/20 mx-auto flex items-center justify-center">
              <Lock className="w-8 h-8 text-secondary" />
            </div>
            <p className="text-sm font-bold mt-3">PIN 재설정 완료</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Pill({ children, on, done }: any) {
  return (
    <span className={`px-2 py-1 rounded-full font-bold ${
      on ? "bg-gradient-primary text-primary-foreground" :
      done ? "bg-secondary/20 text-secondary" :
      "bg-muted/40 text-muted-foreground"
    }`}>{children}</span>
  );
}
