# Imperial Empire PHON Real Betting — Slice 2 (Edge + Frontend + Tests)

1차 슬라이스(DB/RPC/Audit/Ledger)는 완료. 이번 슬라이스는 사용자 진입점(Edge + UI) + 운영자 패널 + 테스트를 마무리한다.

## 범위 요약

1. **Edge Functions 3종** (`supabase/functions/`)
2. **Frontend 컴포넌트 + 훅** (`src/components/duel/*`, `src/hooks/*`)
3. **Admin Panel** (`/admin/duel`)
4. **Deno 테스트 스위트**

money-flow 8경로, Operator Isolation, Kill Switch OFF 기본값은 절대 미터치.

---

## 1. Edge Functions

```text
supabase/functions/
  imperial-bet-place/index.ts      # JWT 검증 → imperial_place_phon_bet RPC → realtime
  imperial-bet-settle/index.ts     # admin AAL2 → seed reveal SHA-256 검증 → imperial_settle_duel
  imperial-duel-cron/index.ts      # 만료 룸 정산 + partial-failure 복구
```

공통: `corsHeaders` (npm 스펙), zod 입력 검증, 한국어 + `error_code` 응답, idempotent.

- **place**: body `{ room_id, side, amount_phon, idem_key }` → RPC 호출 → 성공 시 `imperial_duel_rooms` 채널 broadcast(`bet_placed`).
- **settle**: admin role + `aal=aal2` claim 강제, server-side seed 공개 + 해시 일치 검증 후 RPC. broadcast(`settled` + cinematic_signals).
- **cron**: pg_cron 분당 호출, `FOR UPDATE SKIP LOCKED`, 실패 룸은 `imperial_duel_audit`에 `cron_partial_fail` 적재 후 다음 틱 재시도.

## 2. Frontend

```text
src/components/duel/
  RealBetSlip.tsx         # PHON 베팅 입력, glassmorphism, potential win glow, haptic
  CinematicSequence.tsx   # near_miss_intensity 3단계 (calm/tense/climax), reduced-motion respect
src/hooks/
  useImperialDuelRoom.ts  # 룸 상태 + realtime (useGameChannel 사용)
  useRealBetting.ts       # place_bet optimistic + rollback + idem_key 자동발급
```

- realtime은 `@pkg/realtime` `useGameChannel` 만 사용 (PR-J 규칙).
- 토스트는 `@/lib/notify` Warm King prefix, 색상은 디자인 토큰.
- Money-flow 가드 주석 `// MONEY_FLOW_NEW_PATH: phon_betting (Mode B)` 표시.

## 3. Admin Panel

`src/pages/admin/Duel.tsx` + `_AdminRoutes.tsx` + `_nav.ts` 등록. `AdminAal2Gate` 보호.

- 카드: Kill Switch 토글 (`phon_betting_enabled`), 24h House Edge drift, Perceived vs Actual 차트, Near-miss 분포.
- 신규 admin RPC: `admin_get_duel_metrics_24h()` (security definer, has_role admin).
- 액션: Force Settle (수동 seed reveal), Audit Export (CSV via `imperial_duel_audit`).

## 4. Testing

```text
supabase/functions/imperial-bet-place/index.test.ts
supabase/functions/imperial-bet-settle/index.test.ts
supabase/functions/imperial-duel-cron/index.test.ts
```

- Idempotency: 같은 `idem_key` 두 번 호출 → 두 번째는 1차 결과 그대로 반환.
- Race: `Promise.all(100x)` 동시 베팅 → 잔액 단일 차감, audit 정확히 100.
- House Edge: 10k 결제 시뮬레이션, edge 6.2% ±0.3% 수렴.
- Refund accuracy: 한쪽만 베팅된 채 만료 → 100% 환불.
- Display vs Actual: `imperial_compute_display_signals` 호출이 실제 winner 결정에 영향 0임을 증명.

테스트는 dotenv import 패턴, 응답 body 항상 consume.

## 5. Migration (admin metrics RPC만 신규)

```sql
-- admin_get_duel_metrics_24h: 24h edge drift, near-miss buckets, perceived vs actual
```

기타 DB 변경 없음. (1차 슬라이스로 충분.)

## 완료 조건

- 3 Edge functions 배포 + curl smoke pass
- 4 Frontend 파일 + Admin 페이지 렌더 (console error 0)
- Deno test 전부 PASS, House Edge 6.2% ±0.3% 출력
- Kill Switch 기본 OFF 유지, money-flow 8경로 git diff 0

## 보고 문구

"✅ Imperial Empire PHON Real Betting Core 2nd Slice Complete — Edge + Frontend + Ironclad Tests PASS | Fair RNG + Cinematic Near-Miss + Kill Switch Fully Operational | Phase 3 Core Battle-Ready"
