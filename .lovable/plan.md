# /complete-profile → dashboard 롤백 루프 복구 계획

## 목표

`/complete-profile` 저장 직후 잠깐 대시보드로 이동했다가 다시 `/complete-profile`로 되돌아오는 루프를 끊습니다.

## 현재 진단

코드상 루프는 아래 조건에서 발생할 가능성이 큽니다.

1. `CompleteProfile.tsx` 는 저장 성공 시 무조건 `/dashboard` 로 이동
2. 전역 `useAdultGate()` 는 모든 일반 페이지에서 `profiles.is_adult` 또는 `profiles.profile_completed` 가 false/NULL 이면 다시 `/complete-profile` 로 강제 이동
3. 그런데 현재 `CompleteProfile.tsx` 저장 로직은 `profiles.update(...).eq("id", user.id)` 만 사용하므로:
   - `profiles` 행이 아직 없으면 아무 것도 저장되지 않을 수 있음
   - `is_adult` 는 직접 업데이트하지 않고 DB 트리거/서버 계산에 의존
   - 저장 직후 재조회 검증 없이 바로 `/dashboard` 로 이동함

즉, **클라이언트는 저장 성공으로 간주했지만 전역 게이트는 아직 미완료 상태로 판단** 하면서 되돌림이 발생할 수 있습니다.

## 구현 범위

이번 수정은 프론트엔드만 최소 범위로 손봅니다.

### 1) `CompleteProfile.tsx` 저장 로직 안정화

- `update` 단독 호출 대신, 현재 사용자 기준으로 **행이 없을 때도 안전한 저장 방식**으로 보강
- 저장 후 즉시 `profiles` 를 다시 읽어서 아래 필드를 검증
  - `profile_completed`
  - `is_adult`
  - `birth_date`
- 검증이 통과한 경우에만 `/dashboard` 로 이동
- 검증 실패 시 사용자에게 토스트를 보여주고 현재 페이지에 머물게 처리

### 2) `/complete-profile` 초기 진입 로직 보강

- 기존 `profile_completed === true` 만 보지 않고
  - `profile_completed`
  - `is_adult`
를 함께 확인해, 반쯤 저장된 상태에서 잘못 `/dashboard` 로 보내지 않도록 정리

### 3) 게이트 조건 일관성 정리

- `useAdultGate()` 와 `AdultGate` 의 판정 조건이 `CompleteProfile` 저장 완료 조건과 완전히 같도록 맞춤
- 필요하면 `profile_completed && is_adult` 를 단일 완료 기준으로 통일

## 왜 이 방향이 안전한가

- 백엔드/관리형 연결 정보는 건드리지 않음
- 관리형 `ketlqzfaplppmupaiwft` 에 어떤 변경도 하지 않음
- 현재 독립 백엔드 상태와 무관하게, **행 미생성 / 트리거 미동작 / 저장 직후 반영 지연** 에 모두 방어적으로 대응 가능
- 수정 범위가 작고 롤백이 쉬움

## 수정 대상 파일

- `src/pages/CompleteProfile.tsx`
- `src/hooks/use-adult-gate.ts`
- 필요 시 `src/components/AdultGate.tsx`

## 완료 기준

1. `/complete-profile` 제출 후 즉시 다시 되돌아오지 않음
2. 저장 직후 `/dashboard` 유지
3. `profiles` 행이 없거나 일부 필드가 비어 있는 경우에도 사용자에게 명확한 실패 메시지 노출
4. 기존 성인 인증 게이트 동작은 유지

## 사용자 확인 포인트

- 저장 후 주소가 `/dashboard` 에 그대로 머무는지
- 새로고침 후에도 다시 `/complete-profile` 로 가지 않는지
- 콘솔의 `profiles` 400/404 또는 RPC 404 가 더 이상 루프를 유발하지 않는지