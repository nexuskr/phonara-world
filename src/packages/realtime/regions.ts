/**
 * @pkg/realtime/regions — Realtime Region Sharding (Phase 4 · PR-N)
 *
 * 4-파티션(wallet/game/chat/market) 위에 **리전 접두사**를 더해
 * 채널 이름을 `${region}:${partition}:${resource}` 형태로 만든다.
 *
 *   ap = Asia-Pacific (KR/JP/SG/TW/HK/CN)  ← default
 *   us = Americas
 *   eu = Europe / Africa / 그 외
 *
 * 같은 Supabase 인스턴스에서도 채널 키가 분리되어
 * (a) 브로드캐스트 fan-out 분산, (b) 추후 멀티 리전 인프라 전환 시 0 코드 변경.
 *
 * 본 모듈은 가시 텍스트가 없으므로 i18n 게이트 적용 대상 아님.
 */

export type RealtimeRegion = "ap" | "us" | "eu";

const STORAGE_KEY = "phonara:region:v1";
const DEFAULT_REGION: RealtimeRegion = "ap";

let cached: RealtimeRegion | null = null;

const AMERICAS_TZ = /^(America|US|Canada|Pacific\/Honolulu)/i;
const EUROPE_TZ = /^(Europe|Africa|Atlantic)/i;

function fromTimezone(tz: string | undefined): RealtimeRegion | null {
  if (!tz) return null;
  if (AMERICAS_TZ.test(tz)) return "us";
  if (EUROPE_TZ.test(tz)) return "eu";
  return "ap";
}

function fromLanguage(lang: string | undefined): RealtimeRegion | null {
  if (!lang) return null;
  const lower = lang.toLowerCase();
  if (/^(en-us|en-ca|es-mx|pt-br|es-)/.test(lower)) return "us";
  if (/^(de|fr|es|it|pt|nl|sv|no|da|fi|pl|tr|ru|cs|hu|el|ro|uk)/.test(lower)) return "eu";
  if (/^(ko|ja|zh|vi|th|id|ms|tl|hi|bn)/.test(lower)) return "ap";
  return null;
}

/** 사용자 수동 강제 (admin 디버그 / failover). null 로 초기화. */
export function setRegion(r: RealtimeRegion | null): void {
  cached = r;
  try {
    if (r) localStorage.setItem(STORAGE_KEY, r);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* SSR / 권한 없음 — 무시 */
  }
}

export function detectRegion(): RealtimeRegion {
  if (cached) return cached;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ap" || stored === "us" || stored === "eu") {
      cached = stored;
      return cached;
    }
  } catch {
    /* ignore */
  }

  if (typeof navigator === "undefined") {
    cached = DEFAULT_REGION;
    return cached;
  }

  let region: RealtimeRegion | null = null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    region = fromTimezone(tz);
  } catch {
    /* ignore */
  }
  if (!region) region = fromLanguage(navigator.language);
  if (!region) region = DEFAULT_REGION;

  cached = region;
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[PHONARA REALTIME] region=${region}`);
  }
  return region;
}

export function getRegion(): RealtimeRegion {
  return cached ?? detectRegion();
}

/** `${region}:${partition}:${resource}` 키 생성. 이미 region prefix가 있으면 그대로 반환. */
export function regionalKey(part: string, key: string): string {
  if (!key) return "";
  if (/^(ap|us|eu):/.test(key)) return key;
  const r = getRegion();
  // partition prefix 정규화 (호출부가 wallet: 등을 이미 붙였을 수 있음)
  const stripped = key.startsWith(`${part}:`) ? key.slice(part.length + 1) : key;
  return `${r}:${part}:${stripped}`;
}
