# `/wallet` 성인인증 무한루프 복구 계획

## 문제 정의

현재 `/complete-profile` 저장 자체는 성공하지만, `/wallet` 라우트에 걸린 로컬 성인인증 모달이 같은 프로필 조회를 다시 수행하면서 스키마 오류(400)를 **미인증 상태로 오판**하고 있다.

결과적으로 흐름이 아래처럼 반복된다.

```text
complete-profile 저장 성공
→ /dashboard 또는 앱 내부 이동 성공
→ /wallet 진입
→ AdultGate가 profiles.select("is_adult,birth_date,profile_completed") 실행
→ 400 또는 undefined
→ blocked 처리 + "생년월일 입력하기"
→ /complete-profile 재진입
→ 다시 저장
→ /wallet 진입 시 동일 반복
```

즉, 지금의 핵심 문제는 `src/components/AdultGate.tsx` 가 `src/hooks/use-adult-gate.ts` 와 달리 **tolerant 처리되지 않은 점**이다.

## 수정 범위

### 1) `src/components/AdultGate.tsx`

`use-adult-gate` 와 동일한 기준으로 복구한다.

- `profiles.select("is_adult,birth_date,profile_completed")` 를 `try/catch` + `error` 체크로 감싼다.
- SELECT가 400/권한 오류/스키마 drift 를 반환하면 **blocked 로 보내지 않고 통과**시킨다.
- 명시적으로 아래 경우에만 차단한다.
  - 행이 존재하고 `profile_completed === false`
  - 행이 존재하고 `is_adult === false`
- `profile?.is_adult` 만으로 판단하던 현재 로직은 제거한다.

이렇게 하면 `/wallet` 의 라우트 래퍼와 글로벌 훅이 같은 정책을 사용하게 된다.

### 2) 판정 기준 정렬

현재 두 군데가 서로 다르게 동작한다.

- `src/hooks/use-adult-gate.ts` → 400이면 통과
- `src/components/AdultGate.tsx` → 400이어도 `profile` 이 없으니 blocked

이번 수정으로 두 경로를 동일하게 맞춘다.

## 기대 결과

- 가입 후 `/complete-profile` 저장 성공
- `/wallet` 버튼 클릭
- 프로필 조회가 200이면 정상 판정
- 프로필 조회가 400이어도 성인인증 모달 재노출 없이 `/wallet` 진입
- 더 이상 `생년월일 입력하기 → complete-profile → 저장 → wallet → 재차단` 루프가 발생하지 않음

## 기술 메모

- 이번 수정은 프론트 1파일 중심이다.
- 백엔드 근본 원인은 여전히 독립 백엔드의 `profiles` 컬럼 drift 가능성이 높다.
- 이후 안정화를 원하면 백엔드에 `is_adult`, `profile_completed` 컬럼/트리거를 맞추는 것이 바람직하다.
- 다만 이번 복구는 사용자 흐름 차단을 즉시 멈추는 데 집중한다.

## 검증

1. 신규 계정 가입
2. `/complete-profile` 입력 후 저장
3. 환영 토스트 확인
4. `/wallet` 클릭
5. 성인인증 모달이 다시 뜨지 않고 지갑 화면 유지 확인
6. 새로고침 후 `/wallet` 재진입 확인
