import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Crown, ShieldCheck, Mail, Lock, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/use-auth-ready";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { WELCOME_V19_KEY } from "@/pages/Welcome";

/**
 * v19.0 SecureAuth — Imperial Throne Gate (Slice 1 rebuild).
 *
 * - 단일 컬럼, full-bleed warm-gold. 산만한 라이브 패널 전부 제거 (Slice 2 에서 Imperial Live Pulse 로 통합).
 * - Primary CTA = Google 1탭. 이메일/비밀번호는 접힌 패널.
 * - 카피 톤 안전선: 결과 약속/손실 회복 암시 0건. "시작/입성/입금" 행동 단위만.
 * - 신규 가입 → /welcome (3-slide). 기존 계정 → /dashboard.
 * - 백엔드 호출 시그니처 그대로. UI만 재조립.
 */
export default function SecureAuth() {
  const nav = useNavigate();
  const { isReady, hasSession } = useAuthReady();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [emailOpen, setEmailOpen] = useState(false);

  useEffect(() => {
    if (isReady && hasSession) nav("/dashboard", { replace: true });
  }, [hasSession, isReady, nav]);

  const emailSchema = useMemo(() => z.string().trim().email(), []);

  /** 신규 가입자만 /welcome 으로, 그 외에는 /dashboard 로. */
  function postAuthRedirect(isNewUser: boolean) {
    let seenWelcome = false;
    try { seenWelcome = localStorage.getItem(WELCOME_V19_KEY) === "1"; } catch {}
    nav(isNewUser && !seenWelcome ? "/welcome" : "/dashboard", { replace: true });
  }

  async function signUpWithPassword() {
    const e = email.trim();
    if (!emailSchema.safeParse(e).success) {
      toast({ title: "이메일을 확인해 주세요", variant: "destructive" }); return;
    }
    if (password.length < 8) {
      toast({ title: "비밀번호는 8자 이상", variant: "destructive" }); return;
    }
    if (password !== password2) {
      toast({ title: "비밀번호가 일치하지 않습니다", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: e, password,
        options: { emailRedirectTo: `${window.location.origin}/complete-profile` },
      });
      if (error) throw error;
      if (data.session) {
        toast({ title: "🎉 가입 완료" });
        postAuthRedirect(true);
      } else {
        toast({ title: "✉️ 인증 메일을 보냈습니다", description: `${e} 에서 메일을 열어 인증해 주세요.` });
      }
    } catch (err: any) {
      toast({ title: "가입 실패", description: err.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  async function signInWithPassword() {
    const e = email.trim();
    if (!emailSchema.safeParse(e).success) {
      toast({ title: "이메일을 확인해 주세요", variant: "destructive" }); return;
    }
    if (!password) {
      toast({ title: "비밀번호를 입력해 주세요", variant: "destructive" }); return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) throw error;
      toast({ title: "환영합니다 💎" });
      postAuthRedirect(false);
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
      // OAuth 신규 가입자 추정 — /complete-profile 가 흐름을 마무리. /welcome 분기는 CompleteProfile 이후 처리.
      nav("/complete-profile", { replace: true });
    } catch (e: any) {
      toast({ title: "로그인 실패", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Imperial backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(65% 55% at 50% 22%, hsl(var(--primary) / 0.26), transparent 72%), radial-gradient(45% 35% at 15% 85%, hsl(var(--primary) / 0.10), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary) / 0.6), transparent)" }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 text-[11px]">
        <div className="inline-flex items-center gap-1.5 text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="hidden xs:inline">만 19세 이상만 이용 가능합니다</span>
          <span className="xs:hidden">19+</span>
        </div>
        <LanguageSwitcher variant="auth" />
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[460px] px-5 sm:px-6 pt-6 sm:pt-10 pb-12">
        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-imperial glow-imperial mb-4">
            <Crown className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-[10px] tracking-[0.32em] font-black text-primary/85">
            PHONARA · EMPIRE OS
          </div>
          <h1
            className="mt-3 font-imperial text-gradient-gold leading-[1.06] text-[34px] sm:text-[44px]"
            style={{ textShadow: "0 0 28px hsl(var(--primary) / 0.3)" }}
          >
            0원으로 시작하는<br />황제의 길
          </h1>
          <p className="mt-3 text-[13px] sm:text-sm text-muted-foreground break-keep">
            가입 즉시 <span className="text-foreground font-bold">10,000 PHON</span> 자동 지급 · 첫 입금 +30% 보너스
          </p>
        </section>

        {/* Primary CTA — Google 1탭 */}
        <section className="mt-7 space-y-3">
          <button
            onClick={() => social("google")}
            disabled={busy}
            className="w-full min-h-[60px] rounded-2xl bg-white text-black font-black tracking-wider text-base flex items-center justify-center gap-3 press transition-transform active:scale-[0.99] disabled:opacity-50 shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.35)]"
          >
            <svg viewBox="0 0 48 48" className="w-5 h-5">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.4 4 9.8 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.4-11.3-8L6 32.7C9.4 39.4 16.1 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2.1-2.1 4-3.9 5.4l6.3 5.3C41.7 35.5 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/>
            </svg>
            <span>Google로 즉시 시작</span>
          </button>

          <button
            onClick={() => social("apple")}
            disabled={busy}
            className="w-full min-h-[52px] rounded-2xl bg-foreground text-background font-bold text-sm flex items-center justify-center gap-2 press transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
              <path d="M11.182.008C11.148-.03 9.923.023 8.857 1.18 7.79 2.337 7.953 3.66 7.978 3.69c.024.03 1.514.083 2.45-1.32.937-1.402.728-2.32.754-2.362zm3.243 11.115c-.052-.105-2.518-1.339-2.288-3.708.23-2.37 1.812-3.019 1.837-3.089.023-.07-.776-1.025-1.673-1.51-.661-.348-1.385-.502-2.118-.502-.926 0-1.526.244-1.962.404-.43.158-.812.299-1.347.299-.515 0-.836-.16-1.31-.337-.413-.155-.95-.353-1.717-.353-1.292 0-2.654.79-3.494 2.151-1.187 1.929-1.014 5.55.99 8.626.71 1.099 1.671 2.34 2.929 2.354.561.006.929-.158 1.32-.328.448-.196.93-.405 1.79-.41.86-.005 1.296.207 1.737.408.385.176.737.34 1.243.337 1.255-.013 2.27-1.398 2.978-2.493.815-1.265 1.144-2.491 1.171-2.553z"/>
            </svg>
            Apple로 시작
          </button>
        </section>

        {/* Email toggle */}
        <section className="mt-5">
          <button
            onClick={() => setEmailOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] tracking-wider text-muted-foreground hover:text-foreground transition-colors press min-h-[40px]"
            aria-expanded={emailOpen}
          >
            <Mail className="w-3.5 h-3.5" />
            이메일로 시작
            {emailOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {emailOpen && (
            <div className="mt-3 rounded-2xl border border-primary/30 bg-card/50 backdrop-blur p-4 space-y-3">
              {/* Sub-tabs */}
              <div role="tablist" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-background/60 border border-border/40 text-[11px]">
                {([{ k: "signup", l: "회원가입" }, { k: "signin", l: "로그인" }] as const).map((it) => (
                  <button
                    key={it.k}
                    role="tab"
                    aria-selected={mode === it.k}
                    onClick={() => setMode(it.k)}
                    className={`min-h-[36px] rounded-lg font-bold tracking-wider transition-colors ${
                      mode === it.k
                        ? "bg-gradient-imperial text-primary-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {it.l}
                  </button>
                ))}
              </div>

              <label className="block">
                <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-primary/30 bg-background/80 focus-within:border-primary transition-colors">
                  <Mail className="w-4 h-4 text-primary/80 shrink-0" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소"
                    className="bg-transparent w-full focus:outline-none text-sm placeholder:text-muted-foreground/60"
                  />
                </div>
              </label>

              <label className="block">
                <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-primary/30 bg-background/80 focus-within:border-primary transition-colors">
                  <Lock className="w-4 h-4 text-primary/80 shrink-0" />
                  <input
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "비밀번호 (8자 이상)" : "비밀번호"}
                    className="bg-transparent w-full focus:outline-none text-sm placeholder:text-muted-foreground/60"
                  />
                </div>
              </label>

              {mode === "signup" && (
                <label className="block">
                  <div className="flex items-center gap-3 px-4 h-12 rounded-xl border border-primary/30 bg-background/80 focus-within:border-primary transition-colors">
                    <Lock className="w-4 h-4 text-primary/80 shrink-0" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="비밀번호 확인"
                      className="bg-transparent w-full focus:outline-none text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </label>
              )}

              <button
                onClick={mode === "signup" ? signUpWithPassword : signInWithPassword}
                disabled={busy || !email || !password || (mode === "signup" && !password2)}
                className="w-full min-h-[52px] rounded-xl bg-gradient-imperial text-primary-foreground font-black tracking-wider text-sm flex items-center justify-center gap-2 press disabled:opacity-50 transition-transform active:scale-[0.99]"
              >
                <Zap className="w-4 h-4" />
                {mode === "signup" ? "가입하고 입성" : "로그인"}
              </button>

              {mode === "signin" && (
                <button
                  onClick={() => nav("/forgot-password")}
                  className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground press min-h-[32px]"
                >
                  비밀번호를 잊으셨나요?
                </button>
              )}
            </div>
          )}
        </section>

        {/* Trust strip */}
        <section className="mt-7 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/40 bg-card/30 px-2 py-2.5">
            <div className="text-[10px] tracking-wider text-muted-foreground">평균 출금</div>
            <div className="text-[13px] font-black text-foreground mt-0.5">7분 이내</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/30 px-2 py-2.5">
            <div className="text-[10px] tracking-wider text-muted-foreground">연습 모드</div>
            <div className="text-[13px] font-black text-foreground mt-0.5">무료 제공</div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/30 px-2 py-2.5">
            <div className="text-[10px] tracking-wider text-muted-foreground">손실 보호</div>
            <div className="text-[13px] font-black text-foreground mt-0.5">7일 보장</div>
          </div>
        </section>

        <p className="mt-6 text-center text-[10px] text-muted-foreground/80 leading-relaxed break-keep">
          가입 시 <button className="underline hover:text-foreground" onClick={() => nav("/legal/terms")}>이용약관</button> · <button className="underline hover:text-foreground" onClick={() => nav("/legal/privacy")}>개인정보처리방침</button> 에 동의합니다.
        </p>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-primary/70">
          <Sparkles className="w-3 h-3" />
          <span className="tracking-[0.28em] font-bold">WORLD · LIVE · EMPIRE</span>
          <Sparkles className="w-3 h-3" />
        </div>
      </main>
    </div>
  );
}
