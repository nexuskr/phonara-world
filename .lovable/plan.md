# phonara.net /complete-profile 404 — 진단 결과 및 수정 계획

## 실측 진단 (방금 HTTP로 직접 확인)

| 경로 | 결과 |
|---|---|
| `https://phonara.net/complete-profile` | 307 → `www.phonara.net/complete-profile` (정상, www가 primary) |
| `https://www.phonara.net/complete-profile` | **404 NOT_FOUND** (`x-vercel-error: NOT_FOUND`) |
| `https://www.phonara.net/` | 200 OK (빌드 자체는 살아있음) |
| 빌드된 `/assets/index-*.js` 내부 | **`ketlqzfaplppmupaiwft.supabase.co` 문자열 0회 검출** |

## 확정된 두 가지 진짜 원인

### 원인 A — Vercel Production 환경변수 미설정 (치명적)

빌드된 JS 번들에 Supabase URL 문자열이 전혀 들어있지 않습니다. 이는 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` 가 Vercel Production 환경에 등록되지 않은 채 빌드된 증거입니다. (Vite의 `import.meta.env.VITE_*` 는 빌드 타임에 문자열 치환되므로, env가 없으면 `undefined` 가 박힘 → `createClient(undefined, undefined)` → 모든 auth/db 호출 깨짐 → 콘솔에 "수많은 404")

### 원인 B — SPA fallback 미작동 (페이지 자체 404)

`/complete-profile` 직접 접속 시 Vercel이 `index.html` 로 fallback 하지 않고 그대로 404 반환. 현재 git의 `vercel.json` 에는 올바른 rewrite 가 있으나 — **현재 phonara.net 에 배포된 빌드는 그 vercel.json 이 적용되기 전 버전**입니다.

## 수정 사항

### 1. 코드 수정 (Lovable에서 처리)

`vercel.json` 의 SPA rewrite 패턴을 더 안전한 방식으로 단순화합니다. 현재 부정형 lookahead 패턴은 일부 Vercel 빌드 환경에서 적용 누락 사례가 보고됨.

```json
{
  "rewrites": [
    { "source": "/((?!api/|assets/|sounds/|.*\\.).*)", "destination": "/index.html" }
  ]
}
```
(차이: `api`/`assets`/`sounds` 뒤에 `/` 강제 + 점 포함 파일만 제외. 라우트 `/complete-profile` 같은 비-파일 경로는 100% fallback)

### 2. 사용자가 직접 해야 하는 작업 (Lovable AI는 불가)

#### A. Vercel 환경변수 추가 (가장 중요)

Vercel Dashboard → `phonara-world` 프로젝트 → Settings → Environment Variables 에서 다음 3개를 **Production / Preview / Development 3개 환경 모두**에 체크하고 저장:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://ketlqzfaplppmupaiwft.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldGxxemZhcGxwcG11cGFpd2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNzQzMzcsImV4cCI6MjA5MzY1MDMzN30.GtdLLkaCiNUsEkqHYd1fg8fUk0dtojSubj6lPA3igtk` |
| `VITE_SUPABASE_PROJECT_ID` | `ketlqzfaplppmupaiwft` |

(참고: 코드 `src/integrations/supabase/client.ts` 는 `VITE_SUPABASE_PUBLISHABLE_KEY` 만 읽습니다. `VITE_SUPABASE_ANON_KEY` 라는 변수명은 이 프로젝트에서 안 씁니다 — 이전 답변에서 둘 다 안내한 부분 정정.)

#### B. Supabase Auth URL Configuration

Lovable Cloud (Supabase) Auth → URL Configuration:
- **Site URL**: `https://www.phonara.net`
- **Redirect URLs** 에 추가:
  - `https://www.phonara.net/**`
  - `https://phonara.net/**`
  - `https://phonara-world-*.vercel.app/**`

(없으면 OAuth/매직링크 콜백이 거부됨)

#### C. Vercel Redeploy (캐시 없이)

Vercel Dashboard → Deployments → 최신 배포 → ⋯ → **Redeploy** → **"Use existing Build Cache" 체크 해제** → Redeploy.

(VITE_* 환경변수는 빌드 타임에 박히므로 env 추가만으로는 반영 안 됨. 반드시 재빌드 필요.)

## 검증 (재배포 후 제가 자동으로 수행)

```bash
curl -sI https://www.phonara.net/complete-profile          # → 200 (404 아님)
curl -s  https://www.phonara.net/assets/index-*.js | grep ketlqzfaplppmupaiwft  # → match
```

둘 다 통과하면 사용자가 `/complete-profile` 접속 시 정상 동작 확인 가능.

## 부수 정보 — 이전 메시지에서 요청된 RPC들

DB 실측 결과 `get_active_boost_count` / `get_empire_seats_remaining` / `record_span` 는 **이미 존재**합니다. `complete_profile` 이라는 RPC는 코드 어디서도 호출하지 않으므로 만들 필요 없습니다 (CompleteProfile.tsx 는 `profiles` 테이블에 직접 UPDATE). 따라서 이번 마이그레이션은 없습니다.
