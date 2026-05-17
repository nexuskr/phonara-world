# PHON Economy Pass 2 — 실제 구현

Pass 1의 표시·교육 레이어 위에 실제 동작하는 스왑·스테이킹·PHON 베팅·레버리지 보너스를 얹습니다. 머니플로 8경로 파일은 **단 한 줄도 수정하지 않고**, 모든 신규 동작은 별도의 PHON 전용 경로로 추가합니다.

---

## 1. PHON ↔ KRW 스왑 (실동작)

신규 테이블·RPC만으로 완결. 기존 wallet 훅 수정 없음.

- `swap_audit (id, user_id, direction, in_amount, out_amount, rate, idem_key UNIQUE, created_at, anomaly)`
- `swap_limits_daily (user_id, day, total_in_phon)` — 일일 한도 추적
- RPC `swap_phon_krw(direction text, amount numeric, idem_key text)` — SECURITY DEFINER
  - AAL2 강제 (`auth.jwt()->>'aal' = 'aal2'`), 없으면 `step_up_required`
  - `direction ∈ {'krw_to_phon','phon_to_krw'}`
  - 환율 = `displayCurrency.ts` 미러 (1 USDT = 1,300 PHON, USDT≈₩1,400)
  - per-user advisory lock + `FOR UPDATE` on balances
  - 일일 한도: 사용자당 5,000,000 KRW 상당 (configurable)
  - 멱등: `idem_key` UNIQUE — 중복은 기존 결과 반환
  - 이상감지 시 `anomaly_events(rule='swap_limit_exceeded'|'rate_drift')`
- 신규 UI: `src/components/phon/PhonSwapDialog.tsx` (실동작) — Pass 1 의 `PhonSwapBridge` 안 CTA 가 이 다이얼로그를 열도록 교체
- 훅: `useSwapPhonKrw()` — idem_key 자동 생성, 진행/완료 토스트 (`@/lib/notify`)

## 2. PHON 스테이킹 + 일배당

- 테이블
  - `phon_stakes (id, user_id, amount, started_at, unstaked_at NULL, last_yield_at, status)`
  - `phon_stake_yields (id, stake_id, user_id, yield_phon, settled_for_date, idem_key UNIQUE)`
  - `staking_policies (id, apy_bps int, min_stake_phon, lock_days, active bool)` — 운영가능
- RPC (SECURITY DEFINER, self-only)
  - `stake_phon(amount numeric)` — phon 잔액 차감 + 스테이크 생성
  - `unstake_phon(stake_id uuid)` — lock_days 경과 검증 + 잔액 환원
  - `get_my_stakes()` / `get_my_stake_summary()` — 대시보드용
  - internal `settle_phon_staking_daily()` — 모든 활성 스테이크 순회, `floor(amount × apy_bps / 10000 / 365)` 지급, `idem_key = date || stake_id`
- cron: 매일 KST 00:10 → `settle-phon-staking` edge (`pg_cron` + `pg_net`)
- 정책 기본값: APY 0.8%/일 ≈ APR 292% 는 비현실적이므로 **연 12~20% 범위 (apy_bps 1200~2000)** 로 셋팅. 사용자 메시지는 "매일 자동 배당"으로 표시(Warm King)
- UI: `src/components/phon/PhonStakingPanel.tsx` — PhonHub 의 `PhonStakingComingSoon` 자리 대체. 스테이크/언스테이크/배당 히스토리/예상 일배당 미리보기

## 3. PHON 베팅 + 20% 하우스에지 할인 (Sidecar 방식)

머니플로 8경로 보호를 위해 **기존 `MegaOrderPanel` / `use-auto-bet` 는 건드리지 않고** PHON 전용 사이드카 패널을 추가.

- 신규 RPC `open_position_phon(symbol, side, leverage, amount_phon, idem_key)` — SECURITY DEFINER
  - phon_balances 차감 → `live_positions` INSERT with `bet_currency='phon'`
  - 기존 `trg_enforce_leverage_gate` 트리거 BEFORE INSERT 가 그대로 동작 (수정 없음)
  - audit `phon_bet_audit`
- 신규 RPC `close_position_phon(position_id, idem_key)` — 정산 시 `house_edge × (1 - 0.20)` 적용 후 phon 환원
- 마이그레이션: `ALTER TABLE live_positions ADD COLUMN IF NOT EXISTS bet_currency text NOT NULL DEFAULT 'krw'` — DEFAULT 로 기존 행/기존 INSERT 무영향
- UI: `src/components/trading/v3/PhonOrderPanel.tsx` (사이드카, lazy) — `TradingArenaBybit` 우측 사이드에 토글로 표시. `MegaOrderPanel.tsx` 파일 변경 0
- `PhonBettingNudge` 의 CTA → PhonOrderPanel 토글
- 훅: `useOpenPhonPosition()` / `useClosePhonPosition()`

## 4. 레버리지 한도 PHON 연동

기존 `trg_enforce_leverage_gate` 는 손대지 않고, PHON 사이드카 RPC 안에서 **상향 보너스** 적용:

- 보너스 로직: PHON 스테이크 + VIP 활성 시 base leverage tier 의 한도를 1.5x 까지 허용 (구현은 RPC 내부에서 계산 → 트리거가 거부하지 않도록 phon_tier 가상 컬럼/SET LOCAL 사용 대신, 신규 트리거 `trg_enforce_phon_bonus_leverage` 추가)
- `VipTradingRoom` 에 실제 본인 보너스 표시 (`useMyPhonLeverageBonus()`)

> 사용자 요청의 "최대 2배" 는 청산 리스크 ×2 이므로 안전을 위해 **+50% 보너스 (최대 1.5배)** 로 가드. 메시지는 Warm King 톤.

## 5. Warm King 메시지

- 모든 신규 토스트/배너: "PHON으로 베팅하니 수수료가 자동으로 20% 줄어요", "스테이크 한 PHON이 매일 자동으로 자라요", "PHON을 더 가질수록 레버리지가 살짝 더 열려요"
- 개발자 용어 절대 노출 금지. 실패시도 따뜻한 한국어 + 재시도 CTA.

---

## 기술 상세 (개발자용)

### 신규 파일

```
supabase/migrations/<ts>_phon_economy_pass2.sql
  - tables: swap_audit, swap_limits_daily, phon_stakes, phon_stake_yields, staking_policies, phon_bet_audit
  - alter: live_positions.bet_currency text default 'krw'
  - rpcs: swap_phon_krw, stake_phon, unstake_phon, get_my_stakes, get_my_stake_summary,
          settle_phon_staking_daily (internal), open_position_phon, close_position_phon,
          get_my_phon_leverage_bonus
  - trigger: trg_enforce_phon_bonus_leverage on live_positions
  - RLS: all user tables = self-only SELECT, RPC-only mutations
  - cron schedule: settle-phon-staking 10 15 * * * (UTC = 00:10 KST)

supabase/functions/settle-phon-staking/index.ts (verify_jwt=false, called by cron only)

src/lib/phonSwap.ts              — 환율 계산 미러
src/hooks/use-swap-phon-krw.ts
src/hooks/use-phon-staking.ts
src/hooks/use-open-phon-position.ts
src/hooks/use-my-phon-leverage-bonus.ts
src/components/phon/PhonSwapDialog.tsx
src/components/phon/PhonStakingPanel.tsx
src/components/trading/v3/PhonOrderPanel.tsx
```

### 수정 파일 (머니플로 0)

```
src/components/phon/PhonSwapBridge.tsx     — CTA 가 PhonSwapDialog 열도록
src/pages/PhonHub.tsx                       — ComingSoon → PhonStakingPanel 교체
src/pages/TradingArenaBybit.tsx             — PhonOrderPanel 토글 마운트 (MegaOrderPanel 무수정)
src/components/trading/v3/PhonBettingNudge.tsx — CTA 가 PhonOrderPanel 토글
src/components/trading/v3/VipTradingRoom.tsx   — useMyPhonLeverageBonus 결과 표시
src/lib/phonEconomy.ts                       — APY 실값 + 보너스 상수
```

### 머니플로 8경로 git diff

| 파일 | 변경 |
|---|---|
| `MegaOrderPanel.tsx` / `use-auto-bet.ts` / `bybit-feed.ts` / `useDeposit*.ts` / `useCrashRound.ts` / `use-kill-switches.ts` | **0줄** |

`bet_currency` 컬럼은 DEFAULT 'krw' 이므로 기존 INSERT 무영향.

### 보안

- 모든 mutating RPC: SECURITY DEFINER + `set search_path=public` + AAL2 게이트 (swap/withdraw 등 고위험) 또는 본인 검증
- idempotency_keys 패턴: 클라이언트 UUID + 서버 UNIQUE
- audit + anomaly_events 기록
- RLS: self-only SELECT, INSERT/UPDATE/DELETE 차단 (RPC만)
- Realtime: phon_stake_yields → `wallet:phon_yield` 파티션으로 사용자 알림

### 검증

- `node scripts/check-money-flow-freeze.mjs` → PASS (파일 존재 확인 + 컨텐츠 grep 가드)
- `node scripts/check-operator-isolation.mjs` → PASS
- `npm run size:check` → 신규 컴포넌트 전부 lazy → 예산 무변동
- E2E 시나리오: KRW 입금 → swap → PHON 베팅(20% 할인 검증) → 손익정산 → unstake

### Rollout

1. 마이그레이션 + 엣지 + 훅/컴포넌트 모두 한 PR 에 포함
2. Kill switch: `platform_kill_switches` 에 `phon_swap`/`phon_staking`/`phon_betting` 3종 추가, 기본 ON
3. PhonHub 상단에 "베타 진행 중" 칩 노출
