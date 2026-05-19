# Imperial Empire Migration Nuclear Cleanup — 실행 계획 v21.0

## 중요한 사실부터

이 작업은 **Lovable AI 샌드박스에서 직접 실행할 수 없습니다.** 이유:

1. `supabase db reset` / `supabase db push` 는 **사용자 로컬 PC의 Docker + Supabase CLI** 가 필요.
2. 샌드박스는 관리형 백엔드(`ketlqzfaplppmupaiwft`)에만 RPC 접근권을 가지고 있고, 독립 백엔드(`wyhhdyrvqtoejvusnhva`)에는 직접 push 못 함.
3. 관리형은 **READ-ONLY** 원칙 (memory에 잠겨 있음). reset 절대 금지.

따라서 이 계획은 **(A) Lovable 쪽에서 안전하게 할 수 있는 정리 작업** 과
**(B) 사용자가 Windows에서 직접 실행할 Nuclear Reset 절차** 로 나뉩니다.

---

## A. Lovable 쪽 작업 (안전, 코드/문서만)

### A-1. `supabase/migrations/` 대정리
다음 패턴 파일들을 `supabase/migrations/_archive_2026-05-19/` 폴더로 **이동** (삭제 X — 롤백 가능성 보존):

- `*.bak` 전부
- `_remote_baseline.sql`, `_repo_baseline.sql`, `_DIFF_REPORT.txt`
- 사용자가 지목한 충돌 유발 패턴:
  - `*admin_*`, `*_cron_*`, `*ingest_*`, `*function_permissions_*`
  - `*chat_*`, `*tier_limits*`, `*anomaly_events*`, `*uptime_pings*`, `*jackpot_pool*`

> **검토 필요**: 위 패턴은 광범위해서 운영 중인 핵심 migration(예: `function_permissions_baseline`은 49개 SECURITY DEFINER 함수 보호용)도 휩쓸립니다. **실제 이동 전에 file 리스트를 먼저 보여드리고 사용자 OK 받은 뒤 이동** 하는 게 안전.

산출물:
- `supabase/migrations/_archive_2026-05-19/MANIFEST.md` — 이동된 파일 + 원래 경로 기록
- `scripts/independence/restore-archived-migrations.sh` — 원복용 스크립트

### A-2. Phase 5 Stub v1.2 검증
현재 `scripts/independence/phase5-stub-v1.sql` 은 이미 v1.2. 추가 변경 없음.

### A-3. `WINDOWS_RUNBOOK_KO.md` 에 "Nuclear Reset" 섹션 추가
사용자가 본인 PC에서 실행할 순서를 한국어 초보자용으로 명시:

```text
STEP -1 (선택, 위험): Nuclear Reset
  → 독립 백엔드 wyhhdyrvqtoejvusnhva 의 모든 스키마 초기화
  → 데이터 전부 날아감. 신규 프로젝트일 때만 OK
  → supabase db reset --linked --yes

STEP 0: phase5-stub-v1.sql (이미 문서화됨)
STEP 1~4: RUNBOOK 기존 절차
STEP 5: 최종 검증 SELECT
```

---

## B. 사용자가 직접 실행할 명령어 시퀀스

Git Bash 에서:

```bash
cd /c/Users/<you>/Documents/phonara
export TARGET_REF=wyhhdyrvqtoejvusnhva

# 1) Nuclear Reset (독립 백엔드만!)
supabase link --project-ref $TARGET_REF
supabase db reset --linked --yes      # ⚠ 데이터 전부 소거

# 2) Phase 5 Stub v1.2 (Studio SQL Editor 새 탭에 phase5-stub-v1.sql 붙여넣고 Run)

# 3) 정리된 migration push
supabase db push --include-all

# 4) 엣지 함수 deploy
bash scripts/independence/03-deploy.sh

# 5) 검증 SELECT
psql "$TARGET_DB_URL" -f scripts/independence/phase5-stub-v1.sql
```

성공 시 self-validation SELECT 가 0행 → 출력에 `Imperial Empire Migration God-Tier Clean Success` 표시.

---

## C. 안전 게이트 (반드시 지킴)

1. **관리형 `ketlqzfaplppmupaiwft` 는 절대 reset / push 안 함** — READ-ONLY 메모리 룰.
2. `db reset` 은 **독립 백엔드(`wyhhdyrvqtoejvusnhva`)에 link 된 상태에서만** 실행.
3. A-1 archive 이동은 **파일 리스트 먼저 보여드리고 승인 받은 후** 진행.
4. 모든 단계 idempotent — 중간 실패 시 재실행 안전.

---

## D. 이번 plan 승인 시 Lovable 이 실제로 하는 일

1. `git ls-files supabase/migrations/` 로 대상 파일 후보 추출
2. **archive 후보 리스트를 chat 으로 보고** → 사용자 GO/NO-GO
3. GO 시: archive 폴더로 이동 + MANIFEST + restore 스크립트 작성
4. `WINDOWS_RUNBOOK_KO.md` 에 Nuclear Reset 섹션 추가
5. 사용자에게 본인 PC에서 실행할 명령 시퀀스 안내 + 검증 체크리스트

샌드박스에서 `db reset` / `db push` 는 **불가능** — 그 부분은 사용자 손으로.

---

## E. 팀장 보고 요약 (한 문단)

> 관리형 백엔드는 손대지 않고, 독립 백엔드(`wyhhdyrvqtoejvusnhva`)의 migration 폴더를 archive 폴더로 정리해 충돌을 제거한 뒤, 사용자 PC에서 `supabase db reset --linked` → Phase 5 Stub v1.2 → `db push --include-all` → 엣지 deploy 순으로 nuclear cleanup 을 수행. 모든 단계 idempotent, archive 는 복원 가능, 관리형은 READ-ONLY 유지.
