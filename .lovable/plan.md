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
- "황실 봉