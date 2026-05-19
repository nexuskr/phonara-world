# `/complete-profile` nickname NOT NULL 에러 복구

## 증상

```
null value in column "nickname" of relation "profiles" violates not-null constraint
POST .../profiles?on_conflict=id  400 (Bad Request)
```

업서트 페이로드에 `nickname` 컬럼이 없는데 독립 백엔드(`wyhhdyrvqtoejvusnhva`)의 `profiles.nickname`은 `NOT NULL` 제약을 갖고 있어 INSERT 경로(트리거가 row를 만들지 못한 경우)에서 실패.

롤백 루프는 직전 수정으로 해결됨 — 이번 건은 별개의 저장 실패.

## 수정 범위 (프론트 1파일 + 선택적 SQL)

### 1. `src/pages/CompleteProfile.tsx` — `nickname` 자동 채움

`submit()`의 upsert 페이로드에 `nickname` 폴백을 추가한다. 우선순위:
1. 기존 `profiles.nickname` 값 (있으면 유지)
2. `user.user_metadata.nickname` / `name` / `full_name`
3. `real_name` (사용자가 방금 입력한 값)
4. 이메일 local-part
5. `user_<auth.uid 앞 8자>`

```ts
// upsert 직전
const { data: existing } = await supabase
  .from("profiles").select("nickname").eq("id", user.id).maybeSingle();

const meta = (user.user_metadata ?? {}) as Record<string, any>;
const emailLocal = (user.email ?? "").split("@")[0] || "";
const nickname =
  existing?.nickname?.trim() ||
  meta.nickname || meta.name || meta.full_name ||
  form.realName?.trim() ||
  emailLocal ||
  `user_${user.id.slice(0, 8)}`;
```

그리고 upsert 객체에 `nickname` 추가. (기존 행이 있으면 같은 값으로 덮어써도 무해, 신규 INSERT 시에는 NOT NULL 제약 해소)

### 2. (선택) phase5-recovery.sql v3 패치 스니펫

원인이 `handle_new_user` 트리거 실행 안 됨(tgenabled=0) → INSERT 경로가 client로 떨어진 것. 근본 복구는 트리거 활성화이지만, 안전망으로 컬럼 기본값을 부여하는 idempotent 스니펫도 같이 제공:

```sql
ALTER TABLE public.profiles
  ALTER COLUMN nickname SET DEFAULT '';

-- 기존 NULL이 있다면 백필(있을 리는 없지만 안전)
UPDATE public.profiles SET nickname = COALESCE(NULLIF(nickname, ''), 'user_' || substr(id::text, 1, 8))
WHERE nickname IS NULL OR nickname = '';
```

(NOT NULL 자체를 풀면 향후 서비스 정합성에 영향 가므로 DEFAULT만 부여.)

## 검증

1. 새 계정 회원가입 → `/complete-profile` → 양식 작성 → "완료하고 시작하기"
2. 토스트 "프로필 저장이 완전히 반영되지 않았습니다" 안 뜨고 `/dashboard` 이동
3. `select id, nickname, real_name, profile_completed, is_adult from profiles where id = '<new>'` 로 모든 컬럼 채워졌는지 확인

## 안전성

- 관리형 백엔드(`ketlqzfaplppmupaiwft`) 무변경
- 프론트 1파일, 영향 범위 `/complete-profile` 저장 경로에 한정
- 머니플로 / RPC / 인증 게이트 코드 무변경
