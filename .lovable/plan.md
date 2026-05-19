# Phase 5 STUB v3 계획 — 같은 `user_id` 오류 반복 차단

## 현재 확인된 사실
- 저장된 파일 `scripts/independence/phase5-stub-v1.sql` 은 이미 **v1.1 self-healing 구조**입니다.
- 그런데 사용자가 올린 SQL Editor 화면에는 **예전 본문**이 남아 있습니다.
  - 화면상 `has_role()` 가 `user_roles` 보정보다 먼저 나옴
  - `user_roles` 블록도 현재 파일과 다름
- 즉, 지금은 **최신 파일 문제가 아니라 SQL Editor 탭에 남아 있는 구버전 쿼리를 반복 실행 중일 가능성**이 가장 큽니다.

## 목표
1. 같은 오류가 다시 나지 않도록 stub SQL을 한 단계 더 방어적으로 강화
2. 초보자도 헷갈리지 않게 “반드시 최신 본문만 실행” 절차를 runbook에 명시
3. 그 뒤 FULL CLONE 파이프라인으로 진행

## 구현 계획

### 1) `scripts/independence/phase5-stub-v1.sql` 를 v1.2로 강화
다음 보강만 적용합니다.

- 파일 상단 버전을 `v1.2` 로 올려 **구버전/신버전 식별 가능**하게 함
- `has_role`, `heck_achievements`, `get_slot_leaderboard`, `get_whale_strikes_24h` 등 함수 앞에
  - `DROP FUNCTION IF EXISTS ...` 를 추가해 오래된 시그니처/바디 간섭 제거
- `my_active_freeze` 는 현재처럼 `DROP VIEW IF EXISTS` 유지
- 정책 생성 전 `DO $$ ... $$` 가 `information_schema.columns` 를 확인해서
  - 해당 테이블에 `user_id` 가 실제 존재할 때만 정책 생성
  - 없으면 명시적 `RAISE NOTICE` 로 어떤 블록이 건너뛰어졌는지 출력
- 맨 위에 **preflight 진단 SELECT** 를 넣어 실행 직후 현재 독립 백엔드 테이블 상태를 먼저 보여주게 함
  - `user_roles`, `wallet_balances`, `account_freezes`, `withdrawal_requests` 등 핵심 테이블의 `user_id` 존재 여부 출력
- 맨 아래 self-validation SELECT 는 유지

### 2) `docs/independence/WINDOWS_RUNBOOK_KO.md` 에 재실행 절차 보강
초보자 실수를 막기 위해 아래를 추가합니다.

- SQL Editor에서는 **기존 탭 재사용 금지**
- 반드시 새 탭을 열고, 저장소의 최신 파일 내용을 **전부 다시 복사**
- 실행 전 아래 3가지를 눈으로 확인:
  1. 첫 줄에 `Phase 5 STUB v1.2`
  2. `has_role()` 가 `user_roles` 블록 **아래**에 있음
  3. 파일 끝에 self-validation SELECT 가 있음
- 실패 시 체크 순서:
  1. 실행한 탭이 최신 본문인지
  2. 독립 백엔드 ref 가 `wyhhdyrvqtoejvusnhva` 인지
  3. managed backend (`ketlqzfaplppmupaiwft`) 가 아닌지

### 3) 적용 후 사용자 실행 순서
1. 저장소의 `scripts/independence/phase5-stub-v1.sql` 최신본 열기
2. SQL Editor 새 탭 열기
3. 최신본 전체 붙여넣기
4. preflight 결과 확인
5. 실행
6. self-validation 에 missing row 가 0개인지 확인
7. 그 다음 RUNBOOK 01 → 02 → 03 → 04 진행

## 기대 결과
- 구버전 탭 재실행으로 인한 반복 오류 차단
- 실제 컬럼 유무가 먼저 출력되어 어디서 깨지는지 즉시 식별 가능
- stub 적용 후 콘솔 404/400 노이즈를 먼저 줄이고 FULL CLONE으로 이동 가능

## 안전 원칙
- 관리형 `ketlqzfaplppmupaiwft` 는 계속 READ-ONLY
- 변경 대상은 문서 1개 + stub SQL 1개만
- FULL CLONE 파이프라인 파일(`01~04`) 자체는 이번 단계에서 건드리지 않음
