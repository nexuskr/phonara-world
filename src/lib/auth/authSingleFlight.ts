// P0-3 — Single-flight session verification
//
// 페이지 1회 진입 시 useAuthBridge / useAuthReady / useRequireAuth 등이 각각
// hasVerifiedSession() 을 호출 → /user 가 3~5회 발사되어 bad_jwt 폭주.
// 이 모듈은 in-flight Promise 공유 + 5s TTL 캐시로 /user 호출을 1회로 압축한다.
//
// 외부 시그니처는 hasVerifiedSession() 와 동일. onAuthStateChange 발생 시 캐시 무효화.

import { supabase } from "@/integrations/supabase/client";
import { isInvalidSessionError, clearBrokenLocalSession } from "@/lib/auth-recovery";
import type { User } from "@supabase/supabase-js";

const TTL_MS = 5_000;

type Cached = { ts: number; user: User | null };
let cached: Cached | null = null;
let inflight: Promise<Cached> | null = null;

async function doVerify(): Promise<Cached> {
  const { data: sess, error: sErr } = await supabase.auth.getSession();
  if (sErr) {
    if (isInvalidSessionError(sErr)) await clearBrokenLocalSession();
    return { ts: Date.now(), user: null };
  }
  if (!sess.session) return { ts: Date.now(), user: null };

  const { data: uRes, error: uErr } = await supabase.auth.getUser();
  if (uErr) {
    if (isInvalidSessionError(uErr)) await clearBrokenLocalSession();
    return { ts: Date.now(), user: null };
  }
  return { ts: Date.now(), user: uRes.user ?? null };
}

export async function verifySessionOnce(): Promise<User | null> {
  const now = Date.now();
  if (cached && now - cached.ts < TTL_MS) return cached.user;
  if (inflight) {
    const r = await inflight;
    return r.user;
  }
  inflight = doVerify().finally(() => { inflight = null; });
  const r = await inflight;
  cached = r;
  return r.user;
}

export function invalidateSessionCache() {
  cached = null;
}

// onAuthStateChange 발생 시 캐시 무효화 (단일 구독)
let bound = false;
export function bindAuthStateInvalidation() {
  if (bound) return;
  bound = true;
  try {
    supabase.auth.onAuthStateChange(() => invalidateSessionCache());
  } catch { /* noop */ }
}
bindAuthStateInvalidation();
