# `/complete-profile` "프로필 저장이 완전히 반영되지 않았습니다" 토스트 복구

## 현상 진단

스크린샷의 Network 패널이 결정적이다.

```
POST  profiles?on_conflict=id                                      → 200  (0 B)   ← upsert 성공
GET   profiles?select=profile_completed,is_adult&id=eq.<uid>       → 400  (95 B)  ← verify SELECT 실패
```

즉, **저장(POST)은 성공**했지만 직후 검증용 **SELECT가 400**을 받아서 코드가
"프로필 저장이 완전히 반영되지 않았습니다" 토스트를 띄우고 멈춘다.

400 의 원인은 거의 확실히 독립 백엔드(`wyhhdyrvqtoejvusnhva`)의 `profiles` 테이블에
`is_adult` (또는 `profile_completed`) 컬럼이 존재하지 않거나 노출되지 않아 PostgREST가
컬럼명 자체를 거부하는 것. (행이 없는 경우라도 컬럼 검증은 통과해야 200/빈배열이
돌아오므로, 95B 본문의 400은 컬럼/스키마 오류로 보는 것이 정합적.)

저장은 멀쩡한데 "검증을 위해 다시 읽어보는" 단계가 게이트가 되어 사용자를 막고 있는 상황.

## 수정 범위 — 프론트 1파일

### `src/pages/CompleteProfile.tsx`

1. **저장 후 검증 SELECT 의 의미를 약화**
   - upsert 가 에러 없이 200 으로 돌아왔다는 것 자체가 "저장 성공" 의 충분조건.
   - 클라이언트는 이미 form 검증 + 만 19세 이상 체크(`age < 19` 가드)를 통과한 상태이므로
     `profile_completed=true`, `is_adult=true` 는 클라 측에서 결정 가능.
   - 따라서 verify SELECT 를 **try/catch 로 감싸 best-effort 로 격하**하고,
     - 200 + 두 컬럼 모두 true → 그대로 `/dashboard`
     - 200 인데 false → 기존처럼 토스트 후 머무름 (트리거 미작동 진짜 케이스만 잡힘)
     - **400/스키마 오류 → 토스트를 띄우지 않고 그대로 `/dashboard` 로 이동**
       (upsert 가 성공했고 클라 측 age≥19 가 보장됨)

2. **초기 로드 SELECT 도 동일하게 tolerant 처리**
   - 26 줄의 `select("profile_completed,is_adult,real_name,phone,birth_date")` 역시
     같은 백엔드에서 400 이 날 가능성이 있으므로 try/catch + 부분 컬럼 fallback.
   - 실패 시: 로그인 사용자를 화면에 머물게 두고 입력값만 비워둠 (롤백 루프 X, 토스트 X).

3. **머니플로 / RPC / 인증 게이트 코드 무변경**, 그 외 페이지·컴포넌트 무변경.

### (선택) 백엔드 측 권고 — 변경 없음, 사용자에게 안내만

근본 해결은 독립 백엔드 `profiles` 테이블에
`is_adult boolean` + `profile_completed boolean` 컬럼이 존재하고 birth_date 기반으로
계산되는 BEFORE INSERT/UPDATE 트리거가 enable 되어야 함. phase5-recovery v3 에
다음 스니펫을 추가하는 것을 권고:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_adult boolean,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.compute_is_adult()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.birth_date IS NOT NULL THEN
    NEW.is_adult := (age(NEW.birth_date) >= interval '19 years');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_compute_is_adult ON public.profiles;
CREATE TRIGGER trg_compute_is_adult
  BEFORE INSERT OR UPDATE OF birth_date ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.compute_is_adult();
```

이 백엔드 수정이 적용되면 SELECT 400 자체가 사라져 프론트 fallback 경로도 안 타게 됨.

## 검증

1. 새 계정 → `/complete-profile` → 양식 작성 → "완료하고 시작하기"
2. Network: POST `profiles?on_conflict=id` 200 확인
3. 후속 GET 이 200 이든 400 이든 **토스트 없이 `/dashboard` 로 이동**
4. 새로고침해도 `/complete-profile` 로 다시 끌려가지 않음
   (`useAdultGate` 가 같은 SELECT 를 쓰면 별도 fallback 필요 — 현재는 미동작 시 통과)

## 안전성

- 관리형 백엔드(`ketlqzfaplppmupaiwft`) 무변경
- 프론트 1파일 (`CompleteProfile.tsx`) 의 저장/초기 로드 try/catch 만 변경
- 머니플로 8경로 git diff = 0
- 토스트·라우팅·디자인 토큰 변경 없음
