import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Crown, ShieldCheck, Mountain, Sparkles, Mail, Lock, UserPlus, LogIn, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { AuthSeoulBackdrop } from "@/components/auth/AuthSeoulBackdrop";
import { useAuthLiveData } from "@/hooks/use-auth-live-data";
import AuthLiveNowBar from "@/components/auth/AuthLiveNowBar";
import AuthLiveFeedTicker from "@/components/auth/AuthLiveFeedTicker";
import AuthGlobalMap from "@/components/auth/AuthGlobalMap";
import AuthTop5Card from "@/components/auth/AuthTop5Card";
import AuthCrownExplosionCard from "@/components/auth/AuthCrownExplosionCard";
import AuthFeatureGrid from "@/components/auth/AuthFeatureGrid";
import AuthBottomTrustStrip from "@/components/auth/AuthBottomTrustStrip";

export default function SecureAuth() {
  const nav = useNavigate();
  const { t } = useTranslation("auth");
  const { isReady, hasSession } = useAuthReady();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [mode, setMode] = useState<"magic" | "signup" | "signin">("magic");
  const live = useAuthLiveData();

  useEffect(() => {
    if (isReady && hasSession) nav("/dashboard", { replace: true });
  }, [hasSession, isReady, nav]);

  const emailSchema = useMemo(() => z.string().trim().email(), []);

  async function sendMagicLink() {
    const e = email.trim();
    if (!emailSchema.safeParse(e).success) {
      toast({ title: "이메일을 확인해 주세요", description: "유효한 이메일을 입력해 주세요.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: e,
        options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      toast({ title: "✨ 매직링크 발송 완료", description: `${e} 로 5분 유효 입장 링크를 보냈습니다.` });
    } catch (err: any) {
      toast({ title: "발송 실패", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function signUpWithPassword() {
    const e = email.trim();
    if (!emailSchema.safeParse(e).success) {
      toast({ title: "이메일을 확인해 주세요", description: "유효한 이메일을 입력해 주세요.", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "비밀번호가 너무 짧습니다", description: "8자 이상 입력해 주세요.", variant: "destructive" });
      return;
    }
    if (password !== password2) {
      toast({ title: "비밀번호가 일치하지 않습니다", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
        options: { emailRedirectTo: `${window.location.origin}/complete-profile` },
      });
      if (error) throw error;
      if (data.session) {
        toast({ title: "🎉 가입 완료", description: "추가 정보를 입력해 주세요." });
        nav("/complete-profile");
      } else {
        toast({ title: "✉️ 인증 메일 발송", description: `${e} 로 가입 확인 메일을 보냈습니다. 메일을 열어 인증해 주세요.` });
      }
    } catch (err: any) {
      toast({ title: "가입 실패", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function signInWithPassword() {
    const e = email.trim();
    if (!emailSchema.safeParse(e).success) {
      toast({ title: "이메일을 확인해 주세요", variant: "destructive" });
      return;
    }
    if (!password) {
      toast({ title: "비밀번호를 입력해 주세요", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) throw error;
      toast({ title: "환영합니다 👑" });
      nav("/dashboard");
    } catch (err: any) {
      toast({ title: "로그인 실패", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function social(provider: "google" | "apple") {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/complete-profile`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      nav("/complete-profile");
    } catch (e: any) {
      toast({ title: "로그인 실패", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function kakao() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao" as any,
        options: { redirectTo: `${window.location.origin}/complete-profile` },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({
        title: "Kakao 로그인 준비 중",
        description: "관리자에서 Kakao Provider 설정 후 이용 가능합니다.",
        variant: "destructive",
      });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-background text-foreground">
      <AuthSeoulBackdrop />

      {/* Top system bar */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-[11px]">
        <div className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-gold" />
          <span className="hidden xs:inline">본 서비스는 만 19세 이상만 이용 가능합니다.</span>
          <span className="xs:hidden">19+ 성인 전용</span>
        </div>
        <LanguageSwitcher variant="auth" />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1024px] px-3 sm:px-6 pb-10">
        {/* === Hero — wordmark + headline === */}
        <section className="text-center pt-4 sm:pt-8">
          <div className="inline-flex items-center justify-center mb-2">
            <Crown className="w-7 h-7 sm:w-9 sm:h-9 text-gold drop-shadow-[0_0_12px_hsl(var(--gold)/0.7)]" />
          </div>
          <h1 className="font-imperial text-gradient-gold text-[28px] sm:text-[44px] leading-none tracking-[0.18em]">
            PHONARA EMPIRE
          </h1>
          <div className="mt-2 inline-flex items-center justify-center gap-3 text-[10px] sm:text-xs tracking-[0.32em] text-gold/85 font-black">
            <span className="h-px w-8 bg-gold/50" />
            EST. 2026 · WORLD #1 LIVE EMPIRE
            <span className="h-px w-8 bg-gold/50" />
          </div>

          <h2
            className="mt-6 sm:mt-8 font-imperial text-foreground leading-[1.04] text-[28px] sm:text-[44px] lg:text-[56px]"
          >
            지금, 당신이 합류할 때
          </h2>
          <h2
            className="font-imperial text-gradient-gold leading-[1.04] text-[32px] sm:text-[52px] lg:text-[64px]"
            style={{ textShadow: "0 0 32px hsl(var(--gold)/0.35)" }}
          >
            제국은 완성됩니다
          </h2>
          <p className="mt-3 text-[12px] sm:text-base text-foreground/85 break-keep">
            전 세계 황제들이 실시간으로 경쟁하고, <span className="text-gold font-bold">Crown</span>을 쟁취하라.
          </p>
        </section>

        {/* === LIVE NOW === */}
        <section className="mt-6 sm:mt-8">
          <AuthLiveNowBar kpi={live.kpi} />
        </section>

        {/* === LIVE FEED === */}
        <section className="mt-3 sm:mt-4">
          <AuthLiveFeedTicker feed={live.feed} />
        </section>

        {/* === ENTRY + RIGHT-SIDE PANELS === */}
        <section className="mt-5 sm:mt-7 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Entry card */}
          <div className="lg:col-span-7">
            <div
              className="
                relative rounded-3xl p-4 sm:p-7 border-2 border-gold/55 bg-background/85
                outline outline-1 outline-offset-[3px] outline-gold/20 overflow-hidden
              "
              style={{
                boxShadow:
                  "0 0 44px hsl(var(--gold)/0.28), 0 0 84px hsl(var(--gold)/0.14), inset 0 1px 0 hsl(var(--gold)/0.28)",
              }}
            >
              {/* L corners */}
              <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-gold/80 rounded-tl-md" />
              <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-gold/80 rounded-tr-md" />
              <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-gold/80 rounded-bl-md" />
              <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-gold/80 rounded-br-md" />

              <div className="text-center">
                <div className="inline-flex items-center gap-2">
                  <span className="text-gold text-2xl sm:text-3xl">⚡</span>
                  <h3 className="font-imperial text-2xl sm:text-3xl text-gradient-gold">5초 만에 제국 입성</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">비밀번호 없이, 즉시 시작</p>
              </div>

              {/* Email input */}
              <label className="block mt-4 sm:mt-5">
                <div className="flex items-center gap-3 px-4 h-13 sm:h-14 rounded-2xl border border-gold/30 bg-background/80 focus-within:border-gold transition-colors">
                  <Mail className="w-5 h-5 text-gold/80 shrink-0" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 또는 휴대폰 번호 입력"
                    className="bg-transparent w-full focus:outline-none text-base placeholder:text-muted-foreground/60"
                  />
                </div>
              </label>

              {/* Magic link CTA */}
              <button
                onClick={sendMagicLink}
                disabled={busy || !email}
                className="
                  relative w-full mt-4 rounded-2xl bg-gradient-imperial text-primary-foreground
                  font-black tracking-wider min-h-[60px] sm:min-h-[68px] text-lg sm:text-xl
                  flex items-center justify-center gap-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-transform motion-safe:hover:scale-[1.01] active:scale-[0.99]
                "
              >
                <Crown className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>원클릭 제국 입장</span>
              </button>
              <p className="text-center text-[11px] sm:text-xs text-muted-foreground mt-2">
                Magic Link가 5초 안에 도착합니다.
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-border" />
                <span className="text-[11px] tracking-widest text-muted-foreground">또는</span>
                <span className="flex-1 h-px bg-border" />
              </div>

              {/* Social row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <button
                  onClick={() => social("google")}
                  disabled={busy}
                  className="min-h-[48px] sm:min-h-[52px] rounded-xl bg-white text-black font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.02] transition disabled:opacity-50"
                >
                  <svg viewBox="0 0 48 48" className="w-4 h-4 sm:w-5 sm:h-5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.4 4 9.8 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8L6 32.7C9.4 39.4 16.1 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2.1 4-3.9 5.4l6.3 5.3C41.7 35.5 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
                  Google
                </button>
                <button
                  onClick={() => social("apple")}
                  disabled={busy}
                  className="min-h-[48px] sm:min-h-[52px] rounded-xl bg-foreground text-background font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.02] transition disabled:opacity-50"
                >
                  <svg viewBox="0 0 16 16" className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor"><path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18 7.79 2.337 7.953 3.66 7.978 3.69c.024.03 1.514.083 2.45-1.32.937-1.402.728-2.32.754-2.362zm3.243 11.115c-.052-.105-2.518-1.339-2.288-3.708.23-2.37 1.812-3.019 1.837-3.089.023-.07-.776-1.025-1.673-1.51-.661-.348-1.385-.502-2.118-.502-.926 0-1.526.244-1.962.404-.43.158-.812.299-1.347.299-.515 0-.836-.16-1.31-.337-.413-.155-.95-.353-1.717-.353-1.292 0-2.654.79-3.494 2.151-1.187 1.929-1.014 5.55.99 8.626.71 1.099 1.671 2.34 2.929 2.354.561.006.929-.158 1.32-.328.448-.196.93-.405 1.79-.41.86-.005 1.296.207 1.737.408.385.176.737.34 1.243.337 1.255-.013 2.27-1.398 2.978-2.493.815-1.265 1.144-2.491 1.171-2.553z"/></svg>
                  Apple
                </button>
                <button
                  onClick={kakao}
                  disabled={busy}
                  className="min-h-[48px] sm:min-h-[52px] rounded-xl bg-[#FEE500] text-[#191919] font-bold text-sm sm:text-base flex items-center justify-center gap-2 hover:scale-[1.02] transition disabled:opacity-50"
                >
                  <span className="text-lg leading-none">💬</span>
                  카카오
                </button>
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AAL2 최고 보안 · 100% 익명 · KYC 없음</span>
              </div>
            </div>
          </div>

          {/* Right column: Map + Top5 + Crown */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <AuthGlobalMap feed={live.feed} />
            <AuthTop5Card rows={live.top5} />
            <AuthCrownExplosionCard value={live.kpi.crown_explosion} />
          </div>
        </section>

        {/* === Feature grid === */}
        <section className="mt-8 sm:mt-12">
          <AuthFeatureGrid />
        </section>

        {/* === Bottom trust strip === */}
        <section className="mt-6 sm:mt-8">
          <AuthBottomTrustStrip />
        </section>

        {/* Footer */}
        <footer className="mt-6 sm:mt-8 text-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <p className="text-[11px] sm:text-xs text-muted-foreground/90 break-keep">
            PHONARA EMPIRE는 만 19세 이상 성인만 이용 가능한 서비스입니다.
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-gold/80 tracking-[0.28em] font-black">
            MADE IN KOREA, FOR THE WORLD <span className="text-base leading-none">🇰🇷</span>
          </p>
          <div className="hidden">
            <Sparkles /><Mountain />
          </div>
        </footer>
      </main>
    </div>
  );
}
