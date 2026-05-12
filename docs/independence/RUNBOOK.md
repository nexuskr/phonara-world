# Phase 2 Supabase 독립 — Runbook (target ref `wyhhdyrvqtoejvusnhva`)

> Docker가 켜진 상태에서 위에서부터 순서대로 실행. 각 단계는 멱등(idempotent) — 실패 시 그대로 재실행해도 안전.

## 사전 준비
- [ ] Docker Desktop 실행 중 (`docker info` 성공)
- [ ] `brew install supabase/tap/supabase` 또는 `npm i -g supabase`
- [ ] 신규 Supabase 프로젝트 `wyhhdyrvqtoejvusnhva` 생성 완료, DB password 확보
- [ ] **현 Lovable Cloud DB 데이터를 옮길 계획이면** Lovable 측에 export(또는 connection URI) 요청

## 단계
```bash
# 1) 링크
bash scripts/independence/01-prepare.sh

# 2) 원격(현 신규프로젝트) 스키마와 repo migration 비교 — 읽기 전용
bash scripts/independence/02-pull-and-diff.sh
# → supabase/migrations/_DIFF_REPORT.txt 검토

# 3) 시크릿 세팅 (체크리스트 참고)
cat scripts/independence/secrets-checklist.txt
supabase secrets set LOVABLE_API_KEY=... BOT_CRON_SECRET=... VAPID_PRIVATE_KEY=... ...

# 4) 마이그레이션 + 엣지 함수 일괄 배포
bash scripts/independence/03-deploy.sh

# 5) (선택) 라이브 데이터 복사
cp scripts/independence/.env.target.example scripts/independence/.env.target
$EDITOR scripts/independence/.env.target
set -a && source scripts/independence/.env.target && set +a
bash scripts/independence/04-data-copy.sh
```

## 주의사항 (반드시 읽기)

1. **auth.users 이전은 분리 처리**  
   `scripts/independence/04-data-copy.sh`는 `public.*`만 복사한다. `auth.users`는 Supabase의 admin auth API(`/auth/v1/admin/users`)로 별도 마이그레이션해야 비밀번호 해시가 보존된다. 신규 가입자만 받을 거면 생략 가능.

2. **SECURITY DEFINER 함수 49개**  
   `function_permissions_baseline` 테이블 + `check_permission_drift()` RPC가 마이그레이션에 포함되어 있어 새 프로젝트에서도 자동 베이스라인 검증된다. CI(`.github/workflows/db-permissions.yml`)도 그대로 동작.

3. **`empire_founding_seats`, `permission_change_log`, `anomaly_events`** — admin-only RLS이므로 신규 프로젝트에서 admin role 부여를 제일 먼저 해야 한다:
   ```sql
   INSERT INTO public.user_roles(user_id, role) VALUES ('<신규-admin-uid>', 'admin');
   ```

4. **클라이언트 환경변수 변경**  
   Lovable Cloud에서 자동 주입되던 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID`를 신규 프로젝트 값으로 교체해야 한다. Lovable 환경에서는 자동 갱신되지만, GitHub Actions / 자체 호스팅 빌드라면 secrets에 수동 등록 필요.

5. **Storage buckets**  
   현 프로젝트에 사용자 업로드(영수증, 인증 이미지, OG 카드 캐시 등)가 있다면 `supabase storage cp` 또는 별도 rclone 작업이 필요하다. 코드 측 버킷 이름은 동일하므로 정책 마이그레이션은 자동으로 따라간다.

6. **Cron 재등록**  
   Supabase Dashboard → Edge Functions → Schedules에서 다음을 수동 재등록:
   - `crown-war-settle`            매시 0분
   - `cron-settle-packages`        매일 00:05 KST
   - `feed-personalize`            5분
   - `viral-score-compute`         5분
   - `posting-scheduler`           1분
   - `feed-retrain`                15분
   - `revenue-attribution`         15분
   - `liquidation-watcher`         1분
   - `enforce-position-triggers`   1분
   - `bot-seed-engine`             5분 (운영 정책에 따라)
   - `chaos-probe`                 시간당 1회 (선택)

7. **데이터 복사 순서**  
   `04-data-copy.sh`는 알파벳 순으로 복사하므로 FK 충돌이 발생할 수 있다. 충돌 테이블만 마지막에 별도 재실행하거나, 일시적으로 `SET session_replication_role = replica;`로 트리거/FK 비활성 후 복사하는 방법도 있다.

8. **롤백 플랜**  
   GitHub repo는 그대로, Lovable Cloud DB도 즉시 삭제 금지. 신규 프로젝트가 7일간 안정 운영 확인되면 `.env`/Vercel/Cloudflare DNS를 신규 프로젝트로 cut-over.
