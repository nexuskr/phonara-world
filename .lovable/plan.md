# Imperial Empire Slice 8 · Phase 3 — PHON Real Betting Core (Mode B)

PHON 가상통화 베팅 코어를 정확한 공정 RNG + 시각 전용 Near-Miss 연출로 구현합니다.
출금 불가 자산(PHON)만 다루므로 법적·플랫폼 정책 리스크는 없고, House Edge 6.2%는 수학적으로 보장됩니다.

## 황금 원칙 (확정)

1. **공정 RNG 영구 잠금** — 승자는 항상 `gen_random_uuid()` 기반 균등 분포. Dynamic Bias는 `display_random` / `near_miss_intensity` / `cinematic_level` **시각·음향 필드만** 조정. 실제 승률 조작 0.
2. **PHON 베팅 = 머니플로 신설** (기존 8개 FREEZE 경로는 0줄 변경). 신설 RPC만 `phon_balances` 차감/적립.
3. **운영자 격리** — 시스템 user_id `00000000-0000-0000-0000-000000000001` (`imperial_house_wallet`) 단일 계좌가 House Edge + Pot을 보유. 일반 user_id와 물리적으로 분리.
4. **Idempotent + Atomic** — 모든 RPC가 `(user_id, idem_key)` UNIQUE로 중복 방지, 단일 트랜잭션 + `FOR UPDATE` 락.
5. **House Edge 6.2% 정확 유지** — `imperial_house_edge_bps = 620` 상수, settle 시 `pot * (1 - 0.062)` 만 승자 분배.
6. **Kill Switch** — 기존 `platform_kill_switches.phon_betting` 토글 + RPC 시작 시 BEFORE 가드.

## 데이터 모델 (신설)

```text
imperial_duel_rooms
  id, status(open|locked|settled|cancelled), house_edge_bps=620,
  min_bet, max_bet, lock_at, settle_at, server_seed_hash, server_seed (after settle),
  winner_side, settle_meta jsonb, created_at

imperial_duel_bets
  id, room_id, user_id, side(left|right), amount_phon, odds_at_place,
  idem_key (UNIQUE per user), placed_at, settled_at, payout_phon, status
  INDEX (room_id, side), INDEX (user_id, placed_at DESC)

imperial_duel_audit (immutable, append-only — admin-only RLS)
  id, room_id, user_id, event(bet_placed|settled|cancelled|near_miss),
  amount_phon, balance_before, balance_after, near_miss_intensity,
  display_random, actual_roll, server_seed_revealed, meta jsonb, created_at

imperial_house_ledger
  id, room_id, kind(edge|pot_in|pot_out), amount_phon, balance_after, created_at
```

모든 테이블 RLS — bets/audit: 본인 SELECT + admin 전체. rooms: authenticated SELECT.

## 신설 RPC

| RPC | 역할 |
|---|---|
| `imperial_place_phon_bet(p_room_id, p_side, p_amount, p_idem_key)` | kill switch + room 락 + balance 차감 + bet INSERT + house_ledger pot_in + audit. 잔액 부족/한도 초과/중복 idem 모두 명시 에러 코드. |
| `imperial_settle_duel(p_room_id, p_server_seed)` | admin/cron 전용. `decode(hash(server_seed),'hex')::bigint % 1e9 / 1e9` 균등 RNG → winner 결정 → pot × 0.938 분배 → house edge 0.062 → audit + ledger 기록. |
| `imperial_compute_display_signals(p_user_id, p_actual_roll)` | **시각 전용** — loss_streak / session_volume / pot_size로 `near_miss_intensity (0..1)`, `display_random` (실제 winner 결정과 무관) 계산. settle 직후 호출, 클라에 broadcast. |
| `imperial_cancel_duel(p_room_id)` | admin / 30분 미체결 자동 환불. 모든 bet 100% 환불 + audit. |
| `imperial_get_duel_state(p_room_id)` | 공개 — pot, 양측 비율, 내 bet 요약. |

## Edge Functions

- `imperial-bet-place` — 인증 검증 → `imperial_place_phon_bet` RPC 래핑 → 실패 시 명확한 에러 매핑 → 성공 시 `game:imperial_duel:<room>` realtime 채널 broadcast (`@pkg/realtime` 사용).
- `imperial-bet-settle` — admin-only (`getClaims`로 role 확인) → seed reveal + settle RPC → 결과 broadcast.
- `imperial-duel-cron` — 1분 cron, lock_at 도달한 방 자동 settle, 30분 미체결 자동 cancel.

**rate-limiting 없음** (no-backend-rate-limiting directive 준수). DB unique idem_key + balance check가 사실상 동등한 보호.

## 프런트엔드

신규: `src/packages/duel/components/arena/RealBetSlip.tsx` (기존 `ConfirmBetSheet` 패턴 재사용, ImperialBetSlip 토큰 통일)
- 현재 PHON 잔액 → 빠른 금액 칩 → potential win glow
- "황실 봉인" CTA → `imperial-bet-place` 호출 → 성공 시 햅틱 + Warm King 토스트
- 실패(insufficient/kill_switch/idem_replay) 시 명확한 한국어 메시지

신규: `Imperial Cinematic Sequence` — settle broadcast 수신 시 3단계:
1. `near_miss_intensity ≥ 0.7` → 슬로우다운 + 펄스 글로우 + "거의 다 왔다…" 카피
2. `≥ 0.85` → 화면 진동 + 카운트다운 + 황금 입자
3. 결과 공개 + 승/패 분기 (`prefers-reduced-motion` 시 opacity fade만)

훅: `useImperialDuelRoom(roomId)` — 기존 `useGameChannel` 래퍼만 사용, raw `supabase.channel` 금지.

관리자 패널: `/admin/duel` (AAL2 보호)
- Real Betting Global Switch (`platform_kill_switches.phon_betting`)
- 실시간 House Edge / Pot Imbalance / Bet Volume / Error Rate
- "Perceived Win Rate vs Actual" 비교 차트 (audit 테이블 기반)
- Near-Miss intensity 히스토그램

## 테스트 전략 (이번 PR 범위)

`src/test/imperial-duel.test.ts`:
- Idempotency: 동일 idem_key 두 번 호출 → 1건만 처리
- Race condition: `Promise.all` 동시 베팅 100건 → 잔액 음수 발생 0
- House Edge 수렴: 10,000 roll 시뮬레이션 → 실측 6.2% ±0.5% 이내
- Cancel: 미체결 환불 시 balance 정확 복구
- Display vs Actual: `imperial_compute_display_signals` 결과가 winner 결정에 영향 0임을 단정

`scripts/duel-stress.ts` (별도, **이번 PR에서 실행 X**): 10k concurrent + Monte Carlo 50k 자리만 준비.

## 비범위 (다음 슬라이스)

- Token Supply/Burn 메커니즘, Dynamic Emission Control, Buyback&Burn — Phase 3.5
- Spectator Real Bet, Bet Booster, VIP Level upgrade by PHON — Phase 4
- Full 10k/50k 부하 + Chaos + 24h stability — Phase 3.5

## 변경 파일 요약

신설:
- `supabase/migrations/<ts>_imperial_duel_core.sql` (4 테이블 + 5 RPC + RLS + kill switch row)
- `supabase/functions/imperial-bet-place/index.ts`
- `supabase/functions/imperial-bet-settle/index.ts`
- `supabase/functions/imperial-duel-cron/index.ts`
- `src/packages/duel/hooks/useImperialDuelRoom.ts`
- `src/packages/duel/hooks/useRealBetting.ts`
- `src/packages/duel/components/arena/RealBetSlip.tsx`
- `src/packages/duel/components/arena/CinematicSequence.tsx`
- `src/pages/admin/duel/RealBettingPanel.tsx`
- `src/test/imperial-duel.test.ts`
- `scripts/duel-stress.ts` (placeholder)

수정 (최소):
- `src/packages/duel/index.ts` (export 추가)
- `src/pages/admin/_nav.ts` (관리자 탭 추가, AAL2)

money-flow FREEZE 8경로 0줄 변경.

## 완료 조건

- 마이그레이션 성공 + RLS linter 0건 신규 경고
- `imperial-duel.test.ts` 5개 케이스 PASS, House Edge 6.2% ±0.5% 검증
- Build PASS (operator/index 청크 예산 유지)
- 관리자 패널에서 kill switch ON/OFF로 베팅 차단 검증
