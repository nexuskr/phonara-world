# Phase 1~16 + 핫픽스 종합 감사 보고서

검증 시각: 2026-05-07. DB / Storage / 코드베이스 직접 조회 결과 기반.

## ✅ 서버 인프라 검증 (모두 정상)

| 항목 | 상태 | 검증 결과 |
|---|---|---|
| `tx_kind` enum | ✅ | `deposit_credit`, `package_settle` 정상 추가 (총 11개 라벨) |
| Realtime publication | ✅ | `package_purchases`, `deposit_requests`, `daily_stats`, `jackpot_pool` 9개 테이블 등록 완료 |
| Storage bucket `receipts` | ✅ | private 생성됨 |
| RPC 함수 21개 | ✅ | `submit_deposit`, `admin_resolve_deposit`, `submit_package_purchase`, `admin_resolve_package`, `_cron_settle_package_daily`, `bump_jackpot`, `admin_set_tier`, `admin_adjust_balance` 등 모두 존재 |
| `leaderboard_today` view | ✅ | 정상 |
| RLS 정책 | ✅ | 모든 신규 테이블(`deposit_requests`, `package_purchases`, `jackpot_pool`)에 self/admin 정책 적용 |
| `cron.job` 조회 | ⚠️ | 권한상 직접 조회 불가 (Phase 11 cron 등록 자체는 마이그레이션 성공 시 적용됨) |

→ **백엔드 레이어는 1000점.** 적발했던 enum / Realtime 결함은 모두 해소됨.

## ⚠️ 프런트엔드 잔존 결함 (Phase 1~16 완료를 막는 진짜 문제)

`rg "db\."` 결과 — 서버 권한 이전이 끝나지 않은 화면이 다수 존재합니다:

### 1. `src/pages/Admin.tsx` — 치명적
- L35~38: `db.users.length`, `db.deposits.filter(...)` 로 **로컬 mock 카운트** 표시
- L120~147: 충전/출금 탭이 여전히 `db.deposits`, `db.withdraws` 렌더 (서버 탭은 별도로 추가했지만 구버전 탭이 잔존)
- 결과: 관리자 대시보드 통계가 실제 DB와 0% 일치

### 2. `src/pages/Wallet.tsx`
- L295: 거래내역을 `[...db.deposits, ...db.withdraws]` 로컬 배열로 렌더
- L250~257: 입금 코인 주소(`db.coin`)가 정적 mock
- `submitDeposit` 자체는 RPC로 이전됐지만, 화면에 보이는 결과는 여전히 mock store

### 3. `src/lib/missions-rpc.ts` (L21~55)
- RPC 응답을 `db.user`에 미러링 — Zustand 로컬 store가 single source of truth 인 상태 유지
- → 새 세션 / 다른 기기에서 로그인하면 잔액이 0으로 보일 위험

### 4. `src/pages/Missions.tsx`
- `db.completedMissions`, `db.customMissions`, `db.momentum`, `db.recoveryMission`, `db.jackpot` — 전부 로컬
- 잭팟 베팅이 `bump_jackpot` RPC를 호출하지 않고 로컬 `db.jackpot.amount`만 변경 (Phase 15와 모순)

### 5. `src/pages/Packages.tsx` L151
- `if (!db.user || busy) return;` — RPC 분기 전 로컬 user 체크. 로그인됐는데 store 미초기화 시 구매 차단됨

### 6. 콘솔 경고
- `Unknown message type: RESET_BLANK_CHECK` — Lovable 런타임 메시지, 무시 가능

## 📊 점수

| 영역 | 점수 | 비고 |
|---|---|---|
| DB 스키마 / RLS / RPC | **1000 / 1000** | 완벽 |
| Storage / Realtime / Cron | **990 / 1000** | cron 직접검증만 미실행 |
| 서버 비즈니스 로직 | **1000 / 1000** | 모든 머니 무브가 SECURITY DEFINER RPC 경유 |
| **프런트엔드 통합** | **620 / 1000** | Admin / Wallet / Missions 화면이 mock store 의존 |
| **종합** | **약 870 / 1000** | "1000% 완료"는 아님 |

## 🔧 Phase 17 권장 작업 (1000점 도달용)

다음 작업을 수행하면 진정한 서버 권한 아키텍처가 완성됩니다:

1. **Admin.tsx 정리**: 구 `deposits`/`withdrawals` 탭 제거하고 신규 서버 탭만 노출. 통계 카드를 `daily_stats`/`wallet_balances` 집계 RPC로 교체
2. **Wallet.tsx 거래내역 교체**: `db.deposits/withdraws` 렌더 블록을 `transactions` 테이블 기반 `ServerTxList`로 통일
3. **Missions.tsx 서버화**:
   - `completedMissions` → `mission_history` 조회
   - `momentum` / `recoveryMission` → `daily_stats.current_streak`
   - 잭팟 베팅을 `bump_jackpot` RPC 호출로 교체
4. **missions-rpc.ts 정리**: `db.user` 미러링 제거, 단방향 (DB → React Query) 으로 통일
5. **Packages.tsx 가드 수정**: `db.user` → `useRequireAuth()` 사용자로 변경
6. **(옵션) `db` Zustand store 단계적 제거**: UI 캐시 용도 외 비즈니스 데이터 의존 0건 목표

## 결론

서버는 끝판왕급으로 완성됐지만, **프런트엔드 4개 페이지(`Admin`, `Wallet`, `Missions`, `Packages`)가 여전히 로컬 mock store에 묶여있어** 실제 멀티 디바이스/실 사용자 환경에서는 데이터 불일치가 발생합니다. Phase 17 수행 시 비로소 "1000% 완료" 선언 가능.

진행 승인하시면 Phase 17을 즉시 구현하겠습니다.
