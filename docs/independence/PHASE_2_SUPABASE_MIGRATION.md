# Phase 2 — Supabase 자체 호스팅으로 독립

> 목표: Lovable Cloud(관리형 Supabase) 의존 제거. Lovable이 사라져도 백엔드(DB / Auth / Edge Functions / Storage)가 그대로 살아있게 만든다.

---

## 0. 현재 상태 (Phase 1 완료 시점)

- ✅ 코드 전체가 GitHub `nexusr/phonara-world` private repo에 있음 (Lovable ↔ GitHub 양방향 동기화)
- ❌ DB / Auth / Edge Functions / Storage는 여전히 Lovable Cloud의 Supabase 프로젝트(`ketlqzfaplppmupaiwft`) 위에서 동작
- ❌ 도메인(phonara.world / phonara.net)은 Lovable에서 구매 — 60일 이전 잠금

Phase 2는 위 ❌ 중 백엔드를 자체 Supabase 계정으로 옮기는 단계.

---

## 1. 두 가지 경로

| 경로 | 설명 | 권장 |
|---|---|---|
| **A. Supabase Cloud (직접 계정)** | supabase.com에 본인 계정으로 새 프로젝트 생성 | ✅ 추천 (운영 부담 최소) |
| **B. Self-hosted Supabase** | 본인 서버(Docker / Fly.io / Railway 등)에 Supabase 스택 직접 운영 | 완전 독립 원하면 |

A → 나중에 언제든 B로 이전 가능. 먼저 A로 가는 것을 권장.

---

## 2. Phase 2A — Supabase Cloud로 이전 (체크리스트)

### 2-1. 새 Supabase 프로젝트 생성
- supabase.com 가입 → New Project
- Region: 사용자 가까운 곳 (한국 사용자 → `ap-northeast-2` Seoul)
- DB password 강력하게 설정 후 안전한 곳에 보관

### 2-2. 스키마 / 데이터 이전
```bash
# 현재 Lovable Cloud DB 덤프 (Lovable에 요청 또는 Cloud UI에서 export)
# 새 Supabase 프로젝트의 SQL Editor에 import

# 또는 supabase CLI:
supabase link --project-ref OLD_REF
supabase db dump -f schema.sql --schema public
supabase db dump -f data.sql --data-only --schema public

supabase link --project-ref NEW_REF
psql $NEW_DB_URL -f schema.sql
psql $NEW_DB_URL -f data.sql
```

### 2-3. Edge Functions 재배포
```bash
# repo의 supabase/functions/ 가 그대로 사용 가능
supabase link --project-ref NEW_REF
supabase functions deploy --no-verify-jwt  # 함수별 verify_jwt 설정은 config.toml 따라감
```

### 2-4. Secrets 이전
Lovable Cloud > Edge Functions > Secrets 목록을 그대로 새 프로젝트 Dashboard > Edge Functions > Secrets에 복사:
- `LOVABLE_API_KEY` (자체 운영 시 → `OPENAI_API_KEY` / `GEMINI_API_KEY` 등으로 교체 + 코드 수정)
- `RESEND_API_KEY`, `LINE_*`, `VAPID_*`, `CLOUDFLARE_R2_*` 등

### 2-5. Storage 버킷 / Auth 설정 복제
- Storage: 버킷 이름 / 공개여부 / RLS 정책 동일하게 생성
- Auth: Providers (Google 등), Email templates, Site URL, Redirect URLs

### 2-6. 클라이언트 환경변수 교체
GitHub repo에서 `.env` 또는 호스팅 환경(Vercel/Cloudflare Pages)에 새 값 주입:
```
VITE_SUPABASE_URL="https://NEW_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="NEW_ANON_KEY"
VITE_SUPABASE_PROJECT_ID="NEW_REF"
```

`src/integrations/supabase/client.ts`는 Lovable 자동 생성 파일이므로, 자체 호스팅 후에는 수동 관리 필요. 첫 이전 시 한 번 `client.ts`를 일반 파일로 변환:
```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
);
```

### 2-7. 호스팅 (Vercel / Cloudflare Pages 권장)
- GitHub repo 연결 → 자동 빌드
- 환경변수 위 3개 + 필요한 빌드타임 변수 입력
- Production 도메인은 Phase 3에서 phonara.net / .world로 교체

### 2-8. 마이그레이션 검증
- [ ] 회원가입 / 로그인 / Google OAuth 작동
- [ ] RLS 정책 모두 적용됨 (`scripts/...` 또는 `src/test/rls-integrity.test.ts` 통과)
- [ ] Edge Functions 호출 정상 (특히 `public-status`, `request_withdrawal` 등 핵심)
- [ ] Realtime 채널 작동 (chat_messages, anomaly_events 등)
- [ ] 이메일 송신 (Resend) 정상

### 2-9. Lovable Cloud 분리
- Lovable에서는 더 이상 백엔드 변경 금지 (drift 방지)
- 또는 Lovable 프로젝트 보관/삭제

---

## 3. Phase 2B — Self-hosted (선택)

Supabase는 오픈소스. Docker Compose로 직접 운영 가능.
- 공식 가이드: https://supabase.com/docs/guides/self-hosting
- 본 repo의 `phonara-unicorn/docker-compose.yml`은 **앱 단의 Redis/Postgres/MinIO 로컬 스택**(별도 워커용). Supabase 본체 자체호스팅과는 별개.
- Supabase self-host 후 위 2-3 ~ 2-6 그대로 적용 (URL만 자체 도메인으로).

---

## 4. Phase 3 미리보기 — 도메인 이전

- Lovable에서 구매한 도메인은 **구매 후 60일 이전 잠금** (ICANN 규정).
- 잠금 해제 후: Lovable에서 EPP/Auth code 발급 요청 → 외부 레지스트라(Cloudflare Registrar 권장, 원가) 이전.
- 이전 후 DNS는 Cloudflare에서 직접 관리 → 자체 호스팅(Vercel/Cloudflare Pages)으로 A/CNAME.

---

## 5. 롤백 계획

Phase 2 진행 중 문제 발생 시:
1. 호스팅 환경변수만 옛 Lovable Cloud URL로 되돌림 → 즉시 복구
2. GitHub repo는 그대로, 환경변수만 토글하는 구조이므로 코드 변경 없음
3. 신규 데이터가 새 Supabase에만 들어갔다면 역방향 dump/restore 필요

---

준비 되시면 Phase 2A 시작 신호 주세요. 위 체크리스트 단계별로 안내합니다.
