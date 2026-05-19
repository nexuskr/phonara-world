# Phonara 독립 백엔드 FULL CLONE — Windows 초보자용 가이드

> 목표: 관리형 백엔드(`ketlqzfaplppmupaiwft`)의 **모든 스키마 + public 데이터**를 독립 백엔드(`wyhhdyrvqtoejvusnhva`)로 누락 없이 복제.
> 관리형은 **READ-ONLY** (`db dump`만, 어떤 쓰기도 없음).

소요 시간: 처음이면 약 **60~90분** (Docker 설치 포함).

---

## 0. 시작 전 체크

- 작업 PC: Windows 10/11 (관리자 권한 가능)
- 관리형 Supabase 대시보드 로그인 가능한 구글/깃허브 계정
- 이 레포가 **로컬에 클론**되어 있어야 함. 없다면 GitHub Desktop 또는 `git clone`로 먼저 받기.

> 두 백엔드 식별자:
> - **관리형(원본, 절대 수정 X)**: `ketlqzfaplppmupaiwft`
> - **독립(이쪽으로 복제)**: `wyhhdyrvqtoejvusnhva` ← `TARGET_REF`

---

## 1. 사전 도구 설치 (10~30분)

### 1-1. Docker Desktop
1. https://www.docker.com/products/docker-desktop/ 접속
2. **Download for Windows** 클릭 → `Docker Desktop Installer.exe` 실행
3. 기본 옵션으로 설치 → 재부팅
4. 시작 메뉴에서 **Docker Desktop** 실행
5. 우측 하단 트레이의 🐳 아이콘이 **초록색**이면 OK
6. 검증: PowerShell 또는 cmd 열고
   ```
   docker info
   ```
   에러 메시지 없이 한 화면 채우면 정상.

> 에러: `Cannot connect to the Docker daemon` → Docker Desktop 실행 안 됨. 트레이 아이콘 확인 후 다시.

### 1-2. Git for Windows (Git Bash 포함)
1. https://git-scm.com/download/win
2. 기본 옵션 그대로 설치
3. 시작 메뉴에서 **Git Bash** 검색해 실행 가능한지 확인

### 1-3. Supabase CLI
Git Bash 열고:
```bash
npm i -g supabase
```
> Node.js가 없다면 먼저 https://nodejs.org/ (LTS) 설치.

검증:
```bash
supabase --version
```
→ `1.x.x` 또는 `2.x.x` 같은 버전 출력되면 OK.

---

## 2. STEP 0 — 콘솔 404 즉시 차단 (5분)

FULL CLONE 전에 사용자에게 보이는 콘솔 노이즈부터 차단.

1. 브라우저로 https://supabase.com/dashboard/project/wyhhdyrvqtoejvusnhva/sql/new 접속 (로그인 필요)
   - 좌상단 프로젝트 셀렉터가 **wyhhdyrvqtoejvusnhva** 인지 반드시 확인.
   - 관리형(`ketlqzfaplppmupaiwft`)이 선택돼 있으면 **즉시 닫기.**
2. **새 SQL 탭 열기** — 기존 탭에 옛날 본문이 남아 있을 수 있어 반드시 `+` 로 새 탭.
3. 레포의 `scripts/independence/phase5-stub-v1.sql` 파일 열기
4. **전체 복사** (Ctrl+A → Ctrl+C) — 부분 복사 금지.
5. SQL Editor에 붙여넣기 (Ctrl+V)
6. 붙여넣은 내용 1번째 줄에 `Phase 5 STUB v1.2` 가 있는지 눈으로 확인. 없으면 구버전이므로 다시 복사.
7. 우측 하단 **Run** (또는 Ctrl+Enter)
8. 결과 확인:
   - 상단 preflight SELECT: 각 테이블의 `table_exists` / `has_user_id` 현재 상태 표시 (참고용)
   - 본문 실행: `Success. No rows returned`
   - 하단 self-validation SELECT: **0행이어야 정상**. 행이 나오면 `MISSING user_id COLUMN` 으로 어느 테이블이 빠졌는지 보여줌.

> 이 stub은 진짜 스키마와 충돌하지 않게 최소 컬럼만 가진다. 단계 3-3의 `db push`가 ALTER로 흡수.

### STEP 0 트러블슈팅
| 증상 | 원인 | 해결 |
|---|---|---|
| `column "user_id" does not exist` | 구버전 탭 본문 재실행 | 탭 전부 닫고 **새 탭** 열어 최신 v1.2 본문 다시 붙여넣기 |
| `permission denied for schema auth` | 잘못된 프로젝트 선택 | 좌상단이 `wyhhdyrvqtoejvusnhva` 인지 확인 |
| `MISSING user_id COLUMN` 행 출력 | 일부 테이블에 컬럼 보정이 안 됨 | 출력된 테이블명 캡처해 공유. v1.3에 추가 필요 |
| `function ... does not exist` | 이전 시그니처와 충돌 | v1.2는 DROP FUNCTION 포함됨. 그래도 나면 캡처 공유 |

---

## 3. STEP 1~4 — FULL CLONE 실행

Git Bash 열고 레포 경로로 이동. 본인 경로로 바꿔서 (예시):
```bash
cd /c/Users/YOUR_NAME/Documents/phonara
export TARGET_REF=wyhhdyrvqtoejvusnhva
```

### 3-1. `01-prepare.sh` — 로그인 + link (1~2분)
```bash
bash scripts/independence/01-prepare.sh
```
- 브라우저 창이 뜨면 Supabase 로그인
- 끝나면 `✓ Step 1/4 done.` 표시

> 에러 `supabase: command not found` → `npm i -g supabase` 다시.
> 에러 `docker: ...` → Docker Desktop 실행 안 됨.

### 3-2. `02-pull-and-diff.sh` — 관리형 dump + diff (2~5분)
```bash
bash scripts/independence/02-pull-and-diff.sh
```
산출물 3개가 `supabase/migrations/` 에 생김:
- `_remote_baseline.sql` — 관리형에서 떠온 진짜 스키마
- `_repo_baseline.sql` — 레포 마이그레이션 합본
- `_DIFF_REPORT.txt` — 두 개 차이

> 이 단계는 **관리형을 읽기만** 함 (db dump). 절대 수정 안 함.

`_DIFF_REPORT.txt` 를 한 번 훑어보고 이상한 게 없으면 다음.

### 3-3. `03-deploy.sh` — 마이그레이션 push + 엣지 44개 deploy (5~15분)
```bash
bash scripts/independence/03-deploy.sh
```
중간에 `Are you sure?` 같은 프롬프트 나오면 **y** 엔터.

> **충돌 에러**가 나오면 (`relation already exists` 등):
> Step 0 stub이 만든 객체와 겹쳐서 그럼. 해결:
> ```bash
> supabase db push --include-all
> ```
> 또는 stub 객체만 살짝 DROP 후 재시도. (스키마는 db dump 본이 진실)

엣지 함수 44개가 줄줄이 deploy 됨. 마지막에 `✓ Step 3/4 done.` 나오면 OK.

### 3-4. `04-data-copy.sh` — public 데이터 backfill (5~30분, 선택)
```bash
bash scripts/independence/04-data-copy.sh
```
- `auth.users` 는 **이전 불가** (Supabase 정책). 사용자는 재가입 필요.
- public 스키마 데이터만 복사.
- 데이터 양에 따라 시간 변동.

> 신규 서비스라면 4-4 스킵해도 OK. 사용자 데이터를 보존하려면 실행.

---

## 4. STEP 5 — Vercel Production Redeploy (cache OFF)

1. https://vercel.com/dashboard → 프로젝트 선택
2. 좌측 **Deployments** 탭
3. 최신 production 행의 **⋯** → **Redeploy**
4. 다이얼로그에서:
   - ☐ **Use existing Build Cache** ← **체크 해제** (cache OFF가 핵심)
5. **Redeploy** 클릭 → 2~3분 대기
6. 새 배포 URL 또는 도메인 접속

---

## 5. 검증 체크리스트

브라우저 콘솔(F12 → Console) 열어두고:

- [ ] 신규 이메일로 회원가입 성공
- [ ] `/complete-profile` 저장 성공
- [ ] `/dashboard` 진입 — 무한 루프 없음
- [ ] `/wallet` 진입 — 본인인증 모달 재등장 없음
- [ ] 콘솔에 `404` `400` 도배 **없음** (기존 노이즈 객체들)
- [ ] `/admin/ops/self-heal` (admin 계정 한정) 진단 항목 녹색

---

## 6. 자주 나는 에러 & 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `docker: command not found` | Docker Desktop 미실행 | 트레이 🐳 초록 확인 후 재시도 |
| `supabase: command not found` | CLI 미설치 | `npm i -g supabase` |
| `permission denied` on `.sh` | 실행권한 | `bash scripts/...` 로 명시 |
| `db push` 충돌 (already exists) | Stub과 겹침 | `supabase db push --include-all` |
| `auth.users` 관련 에러 | 정상 — 우리 안 건드림 | 무시 |
| Vercel 배포 후 여전히 404 | 캐시 | Vercel Redeploy 시 **cache 체크 해제** 필수 |
| 콘솔에 여전히 한두 개 404 | stub에 빠진 객체 | 객체명 알려주면 stub v2에 추가 |

---

## 7. 안전 원칙

1. 관리형(`ketlqzfaplppmupaiwft`)은 **절대 수정 X** — db dump만.
2. 모든 단계 idempotent — 중간에 끊겨도 다시 처음부터 안전.
3. STEP 0 stub은 임시 노이즈 차단용. 진짜 운영 정책은 STEP 3의 `db push`로 덮어씀.
4. 막히면 즉시 멈추고 어느 단계에서 어떤 에러 났는지 그대로 캡처해 공유.

---

끝. 막힌 단계가 있으면 어디서 멈췄는지 알려줘.
