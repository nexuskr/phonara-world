import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { ShieldCheck, Mail, Lock, Sparkles, ArrowRight, User as UserIcon, Calendar, Phone } from "lucide-react";

const signupSchema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력해주세요").max(255),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다").max(72),
  nickname: z.string().trim().min(2, "닉네임은 2자 이상").max(20),
  realName: z.string().trim().min(2, "실명을 입력해주세요").max(40),
  phone: z.string().trim().regex(/^01[0-9]{8,9}$/, "휴대폰 번호 형식이 올바르지 않습니다"),
  birth: z.string().min(1, "생년월일을 선택해주세요"),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: "약관에 동의해주세요" }) }),
  agreeAge: z.literal(true, { errorMap: () => ({ message: "만 14세 이상 확인이 필요합니다" }) }),
});

const loginSchema = z.object({
  email: z.string().trim().email("올바른 이메일을 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

function checkAge14(birth: string) {
  if (!birth) return false;
  const d = new Date(birth);
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 14;
}

export default function SecureAuth() {
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", nickname: "", realName: "", phone: "", birth: "",
    agreeTerms: false, agreeAge: false,
  });
  const set = <K extends keyof typeof form>(k: K, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isReady && hasSession) nav("/dashboard", { replace: true });
  }, [hasSession, isReady, nav]);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          toast({ title: "입력 확인", description: parsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        if (!checkAge14(form.birth)) {
          toast({ title: "가입 불가", description: "만 14세 이상부터 가입 가능합니다.", variant: "destructive" });
          return;
        }
        const redirectUrl = `${window.location.origin}/packages?welcome=1`;
        const { data, error } = await supabase.auth.signUp({
          email: form.email, password: form.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              nickname: form.nickname,
              real_name: form.realName,
              phone: form.phone,
              birth_date: form.birth,
            },
          },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("profiles").update({
            real_name: form.realName, phone: form.phone, birth_date: form.birth,
            terms_agreed_at: new Date().toISOString(), age_confirmed: true,
            profile_completed: true, auth_provider: "email",
          }).eq("id", data.user.id);

          // Phase 21: capture referral code from URL or localStorage
          const refCode = new URLSearchParams(window.location.search).get("ref")
            ?? localStorage.getItem("pm_ref_code");
          if (refCode && refCode.length === 8) {
            try {
              await supabase.rpc("apply_referral_code", { _code: refCode.toUpperCase() });
              localStorage.removeItem("pm_ref_code");
            } catch { /* silent — already_applied or invalid */ }
          }
        }
        toast({ title: "🎉 가입 완료", description: "이메일 인증 메일을 확인해주세요." });
        setMode("login");
      } else {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) {
          toast({ title: "입력 확인", description: parsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        // v5.1: 가입 24h 이내 첫 로그인 → /packages 자동 진입 (첫 0.5초 노출 사수)
        let firstEntry = false;
        if (signedIn?.user?.created_at) {
          const ageMs = Date.now() - new Date(signedIn.user.created_at).getTime();
          firstEntry = ageMs < 24 * 60 * 60 * 1000;
        }
        toast({ title: firstEntry ? "🔥 첫 3일 보너스 구간 진입" : "환영합니다 ✨" });
        nav(firstEntry ? "/packages?welcome=1" : "/dashboard", { replace: true });
        return;
      }
    } catch (e: any) {
      const msg = e.message?.includes("Invalid login") ? "이메일 또는 비밀번호가 일치하지 않습니다."
        : e.message?.includes("already registered") ? "이미 가입된 이메일입니다."
        : e.message;
      toast({ title: "오류", description: msg, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function social(provider: "google" | "apple") {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/complete-profile` });
      if (result.error) throw result.error;
      if (result.redirected) return;
      nav("/complete-profile");
    } catch (e: any) {
      toast({ title: "로그인 실패", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-primary/25 blur-3xl blob" />
      <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] bg-accent/25 blur-3xl blob" style={{ animationDelay: "-7s" }} />

      <div className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-7 animate-liquid-in">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-5 h-5 text-secondary" />
          <span className="text-[11px] tracking-[0.3em] text-muted-foreground font-bold">SECURE • V3</span>
        </div>
        <h1 className="font-imperial font-black text-4xl text-gradient-imperial tracking-[0.18em]">PHONARA</h1>
        <p className="text-xs text-muted-foreground mt-1">{mode === "login" ? "지구 반대편에서도 Empire를 세우다" : "가입 즉시 5,000원 보너스"}</p>

        <div className="grid grid-cols-2 gap-2 mt-5 mb-4">
          {(["login","signup"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`py-2 rounded-xl text-xs font-bold transition ${mode===m?"bg-gradient-primary text-primary-foreground glow-primary":"glass text-muted-foreground"}`}>
              {m === "login" ? "로그인" : "가입"}
            </button>
          ))}
        </div>

        {/* Social */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => social("google")} disabled={busy}
            className="py-3 rounded-xl bg-white text-black font-bold text-sm hover:scale-[1.02] transition disabled:opacity-50">
            Google
          </button>
          <button onClick={() => social("apple")} disabled={busy}
            className="py-3 rounded-xl bg-black text-white font-bold text-sm hover:scale-[1.02] transition disabled:opacity-50">
             Apple
          </button>
        </div>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-muted-foreground tracking-widest">또는 이메일</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <Field icon={<Sparkles className="w-4 h-4" />}>
              <input value={form.nickname} onChange={e=>set("nickname", e.target.value)} placeholder="닉네임 (2~20자)" maxLength={20}
                className="bg-transparent w-full focus:outline-none text-sm" />
            </Field>
          )}
          <Field icon={<Mail className="w-4 h-4" />}>
            <input type="email" value={form.email} onChange={e=>set("email", e.target.value)} placeholder="이메일"
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>
          <Field icon={<Lock className="w-4 h-4" />}>
            <input type="password" value={form.password} onChange={e=>set("password", e.target.value)} placeholder={mode==="signup"?"비밀번호 (8자 이상)":"비밀번호"}
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>

          {mode === "signup" && (
            <>
              <Field icon={<UserIcon className="w-4 h-4" />}>
                <input value={form.realName} onChange={e=>set("realName", e.target.value)} placeholder="실명 (정산용)" maxLength={40}
                  className="bg-transparent w-full focus:outline-none text-sm" />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />}>
                <input value={form.phone} onChange={e=>set("phone", e.target.value.replace(/\D/g,""))} placeholder="휴대폰 ('-' 없이, 예: 01012345678)" maxLength={11}
                  className="bg-transparent w-full focus:outline-none text-sm" />
              </Field>
              <Field icon={<Calendar className="w-4 h-4" />}>
                <input type="date" value={form.birth} onChange={e=>set("birth", e.target.value)}
                  className="bg-transparent w-full focus:outline-none text-sm text-muted-foreground" />
              </Field>

              <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1">
                <input type="checkbox" checked={form.agreeTerms} onChange={e=>set("agreeTerms", e.target.checked)} className="mt-0.5 accent-primary" />
                <span>(필수) <span className="text-foreground">이용약관</span> 및 <span className="text-foreground">개인정보처리방침</span>에 동의합니다.</span>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1">
                <input type="checkbox" checked={form.agreeAge} onChange={e=>set("agreeAge", e.target.checked)} className="mt-0.5 accent-primary" />
                <span>(필수) 본인은 <span className="text-foreground">만 14세 이상</span>입니다.</span>
              </label>
            </>
          )}
        </div>

        <button onClick={submit} disabled={busy}
          className="mt-5 w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? "처리 중..." : (<>{mode==="login"?"로그인":"가입하고 5,000원 받기"} <ArrowRight className="w-4 h-4" /></>)}
        </button>

        {mode === "login" && (
          <div className="flex justify-between mt-3 text-[11px] text-muted-foreground">
            <Link to="/forgot-password" className="hover:text-primary transition">비밀번호를 잊으셨나요?</Link>
            <button onClick={()=>setMode("signup")} className="hover:text-primary transition">계정이 없으신가요? 가입</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon, children }: any) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl glass border border-border/40 focus-within:border-primary transition">
      <span className="text-muted-foreground">{icon}</span>{children}
    </div>
  );
}
