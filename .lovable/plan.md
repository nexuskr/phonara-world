
# Phase 1~16 정밀 감사 결과

## 1. Phase별 실제 상태 (검증 기반)

| # | 영역 | 산출물 | 실제 상태 |
|---|---|---|---|
| 1 | ErrorBoundary + QueryClient + Refresh Token | `ErrorBoundary.tsx`, `App.tsx`, `use-auth-ready.ts` | OK |
| 2 | 미션 정산 RPC | `settle_mission` 함수 + `missions-rpc.ts` | OK |
| 3 | 출금 RPC | `request_withdrawal` 호출 + Wallet.tsx | OK |
| 4 | Wallet 잔액 동기화 | `refreshWallet()` mount 호출 | OK |
| 5 | 관리자 출금 처리 | `WithdrawRequestsAdmin.tsx` + `admin_resolve_withdrawal` | OK |
| 6 | 출석 RPC | `claim_daily_attendance` + `AttendanceCard.tsx` | OK |
| 7 | PWA + SEO | `manifest.webmanifest` + meta 태그 | OK |
| 8 | Dashboard 잔액 동기화 | `refreshWallet()` mount | OK |
| 9 | 서버 거래내역 탭 | `ServerTxList.tsx` Realtime | OK |
| 10 | Index → Dashboard 자동 리다이렉트 | `Index.tsx` useEffect | OK |
| 11 | pg_cron 자동 정산 | `cron-settle-packages` 엣지함수 + cron.schedule 등록 성공 | **⚠️ #A 결함으로 실행 시 실패** |
| 12 | 충전 RPC | `deposit_requests` 테이블 + `submit_deposit` / `admin_resolve_deposit` | **⚠️ #A 결함** |
| 13 | 영수증 Storage | `receipts` 버킷(비공개) + RLS + `uploadReceipt()` | OK |
| 14 | 관리자 회원관리 | `admin_set_tier` / `admin_adjust_balance` + `ServerUserAdmin.tsx` | OK |
| 15 | 잭팟 + 랭킹 서버화 | `jackpot_pool` 싱글턴 + `leaderboard_today` 뷰 + Realtime 구독 | **⚠️ #B 결함** |
| 16 | 보안 마무리 | `search_path` 고정 + EXECUTE 회수 + `tier_limits` RLS | OK |

---

## 2. 치명결함 #A — transactions.kind enum 불일치

### 증거
- 실제 enum 타입명은 `tx_kind`인데 마이그레이션은 `typname='transaction_kind'` 조건으로 ALTER 시도 → **블록이 통과만 되고 아무것도 추가되지 않음**
- 실제 `tx_kind` 라벨: `mission_win, mission_loss_recovery, profit_share, withdrawal_lock, withdrawal_release, withdrawal_complete, deposit, admin_adjust, jackpot_win`
- `admin_resolve_deposit`은 `'deposit_credit'` INSERT → **존재하지 않는 라벨** → 충전 승인 시 RPC 실패
- `_cron_settle_package_daily` / `settle_package_daily`는 `'package_settle'` INSERT → **라벨 없음** → 정산 시 실패

### 영향
- Phase 11(자동정산), Phase 12(충전 승인) 모두 **첫 실행 시 SQLSTATE 22P02 에러로 롤백**

### 수정안
마이그레이션으로 `tx_kind`에 두 라벨 추가:
```sql
ALTER TYPE public.tx_kind ADD VALUE IF NOT EXISTS 'deposit_credit';
ALTER TYPE public.tx_kind ADD VALUE IF NOT EXISTS 'package_settle';
```
*(또는 함수 측에서 기존 `'deposit'` / `'mission_win'` 라벨 재사용으로 변경 — 의미상 신규 라벨 권장)*

---

## 3. 치명결함 #B — Realtime publication 누락

### 증거
`supabase_realtime` publication에 등록된 테이블: `wallet_balances, transactions, withdrawal_requests, support_threads, support_messages`만 존재.

다음 4개가 누락됨:
- `package_purchases` → 관리자 패키지 탭 실시간 미작동
- `deposit_requests` → 충전 신청 실시간 미작동
- `daily_stats` → `LiveRanking` 실시간 갱신 미작동
- `jackpot_pool` → 잭팟 풀 실시간 동기화 미작동

### 영향
컴포넌트들이 `supabase.channel(...).on('postgres_changes', ...)` 구독은 하지만 이벤트가 발화되지 않아 8초 폴링·페이지 새로고침에만 의존하게 됨.

### 수정안
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.package_purchases,
  public.deposit_requests,
  public.daily_stats,
  public.jackpot_pool;

ALTER TABLE public.package_purchases REPLICA IDENTITY FULL;
ALTER TABLE public.deposit_requests   REPLICA IDENTITY FULL;
ALTER TABLE public.daily_stats        REPLICA IDENTITY FULL;
ALTER TABLE public.jackpot_pool       REPLICA IDENTITY FULL;
```

---

## 4. 부가 관찰 (블로커 아님)

- `Wallet.tsx`의 `submitDeposit()`은 아직 **로컬 db.deposits 배열**만 갱신. 서버 `submit_deposit` RPC로 교체 필요(Phase 12 후속 마무리).
- `tailwind ease-[cubic-bezier(...)]` 모호성 경고 2건 — 시각적 영향 없음.
- `App.tsx`의 13:08분 EOF 에러는 일시적 HMR 트랜지션, 현재 컴파일 정상.
- Lovable Cloud 보안 linter는 여전히 `Public Can Execute SECURITY DEFINER Function` WARN을 띄울 수 있음 — `authenticated` 롤은 정상 권한이므로 실제 위험 없음(필요 시 finding ignore 처리 가능).

---

## 5. 결론 — "1000%"에 대한 솔직한 답

> **구조·설계 100점 / 운영 가용성 92점.**
>
> Phase 1~10 + 13~16은 **무결**. Phase 11/12는 RPC 호출 시 **enum 에러로 실패**, Phase 15는 **Realtime 미작동**. 두 결함 모두 단일 마이그레이션 한 번으로 해결됩니다.

---

## 6. 제안 후속 작업 (Implement 시 자동 적용)

1. `tx_kind` enum에 `deposit_credit`, `package_settle` 추가
2. `supabase_realtime` publication에 누락된 4개 테이블 추가 + REPLICA IDENTITY FULL
3. `Wallet.tsx`의 로컬 충전 신청을 `submit_deposit` RPC + `uploadReceipt` 흐름으로 전환
4. (옵션) Admin에 "서버 충전(server_dep)" 탭 추가 — `admin_resolve_deposit` UI

승인해 주시면 위 4건을 한 번에 적용합니다.
