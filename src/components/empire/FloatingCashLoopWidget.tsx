/**
 * FloatingCashLoopWidget — 모든 페이지 우하단에 떠 있는 3분 캐시 루프.
 * - 비로그인: 컨버트 시 /secure-auth?signup=1&next=/wallet?intent=first-deposit&godmode=1
 * - 로그인: FirstDepositGodModeModal 즉시 오픈
 * - sessionStorage `pcl_dismissed=1` 이면 숨김
 * - 모바일 60fps 유지: framer-motion 최소화, lazy import
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingSlot } from "@/components/ui/floating-dock";

const ThreeMinuteCashLoop = lazy(() => import("./ThreeMinuteCashLoop"));
const FirstDepositGodModeModal = lazy(() => import("./FirstDepositGodModeModal"));

const DISMISS_KEY = "pcl_dismissed";
const HIDDEN_PATHS = ["/secure-auth", "/wallet", "/admin", "/auth", "/reset-password", "/forgot-password"];

export default function FloatingCashLoopWidget() {
  const nav = useNavigate();
  const loc = useLocation();
  const [hidden, setHidden] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [godModalOpen, setGodModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const dismissed = typeof window !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1";
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setHasSession(!!data.session);
      setHidden(dismissed);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setHasSession(!!s);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const onHiddenPath = HIDDEN_PATHS.some((p) => loc.pathname.startsWith(p));
  if (hidden || onHiddenPath) return null;

  function handleConvert() {
    if (hasSession) {
      setGodModalOpen(true);
    } else {
      const next = encodeURIComponent("/wallet?intent=first-deposit&godmode=1&tab=deposit&amount=100000");
      nav(`/secure-auth?signup=1&next=${next}`);
    }
  }

  function handleDismiss() {
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setHidden(true);
  }

  return (
    <>
      <FloatingSlot slot="bottomRight" order={0} className="w-full sm:w-auto">
        <div className="w-full sm:max-w-md">
          <Suspense fallback={null}>
            <ThreeMinuteCashLoop onConvert={handleConvert} onDismiss={handleDismiss} />
          </Suspense>
        </div>
      </FloatingSlot>
      <Suspense fallback={null}>
        <FirstDepositGodModeModal
          open={godModalOpen}
          onOpenChange={setGodModalOpen}
          onClaimed={() => nav("/dashboard")}
        />
      </Suspense>
    </>
  );
}
