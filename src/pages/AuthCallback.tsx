import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingPage } from "@/components/ui/loading-state";
import { notify } from "@/lib/notify";
import { z } from "zod";
import { AlertTriangle, Mail, RefreshCw } from "lucide-react";

/**
 * Handles Magic Link / OAuth callback. Supabase places the session info in
 * either the URL hash (#access_token=...) or as a `?code=...` PKCE param.
 *
 * Also surfaces friendly error UI for `otp_expired` / `access_denied` /
 * link-already-used cases with a one-tap re-send.
 */
type LinkErrorKind = "expired" | "used" | "denied" | "generic" | null;

function detectLinkError(): { kind: LinkErrorKind; description: string } {
  if (typeof window === "undefined") return { kind: null, description: "" };
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const url = new URL(window.location.href);
  const error = hashParams.get("error") || url.searchParams.get("error") || "";
  const code = hashParams.get("error_code") || url.searchParams.get("error_code") || "";
  const desc =
    hashParams.get("error_description") ||
    url.searchParams.get("error_description") ||
    "";
  if (!error && !code) return { kind: null, description: "" };
  if (code === "otp_expired" || /expired/i.test(desc)) {
    return { kind: "expired", description: desc };
  }
  if (/already.*used|invalid.*token/i.test(desc)) {
    return { kind: "used", description: desc };
  }
  if (error === "access_denied") {
    return { kind: "denied", description: desc };
  }
  return { kind: "generic", description: desc || error };
}

async function routeAfterAuth(uid: string, nav: ReturnType<typeof useNavigate>) {
  // Profile completion has highest priority
  const { data: prof } = await supabase
    .from("profiles")
    .select("profile_completed, tier")
    .eq("id", uid)
    .maybeSingle();

  if (!prof?.profile_completed) {
    nav("/complete-profile", { replace: true });
    return;
  }

  // Branch on package ownership: no package → first-deposit funnel
  const { data: pkg } = await supabase
    .from("package_purchases")
    .select("id")
    .eq("user_id", uid)
    .eq("status", "approved")
    .limit(1);

  if (!pkg || pkg.length === 0) {
    nav("/wallet?tab=deposit&intent=first-deposit", { replace: true });
    return;
  }
  nav("/dashboard", { replace: true });
}

export default function AuthCallback() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("로그인 확인 중…");
  const [linkErr, setLinkErr] = useState<LinkErrorKind>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const detected = detectLinkError();
    if (detected.kind) {
      setLinkErr(detected.kind);
      return;
    }
    (async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href,
          );
          if (error) throw error;
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          notify.success("로그인 완료");
          await routeAfterAuth(data.session.user.id, nav);
        } else {
          setMsg("세션을 찾을 수 없습니다. 다시 시도해주세요.");
          setTimeout(() => nav("/secure-auth", { replace: true }), 2000);
        }
      } catch (e: any) {
        notify.error("로그인 실패", {
          description: e?.message ?? "잠시 후 다시 시도해주세요.",
        });
        setTimeout(() => nav("/secure-auth", { replace: true }), 1500);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nav]);

  async function resend() {
    const v = z.string().email().safeParse(resendEmail.trim());
    if (!v.success) {
      notify.error("이메일을 정확히 입력해주세요");
      return;
    }
    setResending(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: resendEmail.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      notify.success("매직링크 재발송 완료", {
        description: "메일함을 확인해주세요. 5분 내 유효합니다.",
      });
    } catch (e: any) {
      notify.error("재발송 실패", { description: e?.message });
    } finally {
      setResending(false);
    }
  }

  if (linkErr) {
    const titleMap: Record<Exclude<LinkErrorKind, null>, string> = {
      expired: "매직링크가 만료되었습니다",
      used: "이미 사용된 링크입니다",
      denied: "접근이 거부되었습니다",
      generic: "로그인 링크 처리 실패",
    };
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-strong rounded-3xl p-7 max-w-md w-full neon-border">
          <div className="flex items-center gap-2 text-gold mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-imperial font-black tracking-wider text-sm">
              MAGIC LINK
            </span>
          </div>
          <h1 className="font-imperial font-black text-2xl text-gradient-gold mb-2">
            {titleMap[linkErr]}
          </h1>
          <p className="text-sm text-muted-foreground break-keep mb-5">
            보안을 위해 매직링크는 1회 + 5분만 유효합니다. 아래에 이메일을 입력하면
            새 링크를 즉시 보내드립니다.
          </p>
          <div className="flex items-center gap-2 glass rounded-xl px-3 py-2 mb-3">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="이메일 주소"
              className="bg-transparent outline-none w-full text-sm"
              autoFocus
            />
          </div>
          <button
            onClick={resend}
            disabled={resending}
            className="w-full min-h-[56px] rounded-2xl bg-gradient-gold text-gold-foreground font-display font-black flex items-center justify-center gap-2 glow-gold press disabled:opacity-50"
            aria-label="매직링크 재발송"
          >
            <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
            {resending ? "발송 중…" : "새 매직링크 받기"}
          </button>
          <Link
            to="/secure-auth"
            className="block text-center text-xs text-muted-foreground hover:text-primary mt-4 min-h-[36px] py-2"
          >
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-strong rounded-2xl p-8 max-w-sm w-full text-center">
        <LoadingPage label={msg} />
      </div>
    </div>
  );
}
