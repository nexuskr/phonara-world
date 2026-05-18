# phonara-world-main /complete-profile 백엔드 복구 계획

## 현재 확인된 사실

### 프론트엔드 기준
- `/complete-profile` 라우트는 이미 등록되어 있습니다.
- `src/pages/CompleteProfile.tsx` 는 `complete_profile` RPC를 호출하지 않고, `profiles` 테이블을 직접 `UPDATE` 합니다.
- 이 흐름과 함께 실제로 연동되는 백엔드 호출은 다음입니다.
  - `register_device` — 로그인 직후 `useAuthBridge` / `src/lib/deviceFingerprint.ts`
  - `assign_persona` — 로그인 직후 `useAuthBridge`
  - `record_span` — `src/lib/spans.ts`
  - `get_empire_seats_remaining` — `src/pages/Empire.tsx`
  - `get_active_boost_count` — 현재 코드 탐색 범위에서는 직접 사용 흔적 미약하나, 백엔드 surface에는 포함됨

### 현재 연결된 백엔드 기준
- 지금 이 프로젝트가 바라보는 백엔드에는 아래 함수가 이미 존재합니다.
  - `get_active_boost_count`
  - `get_empire_seats_remaining`
  - `register_device`
  - `assign_persona`
  - `record_span`
- `profiles` 테이블에는 이미 아래 RLS 정책이 있습니다.
  - 본인 `SELECT`
  - 본인 `INSERT`
  - 본인 `UPDATE`
- `auth.users` → `public.handle_new_user()` 트리거도 이미 연결되어 있습니다.
- 즉, **현재 repo가 연결된 관리형 백엔드에는 요청하신 핵심 요소가 대부분 이미 존재**합니다.

### 진짜 위험 지점
- 이 repo는 아직 `supabase/config.toml` 기준 `ketlqzfaplppmupaiwft` 에 연결되어 있습니다.
- 문서상 독립 백엔드 `phonara-world-main` 은 별도 ref(`wyhhdyrvqtoejvusnhva`) 입니다.
- 따라서 지금 바로 마이그레이션을 실행하면 **독립 백엔드가 아니라 현재 관리형 백엔드에 적용될 위험**이 큽니다.

## 목표

독립 백엔드 `phonara-world-main` 에서 `/complete-profile` 흐름이 막히지 않도록, 필요한 함수 / 권한 / RLS / signup trigger 상태를 **독립 백엔드 기준으로 정렬**하고 검증합니다.

## 실행 계획

### 1. 대상 백엔드 정렬
- 독립 백엔드 ref를 기준으로 작업 대상을 명확히 전환합니다.
- 잘못된 프로젝트에 마이그레이션이 들어가지 않도록 현재 링크 상태를 먼저 정리합니다.

### 2. 복구용 마이그레이션 1회 작성
독립 백엔드에 대해 아래를 모두 idempotent 하게 보장하는 수복 마이그레이션을 작성합니다.

- `register_device` 존재 및 `authenticated` 실행 권한
- `assign_persona` 존재 및 `authenticated` 실행 권한
- `record_span` 존재 및 `authenticated` 실행 권한
- `get_active_boost_count` 존재 및 필요한 실행 권한
- `get_empire_seats_remaining` 존재 및 필요한 실행 권한
- `profiles` RLS 활성화
- `profile_self_select / insert / update` 정책 재보장
- `handle_new_user` 함수 재정의
- `on_auth_user_created` 트리거 재생성

`complete_profile` RPC는 현재 프론트 코드에서 사용하지 않으므로, 이 계획에서는 **불필요한 신규 RPC를 만들지 않고 실제 호출 surface만 복구**합니다.

### 3. 권한 표면 점검
- 함수 EXECUTE 권한이 `PUBLIC` 또는 잘못된 role로 새지 않았는지 함께 점검합니다.
- 가능하면 기존 permission baseline 흐름과 충돌하지 않도록 유지합니다.

### 4. 독립 백엔드 검증
복구 후 아래를 독립 백엔드에서 확인합니다.

- 함수 존재 여부
- 함수 실행 권한
- `profiles` 정책 존재 여부
- `handle_new_user` 트리거 존재 여부
- 신규 가입 시 `profiles / wallet_balances / user_roles` 자동 생성 여부

### 5. 프론트 연결 확인
- 독립 백엔드 URL / publishable key가 Production 빌드에 실제로 들어가는지 재확인합니다.
- `/complete-profile` 가 SPA 라우팅과 백엔드 인증 흐름 둘 다 통과하는지 점검합니다.

## 사용자 영향

- 신규 가입자 프로필 자동 생성 실패
- `/complete-profile` 저장 실패
- 로그인 직후 디바이스 등록 / persona 부여 / span 기록 오류

이 세 갈래를 한 번에 막는 계획입니다.

## 완료 기준

- 독립 백엔드에서 필요한 함수 5종이 모두 존재하고 권한이 맞음
- `profiles` RLS가 본인 insert/update를 허용함
- `handle_new_user` 트리거가 정상 연결됨
- Production 환경에서 `/complete-profile` 진입 후 저장이 막히지 않음

## 참고

- 별도 ref로 독립된 backend가 맞다면, 이번 작업의 핵심은 **새 기능 추가가 아니라 독립 백엔드와 현재 repo 스키마의 drift 복구**입니다.
