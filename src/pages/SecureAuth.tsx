import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { Trans, useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { ShieldCheck, Mail, Lock, Sparkles, ArrowRight, User as UserIcon, Calendar, Phone } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import CinematicIntro from "@/components/CinematicIntro";

function checkAge14(birth: string) {
  if (!birth) return false;
  const d = new Date(birth);
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 14;
}

export default function SecureAuth() {
  const nav = useNavigate();
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const { isReady, hasSession } = useAuthReady();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", nickname: "", realName: "", phone: "", birth: "",
    agreeTerms: false, agreeAge: false,
  });
  const set = <K extends keyof typeof form>(k: K, v: any) => setForm(f => ({ ...f, [k]: v }));

  const signupSchema = useMemo(() => z.object({
    email: z.string().trim().email(t("validEmail")).max(255),
    password: z.string().min(8, t("validPasswordMin")).max(72),
    nickname: z.string().trim().min(2, t("validNickname")).max(20),
    realName: z.string().trim().min(2, t("validRealName")).max(40),
    phone: z.string().trim().regex(/^01[0-9]{8,9}$/, t("validPhone")).optional().or(z.literal("")),
    birth: z.string().min(1, t("validBirth")),
    agreeTerms: z.literal(true, { errorMap: () => ({ message: t("validTerms") }) }),
    agreeAge: z.literal(true, { errorMap: () => ({ message: t("validAge") }) }),
  }), [t]);

  const loginSchema = useMemo(() => z.object({
    email: z.string().trim().email(t("validEmail")),
    password: z.string().min(1, t("validPasswordRequired")),
  }), [t]);

  useEffect(() => {
    if (isReady && hasSession) nav("/dashboard", { replace: true });
  }, [hasSession, isReady, nav]);

  async function submit() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) {
          toast({ title: t("errInputCheck"), description: parsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        if (!checkAge14(form.birth)) {
          toast({ title: t("errAgeTitle"), description: t("errAge"), variant: "destructive" });
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

          const refCode = new URLSearchParams(window.location.search).get("ref")
            ?? localStorage.getItem("pm_ref_code");
          if (refCode && refCode.length === 8) {
            try {
              await supabase.rpc("apply_referral_code", { _code: refCode.toUpperCase() });
              localStorage.removeItem("pm_ref_code");
            } catch { /* silent */ }
          }
        }
        toast({ title: t("toastSignupDone"), description: t("toastVerifyEmail") });
        setMode("login");
      } else {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) {
          toast({ title: t("errInputCheck"), description: parsed.error.errors[0].message, variant: "destructive" });
          return;
        }
        const { data: signedIn, error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        let firstEntry = false;
        if (signedIn?.user?.created_at) {
          const ageMs = Date.now() - new Date(signedIn.user.created_at).getTime();
          firstEntry = ageMs < 24 * 60 * 60 * 1000;
        }
        toast({ title: firstEntry ? t("toastFirstEntry") : t("toastWelcome") });
        nav(firstEntry ? "/packages?welcome=1" : "/dashboard", { replace: true });
        return;
      }
    } catch (e: any) {
      const msg = e.message?.includes("Invalid login") ? t("errInvalidLogin")
        : e.message?.includes("already registered") ? t("errAlreadyRegistered")
        : e.message;
      toast({ title: t("errInputCheck"), description: msg, variant: "destructive" });
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
      toast({ title: t("errLoginFail"), description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function sendMagicLink() {
    const email = form.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: t("errInputCheck"), description: t("validEmail"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      toast({
        title: "매직링크 발송 완료",
        description: `${email} 로 로그인 링크를 보냈어요. 메일함을 확인해주세요.`,
      });
    } catch (e: any) {
      toast({ title: t("errLoginFail"), description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-primary/25 blur-3xl blob" />
      <div className="absolute -bottom-32 -right-32 w-[520px] h-[520px] bg-accent/25 blur-3xl blob" style={{ animationDelay: "-7s" }} />

      {/* Top-right language switcher (pre-login) */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="auth" />
      </div>

      <div
        className="relative w-full max-w-md glass-strong neon-border rounded-3xl p-7 animate-cinema-card"
        style={{ animationDelay: "0.55s" }}
      >
        <CinematicIntro />

        <div className="flex items-center justify-center gap-2 mb-1">
          <ShieldCheck className="w-4 h-4 text-secondary" />
          <span className="text-[10px] tracking-[0.3em] text-muted-foreground font-bold">{t("secureV3")}</span>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-1">{mode === "login" ? t("taglineLogin") : t("taglineSignup")}</p>

        <div className="grid grid-cols-2 gap-2 mt-5 mb-4">
          {(["login","signup"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`py-2 rounded-xl text-xs font-bold transition ${mode===m?"bg-gradient-primary text-primary-foreground glow-primary":"glass text-muted-foreground"}`}>
              {m === "login" ? t("tabLogin") : t("tabSignup")}
            </button>
          ))}
        </div>

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
          <span className="text-[10px] text-muted-foreground tracking-widest">{t("orEmail")}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={sendMagicLink}
          disabled={busy || !form.email}
          className="w-full mb-3 py-3 rounded-xl glass border border-primary/40 text-foreground font-bold text-sm hover:scale-[1.02] hover:border-primary transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          매직링크로 로그인 (비밀번호 불필요)
        </button>

        <div className="space-y-3">
          {mode === "signup" && (
            <Field icon={<Sparkles className="w-4 h-4" />}>
              <input value={form.nickname} onChange={e=>set("nickname", e.target.value)} placeholder={t("placeholderNickname")} maxLength={20}
                className="bg-transparent w-full focus:outline-none text-sm" />
            </Field>
          )}
          <Field icon={<Mail className="w-4 h-4" />}>
            <input type="email" value={form.email} onChange={e=>set("email", e.target.value)} placeholder={t("placeholderEmail")}
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>
          <Field icon={<Lock className="w-4 h-4" />}>
            <input type="password" value={form.password} onChange={e=>set("password", e.target.value)} placeholder={mode==="signup"?t("placeholderPasswordSignup"):t("placeholderPasswordLogin")}
              className="bg-transparent w-full focus:outline-none text-sm" />
          </Field>

          {mode === "signup" && (
            <>
              <Field icon={<UserIcon className="w-4 h-4" />}>
                <input value={form.realName} onChange={e=>set("realName", e.target.value)} placeholder={t("placeholderRealName")} maxLength={40}
                  className="bg-transparent w-full focus:outline-none text-sm" />
              </Field>
              <Field icon={<Phone className="w-4 h-4" />}>
                <input value={form.phone} onChange={e=>set("phone", e.target.value.replace(/\D/g,""))} placeholder={`${t("placeholderPhone")} (선택)`} maxLength={11}
                  className="bg-transparent w-full focus:outline-none text-sm" />
              </Field>
              <Field icon={<Calendar className="w-4 h-4" />}>
                <input type="date" value={form.birth} onChange={e=>set("birth", e.target.value)}
                  className="bg-transparent w-full focus:outline-none text-sm text-muted-foreground" />
              </Field>

              <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1">
                <input type="checkbox" checked={form.agreeTerms} onChange={e=>set("agreeTerms", e.target.checked)} className="mt-0.5 accent-primary" />
                <span>
                  <Trans i18nKey="agreeTerms" ns="auth"
                    components={{ 1: <span className="text-foreground" />, 3: <span className="text-foreground" /> }} />
                </span>
              </label>
              <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer px-1">
                <input type="checkbox" checked={form.agreeAge} onChange={e=>set("agreeAge", e.target.checked)} className="mt-0.5 accent-primary" />
                <span>
                  <Trans i18nKey="agreeAge" ns="auth"
                    components={{ 1: <span className="text-foreground" /> }} />
                </span>
              </label>
            </>
          )}
        </div>

        <button onClick={submit} disabled={busy}
          className="mt-5 w-full py-3.5 rounded-xl bg-gradient-primary text-primary-foreground font-bold glow-primary hover:scale-[1.02] transition flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? tc("processing") : (<>{mode==="login"?t("btnLogin"):t("btnSignup")} <ArrowRight className="w-4 h-4" /></>)}
        </button>

        {mode === "login" && (
          <div className="flex justify-between mt-3 text-[11px] text-muted-foreground">
            <Link to="/forgot-password" className="hover:text-primary transition">{t("forgotPassword")}</Link>
            <button onClick={()=>setMode("signup")} className="hover:text-primary transition">{t("noAccount")}</button>
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
