# Imperial Empire Phase 5 — FULL CLONE (관리형 → 독립 백엔드)

목표: 관리형 백엔드 `ketlqzfaplppmupaiwft` 의 **모든 스키마 + 데이터**를 독립 백엔드 `wyhhdyrvqtoejvusnhva` 로 **누락 없이** 복제.

방식: 손으로 SQL 한 파일 합성(❌ drift 보장 불가) 대신, 레포에 이미 존재하는 **정식 클론 파이프라인** (`scripts/independence/01~04`) 사용. 이게 `supabase db dump` 로 스키마 전체를 그대로 떠서 push하는 유일한 "100% 보장" 경로.

병행: 클론 완료 전까지 사용자 콘솔에 뜨는 404를 막기 위해 **stub SQL** 을 먼저 독립 백엔드에 한 번 적용.

---

## 단계 0 — 즉시 적용 (콘솔 404 제거)

새 파일 1개 생성: `scripts/independence/phase5-stub-v1.sql`

내용: 콘솔 404 나는 객체들을 **빈 stub**으로 생성. 이건 임시 노이즈 차단용이며, 단계 3 이후 진짜 스키마가 덮어씀.

포함 항목 (전부 `IF NOT EXISTS` / `OR REPLACE`):
- `platform_kill_switches` (key text PK, enabled bool default false, reason text)
- `imperial_kill_switches` (key text PK, enabled bool default false, reason text)
- `account_freezes` (id, user_id, until_at, reason)
- `view my_active_freeze` (현재 사용자 freeze 1줄)
- `achievement_catalog`, `user_achievements`, `user_achievement_progress` (id/user_id/code/value 최소셋)
- `guild_members`, `guild_rankings` (id/user_id/guild_id 최소셋)
- `withdrawal_requests`, `deposit_requests`, `transactions` (id/user_id/amount/status/created_at)
- `slot_spins`, `jackpot_pools` (id/user_id/created_at)
- `profiles`(id, nickname default '', is_adult bool default true, profile_completed bool default false, birth_date date), `wallet_balances`(user_id PK, available_balance numeric default 0)
- `user_roles`(id, user_id, role app_role) + ENUM `app_role` + `has_role(uuid, app_role)` security definer
- `empire_founding_seats` + `get_empire_seats_remaining()` RPC

각 테이블 RLS ENABLE + 최소 policy (`auth.uid() = user_id` for select).

→ 사용자가 Supabase Studio (`wyhhdyrvqtoejvusnhva`) SQL Editor 에 붙여넣고 Run 1회.

## 단계 1 — Windows 초보자용 FULL CLONE 가이드

새 파일: `docs/independence/WINDOWS_RUNBOOK_KO.md`

내용 (스크린샷처럼 자세히, 모든 명령 + 예상 출력 + 에러 해결):

### 1.1 사전 설치 (Windows)
1. **Docker Desktop** — https://www.docker.com/products/docker-desktop/ 다운로드 → 설치 → 재부팅 → 실행 → 우측 하단 고래 아이콘 초록 확인
2. **Git for Windows (Git Bash 포함)** — https://git-scm.com/download/win → 기본 옵션 설치
3. **Supabase CLI** — Git Bash 에서:
   ```bash
   scoop install supabase   # scoop 없으면: irm get.scoop.sh | iex
   # 또는
   npm i -g supabase
   ```
4. 확인:
   ```bash
   supabase --version   # 1.x 이상
   docker info          # 에러 없으면 OK
   ```

### 1.2 프로젝트로 이동 + 환경변수
```bash
cd /c/Users/<당신이름>/path/to/repo   # 본인 경로로
export TARGET_REF=wyhhdyrvqtoejvusnhva
```

### 1.3 스크립트 4단계 실행

| 단계 | 명령 | 예상 시간 | 의미 |
|---|---|---|---|
| 1/4 | `bash scripts/independence/01-prepare.sh` | 1~2분 | 브라우저 로그인 + link |
| 2/4 | `bash scripts/independence/02-pull-and-diff.sh` | 2~5분 | 관리형 스키마 dump + diff 리포트 |
|  -  | `supabase/migrations/_DIFF_REPORT.txt` 확인 후 진행 |  |  |
| 3/4 | `bash scripts/independence/03-deploy.sh` | 5~15분 | 마이그레이션 push + 엣지함수 44개 deploy |
| 4/4 | `bash scripts/independence/04-data-copy.sh` | 5~30분 | public 데이터 backfill (auth.users 제외) |

### 1.4 자주 나는 에러
- `docker: command not found` → Docker Desktop 실행 안 됨, 트레이 아이콘 확인
- `supabase: command not found` → npm/scoop 설치 다시
- `permission denied` on `.sh` → `bash scripts/...` 로 명시 실행
- `db push` 충돌 → 단계 0 stub 이 이미 객체 존재. `supabase db push --include-all` 또는 stub 테이블 DROP 후 재시도 (가이드에 명시)
- `auth.users` 관련 에러 → 정상. 우리는 public 만 복제

### 1.5 검증 체크리스트
- [ ] `supabase/migrations/_DIFF_REPORT.txt` 빈 줄 또는 예상된 차이만
- [ ] Studio (wyhhdyrvqtoejvusnhva) `public` 스키마 테이블 수 ≥ 관리형과 동일
- [ ] 신규 가입 → /complete-profile → /wallet → 콘솔 404 ZERO
- [ ] `/admin/ops/self-heal` 진입 → 진단 항목 모두 녹색

## 단계 2 — Vercel Production Redeploy
가이드 마지막에:
1. Vercel 대시보드 → 프로젝트 → Deployments → 최신 production 옆 ⋯ → **Redeploy**
2. ☑ **Use existing Build Cache** **체크 해제** (cache OFF)
3. Confirm → 2~3분 대기 → 새 도메인 접속 → 콘솔 클린 확인

---

## 안전 원칙
- 관리형 백엔드(`ketlqzfaplppmupaiwft`) **READ-ONLY**. 어떤 단계도 관리형에 쓰지 않음 (`supabase db dump` 는 dump만).
- 모든 객체 idempotent (CREATE OR REPLACE / IF NOT EXISTS / DROP POLICY IF EXISTS + CREATE).
- 단계 0 stub 은 진짜 스키마와 충돌하지 않도록 최소 컬럼만 보유 — `supabase db push` 가 ALTER 로 흡수.

## 산출물
1. `scripts/independence/phase5-stub-v1.sql` (단계 0)
2. `docs/independence/WINDOWS_RUNBOOK_KO.md` (단계 1~2)
3. 채팅에 단계 0 적용 명령 + 단계 1 시작 명령 안내

## 비범위 (안 함)
- 관리형 → 한 파일짜리 핸드라이트 클론 SQL (위에서 설명한 이유로 거부)
- auth.users 마이그레이션 (Supabase 정책상 불가, 사용자 재가입 필요)
- 관리형 백엔드 어떤 수정도 없음
