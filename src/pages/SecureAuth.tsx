import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { Trans, useTranslation } from "react-i18next";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import {
  ShieldCheck, Mail, Lock, Sparkles, ArrowRight,
  User as UserIcon, Calendar, Phone, ChevronDown, Crown, Clock, Lock as LockIcon,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AdultOnlyBanner } from "@/components/AdultOnlyBanner";
import {
  GoldNebulaBg, GoldOrbitField, ParticleField, ParallaxLayer,
  ImperialSeal, AnimatedCounter, SimBadge, GoldDivider, senior,
} from "@/components/guide/EmpireFX";

function checkAge19(birth: string) {
  if (!birth) return false;
  const d = new Date(birth);
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return age >= 19;
}

export default function SecureAuth() {
  const nav = useNavigate();
  const { t } = useTranslation("auth");
  const { t: tc } = useTranslation("common");
  const reduce = useReducedMotion();
  const { isReady, hasSession } = useAuthReady();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
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
        if (!checkAge19(form.birth)) {
          toast({ title: "만 19세 이상만 이용 가능합니다", description: "본 서비스는 만 19세 이상 성인 전용입니다.", variant: "destructive" });
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
        title: "✨ 매직링크 발송 완료",
        description: `${email} 로 5분 유효 입장 링크를 보냈습니다.`,
      });
    } catch (e: any) {
      toast({ title: t("errLoginFail"), description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div
      data-large={true}
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
    >
      <AdultOnlyBanner className="absolute top-0 left-0 right-0 z-30" />

      {/* === Background cinematic layers === */}
      <GoldNebulaBg tone="gold" />
      <ParallaxLayer strength={40}>
        <GoldOrbitField count={12} />
      </ParallaxLayer>
      <ParticleField density={10} />

      {/* Top-right language switcher */}
      <div className="absolute top-3 right-3 z-20">
        <LanguageSwitcher variant="auth" />
      </div>

      <main className="relative z-10 flex flex-col items-center px-4 pt-16 pb-10 max-w-xl mx-auto">
        {/* === Imperial Seal === */}
        <motion.div
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="mt-2"
        >
          <div className="hidden sm:block">
            <ImperialSeal
              size={168}
              label="ENTRY"
              title={"제국\n입장"}
              caption="PHONARA EMPIRE · EST. 2026"
            />
          </div>
          <div className="sm:hidden">
            <ImperialSeal
              size={132}
              label="ENTRY"
              title={"제국\n입장"}
              caption="PHONARA EMPIRE · EST. 2026"
            />
          </div>
        </motion.div>

        {/* === Hero title === */}
        <motion.div
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          className="text-center mt-6"
        >
          <div className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-full border border-gold/40 bg-background/50 backdrop-blur">
            <ShieldCheck className="w-3.5 h-3.5 text-gold" />
            <span className="text-[10px] tracking-[0.34em] text-gold/90 font-black">
              SECURE V3 · AAL2 GUARDED
            </span>
          </div>
          <h1
            className="font-imperial font-black text-gradient-gold leading-[1.05] text-[34px] sm:text-[56px]"
            style={{
              WebkitTextStroke: "1px hsl(var(--gold-stroke) / 0.45)",
              filter: "drop-shadow(0 6px 24px hsl(var(--gold) / 0.35))",
            }}
          >
            제국 입장을 위한
            <br />마지막 관문
          </h1>
          <p
            data-large={true}
            className={`mt-4 text-foreground/85 break-keep ${senior.bodyXl} text-[18px] leading-relaxed`}
          >
            폰 하나로 제국을 쌓는다.
            <br className="sm:hidden" />
            <span className="text-gold/90"> 비밀번호 없이, 5분 안에.</span>
          </p>
        </motion.div>

        {/* === SIM strip === */}
        <motion.div
          initial={reduce ? false : { y: 16, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="grid grid-cols-3 gap-2 mt-6 w-full"
        >
          {[
            { label: "지금 입장 중", value: 1247, jitter: 4, suffix: "명" },
            { label: "오늘 가입", value: 384, jitter: 2, suffix: "명" },
            { label: "평균 입장", value: 22, jitter: 1, suffix: "초" },
          ].map((s, i) => (
            <div
              key={i}
              className="relative rounded-xl border border-gold/25 bg-background/60 backdrop-blur px-3 py-3 text-center"
            >
              <SimBadge className="absolute top-1.5 right-1.5" />
              <div className="text-[10px] tracking-widest text-muted-foreground font-bold">
                {s.label}
              </div>
              <div className="font-imperial text-gradient-gold text-xl sm:text-2xl mt-1">
                <AnimatedCounter to={s.value} jitter={s.jitter} suffix={s.suffix} />
              </div>
            </div>
          ))}
        </motion.div>

        {/* === Main CTA card === */}
        <motion.div
          initial={reduce ? false : { y: 24, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="relative w-full mt-7 rounded-3xl p-5 sm:p-6 border border-gold/40 bg-background/70 backdrop-blur-xl glow-gold-xl"
        >
          {/* email input */}
          <label className="block">
            <span className="sr-only">이메일</span>
            <div className="flex items-center gap-3 px-4 h-14 rounded-2xl border border-gold/30 bg-background/80 focus-within:border-gold transition">
              <Mail className="w-5 h-5 text-gold/80 shrink-0" />
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={e => set("email", e.target.value)}
                placeholder="your@email.com"
                className="bg-transparent w-full focus:outline-none text-lg placeholder:text-muted-foreground/60"
              />
            </div>
          </label>

          {/* Magic Link MEGA button */}
          <button
            onClick={sendMagicLink}
            disabled={busy || !form.email}
            data-large={true}
            className={`relative w-full mt-4 overflow-hidden rounded-2xl bg-gradient-imperial text-primary-foreground font-black tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] glow-gold-xl ${senior.btnXl} min-h-[72px] text-xl sm:text-2xl flex items-center justify-center gap-3`}
            aria-label="매직링크로 제국 입장하기"
          >
            <Sparkles className="w-6 h-6" />
            <span>매직링크로 제국 입장</span>
            <ArrowRight className="w-6 h-6" />
            {!reduce && (
              <motion.span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 w-1/3"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.45), transparent)",
                }}
                animate={{ x: ["-120%", "320%"] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              />
            )}
          </button>

          <p className="mt-3 text-center text-sm text-foreground/75 break-keep">
            비밀번호 불필요 · 5분 유효 · 메일함을 확인해 주세요
          </p>

          <GoldDivider />

          {/* Advanced options toggle */}
          <button
            type="button"
            onClick={() => setAdvancedOpen(v => !v)}
            aria-expanded={advancedOpen}
            aria-controls="advanced-options"
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground transition"
          >
            <motion.span animate={{ rotate: advancedOpen ? 180 : 0 }} transition={{ duration: 0.25 }}>
              <ChevronDown className="w-4 h-4" />
            </motion.span>
            {advancedOpen ? "고급 옵션 닫기" : "고급 옵션 (Google · Apple · 비밀번호)"}
          </button>

          <AnimatePresence initial={false}>
            {advancedOpen && (
              <motion.div
                id="advanced-options"
                key="adv"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-4">
                  {/* Social */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => social("google")}
                      disabled={busy}
                      className="min-h-[56px] rounded-2xl bg-white text-black font-bold text-base hover:scale-[1.02] transition disabled:opacity-50"
                    >
                      Google
                    </button>
                    <button
                      onClick={() => social("apple")}
                      disabled={busy}
                      className="min-h-[56px] rounded-2xl bg-foreground text-background font-bold text-base hover:scale-[1.02] transition disabled:opacity-50"
                    >
                      Apple
                    </button>
                  </div>

                  {/* mode tabs */}
                  <div className="grid grid-cols-2 gap-2">
                    {(["login", "signup"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`py-2.5 rounded-xl text-sm font-bold transition border ${
                          mode === m
                            ? "bg-gradient-imperial text-primary-foreground border-gold/60 glow-gold-xl"
                            : "bg-background/60 text-muted-foreground border-border/60"
                        }`}
                      >
                        {m === "login" ? t("tabLogin") : t("tabSignup")}
                      </button>
                    ))}
                  </div>

                  {/* password form */}
                  <div className="space-y-3">
                    {mode === "signup" && (
                      <Field icon={<Sparkles className="w-4 h-4" />}>
                        <input
                          value={form.nickname}
                          onChange={e => set("nickname", e.target.value)}
                          placeholder={t("placeholderNickname")}
                          maxLength={20}
                          className="bg-transparent w-full focus:outline-none text-base"
                        />
                      </Field>
                    )}
                    <Field icon={<Lock className="w-4 h-4" />}>
                      <input
                        type="password"
                        value={form.password}
                        onChange={e => set("password", e.target.value)}
                        placeholder={
                          mode === "signup"
                            ? t("placeholderPasswordSignup")
                            : t("placeholderPasswordLogin")
                        }
                        className="bg-transparent w-full focus:outline-none text-base"
                      />
                    </Field>

                    {mode === "signup" && (
                      <>
                        <Field icon={<UserIcon className="w-4 h-4" />}>
                          <input
                            value={form.realName}
                            onChange={e => set("realName", e.target.value)}
                            placeholder={t("placeholderRealName")}
                            maxLength={40}
                            className="bg-transparent w-full focus:outline-none text-base"
                          />
                        </Field>
                        <Field icon={<Phone className="w-4 h-4" />}>
                          <input
                            value={form.phone}
                            onChange={e => set("phone", e.target.value.replace(/\D/g, ""))}
                            placeholder={`${t("placeholderPhone")} (선택)`}
                            maxLength={11}
                            className="bg-transparent w-full focus:outline-none text-base"
                          />
                        </Field>
                        <Field icon={<Calendar className="w-4 h-4" />}>
                          <input
                            type="date"
                            value={form.birth}
                            onChange={e => set("birth", e.target.value)}
                            className="bg-transparent w-full focus:outline-none text-base text-muted-foreground"
                          />
                        </Field>
                        <p className="text-xs text-muted-foreground px-1 break-keep">
                          본 서비스는 만 19세 이상 성인만 이용 가능합니다.
                        </p>

                        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer px-1">
                          <input
                            type="checkbox"
                            checked={form.agreeTerms}
                            onChange={e => set("agreeTerms", e.target.checked)}
                            className="mt-0.5 accent-primary"
                          />
                          <span>
                            <Trans
                              i18nKey="agreeTerms"
                              ns="auth"
                              components={{ 1: <span className="text-foreground" />, 3: <span className="text-foreground" /> }}
                            />
                          </span>
                        </label>
                        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer px-1">
                          <input
                            type="checkbox"
                            checked={form.agreeAge}
                            onChange={e => set("agreeAge", e.target.checked)}
                            className="mt-0.5 accent-primary"
                          />
                          <span>
                            <Trans
                              i18nKey="agreeAge"
                              ns="auth"
                              components={{ 1: <span className="text-foreground" /> }}
                            />
                          </span>
                        </label>
                      </>
                    )}

                    <button
                      onClick={submit}
                      disabled={busy}
                      className="mt-2 w-full min-h-[56px] rounded-2xl bg-background/80 border border-gold/40 text-foreground font-bold text-base hover:border-gold hover:scale-[1.01] transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {busy
                        ? tc("processing")
                        : (
                          <>
                            {mode === "login" ? t("btnLogin") : t("btnSignup")}
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                    </button>

                    {mode === "login" && (
                      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                        <Link to="/forgot-password" className="hover:text-gold transition">
                          {t("forgotPassword")}
                        </Link>
                        <button onClick={() => setMode("signup")} className="hover:text-gold transition">
                          {t("noAccount")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* === Trust footer pills === */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-7 flex flex-wrap items-center justify-center gap-2"
        >
          {[
            { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: "19+ AdultGate" },
            { icon: <Clock className="w-3.5 h-3.5" />, label: "Magic Link 5분 유효" },
            { icon: <LockIcon className="w-3.5 h-3.5" />, label: "AAL2 보안" },
            { icon: <Crown className="w-3.5 h-3.5" />, label: "운영자 무손실" },
          ].map((p, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gold/30 bg-background/60 backdrop-blur text-xs text-foreground/80"
            >
              <span className="text-gold">{p.icon}</span>
              {p.label}
            </span>
          ))}
        </motion.div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/80 max-w-sm break-keep">
          PHONARA EMPIRE는 만 19세 이상 성인만 이용 가능합니다.
          입장과 동시에 이용약관·개인정보처리방침에 동의한 것으로 간주됩니다.
        </p>
      </main>
    </div>
  );
}

function Field({ icon, children }: any) {
  return (
    <div className="flex items-center gap-2 px-4 min-h-[52px] rounded-xl bg-background/70 border border-gold/25 focus-within:border-gold transition">
      <span className="text-gold/80">{icon}</span>
      {children}
    </div>
  );
}
