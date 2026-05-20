// P0-3 — Refresh mutex with exponential backoff
//
// 여러 컴포넌트가 동시에 refreshSession() 을 호출하면 race + 다중 /token 발사가
// 발생한다. 이 모듈은 in-flight Promise 공유 (mutex) + 실패 시 4회 backoff 재시도.

import { supabase } from "@/integrations/supabase/client";
import { isInvalidSessionError, clearBrokenLocalSession } from "@/lib/auth-recovery";
import { invalidateSessionCache } from "@/lib/auth/authSingleFlight";
import type { Session } from "@supabase/supabase-js";

const BACKOFF_MS = [500, 1_000, 2_000, 4_000];

let inflight: Promise<Session | null> | null = null;

async function attemptRefresh(): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    // bad_jwt → 더 이상 재시도하지 말고 로컬 세션 정리
    if (isInvalidSessionError(error)) {
      await clearBrokenLocalSession();
      return null;
    }
    throw error;
  }
  return data.session;
}

async function refreshWithBackoff(): Promise<Session | null> {
  let lastErr: unknown = null;
  for (let i = 0; i < BACKOFF_MS.length; i++) {
    try {
      const s = await attemptRefresh();
      invalidateSessionCache();
      return s;
    } catch (err) {
      lastErr = err;
      // 네트워크/일시 오류만 재시도. bad_jwt 는 attemptRefresh 내부에서 null 반환.
      await new Promise((res) => setTimeout(res, BACKOFF_MS[i] + Math.random() * 250));
    }
  }
  if (process.env.NODE_ENV !== "production" && lastErr) {
    console.warn("[refreshMutex] gave up after backoff:", lastErr);
  }
  return null;
}

export function safeRefreshSession(): Promise<Session | null> {
  if (inflight) return inflight;
  inflight = refreshWithBackoff().finally(() => { inflight = null; });
  return inflight;
}
