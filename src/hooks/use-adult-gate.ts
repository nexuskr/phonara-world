import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// 19+ 인증을 마치지 않은 로그인 사용자는 /complete-profile 로 강제 이동.
// 공개/인증/완성 페이지에서는 동작하지 않음.
const EXEMPT = [
  "/", "/auth", "/secure-auth", "/auth/callback",
  "/forgot-password", "/reset-password", "/complete-profile",
  "/unsubscribe", "/trust", "/status", "/c", "/vision",
];

function isExempt(path: string) {
  if (EXEMPT.includes(path)) return true;
  return EXEMPT.some((p) => p !== "/" && path.startsWith(p + "/"));
}

export function useAdultGate() {
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isExempt(loc.pathname)) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return; // 비로그인은 통과 (각 라우트의 자체 보호에 위임)
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_adult, birth_date, profile_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!profile?.profile_completed || !profile?.is_adult) {
        nav("/complete-profile", { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [loc.pathname, nav]);
}
