# ApexForge — 슬라이스 B · C · D 정확 실행 (Phase 3 ~ 4)

> 전제: Phase 1 라이브 + 슬라이스 A (WebGPU/WASM Hybrid Engine) 완료.
> 머니플로 8경로 본문 git diff = 0, House Edge 수식 0 터치 절대 준수.
> 신규 코드는 `@pkg/apex/*`, `supabase/functions/apex-*` 에만.

---

## 1) 슬라이스 B — 5게임 멱등화 v2 (서버 idempotency 100%)

### B-1. DB 마이그레이션 (머니플로 본문 무변경)

- 신규 SECURITY DEFINER RPC `apex_place_bet_v2(_game_code text, _bet_phon numeric, _bet_usdt numeric, _params jsonb, _idem_key text)`
  1. `SELECT ... FROM apex_game_rolls WHERE user_id=auth.uid() AND idempotency_key=_idem_key` 있으면 즉시 그 row 반환.
  2. 없으면 기존 `apex_play_mock_game(...)` 호출 → 반환 row의 `idempotency_key` 컬럼 UPDATE.
  3. `apex_daily_cap` upsert (++roll_count, last_roll_at=now()).
  - 머니 이동·House Edge·`apex_play_mock_game` 본문 0 터치.
- GRANT EXECUTE TO authenticated.

### B-2. 클라이언트 멱등 레이어

- `src/packages/apex/lib/idempotency.ts`
  - `newIdemKey(gameCode)` → `${gameCode}_${crypto.randomUUID()}`.
  - sessionStorage 5분 캐시 `apex:idem:<key>` → 새로고침 dedupe.
- `src/packages/apex/lib/api.ts`에 `placeBetIdempotent({ gameCode, betPhon, betUsdt, params })` 추가 (in-flight Promise dedupe).
- `src/packages/apex/hooks/useIdempotentBet.ts` — `{ pending, lastResult, error, place() }`.

### B-3. UX

- `src/packages/apex/components/IdempotentBetButton.tsx` — spinner + 5s timeout fallback + 1회 retry.
- 5개 게임(`Crash/Slots/Dice/Plinko/Mines`)의 "베팅" 버튼만 이 컴포넌트로 교체 (게임 로직 무변경).

---

## 2) 슬라이스 C — KakaoTalk / Naver Band 12-스티커 자동 공유

### C-1. 스티커 (빌드 의존성 0)

- `src/packages/apex/viral/stickers.ts` — 12종 메타(category, label, gradient, emoji).
  - BigWin ×3, Jackpot ×3, Milestone ×3, Streak ×3.
- 절차적 SVG 컴포넌트 `<ApexSticker index={1..12} size={320} />` (PNG 자산 없이 즉시 렌더, html2canvas 캡처 가능).

### C-2. 공유 시트

- `src/packages/apex/viral/ApexShareSheet.tsx`
  - 채널: Kakao(Web Share/링크), Naver Band(`https://band.us/plugin/share`), X, Web Share API, 클립보드.
  - 공유 직후 기존 `apex_log_kakao_share(kind, ref_id)` RPC 호출.
- 자동 오픈 트리거: 결과 `multiplier ≥ 10×` 또는 payout ≥ 50,000 PHON (1회 디듀프 / `apex:shared:<rollId>`).

### C-3. 통합

- 슬라이스 B의 `useIdempotentBet` 결과 hook에서 BigWin 감지 → `<ApexShareSheet>` open.
- `/apex/health` "Viral" 탭에 share count 24h/7d/total (기존 share log RPC 활용 또는 단순 count 쿼리).

---

## 3) 슬라이스 D — Supabase Edge Functions 3종 (Deno)

### D-1. `supabase/functions/apex-bigwin-notifier/index.ts`
- POST `{ rollId }` → row 조회 → `multiplier ≥ 10` 검증 → realtime broadcast on partition `wallet:apex_bigwins`.
- 5분 디듀프 (in-memory Map + DB last_broadcast_at).
- `verify_jwt = false` (DB trigger / webhook 호출용).

### D-2. `supabase/functions/apex-vault-claim-processor/index.ts`
- POST `{}` (Bearer 필수) → 기존 `apex_claim_daily_vault()` 래핑 + `next_claim_at` 계산 + 응답.
- `verify_jwt = true`.

### D-3. `supabase/functions/apex-daily-cap-enforcer/index.ts`
- Cron 호환 GET/POST → 어제 `apex_daily_cap` 정리 + 24h roll 카운트 재계산 telemetry.
- cron schedule은 별도 단계(다음 슬라이스)에서 등록 — 지금은 함수 자체만 배포.

### D-4. 공통

- `npm:@supabase/supabase-js@2/cors`의 `corsHeaders`만 사용 (중복 선언 금지).
- 모든 입력 zod 검증, 모든 응답 corsHeaders 포함.

---

## 가드레일 (3 슬라이스 공통)

- 머니플로 8경로(`apex_play_mock_game`, `phon_balances`, `apex_usdt_mock_balances`, `apex_game_rolls` 본문, `credit_crypto_deposit`, `request_withdrawal`, `_apply_house_edge_split`, `imperial_place_phon_bet`) 본문 git diff = 0.
- House Edge 수식 0 터치.
- ESLint / depcruise / operator-isolation / bundle-budget 그린.
- Layer 1 gz ≤ 180KB.
- `notify` 4-tier만, `useWalletChannel`/`useGameChannel`만 (raw `supabase.channel` 금지).

---

## 실행 순서

1. 슬라이스 B — migration → 승인 → idempotency lib/hook/button → 5게임 주입 → 보고.
2. 슬라이스 C — 12 스티커 + ShareSheet + BigWin 자동 트리거 → 보고.
3. 슬라이스 D — 3 edge functions 작성 + 배포 → curl 검증 → 보고.

## 예상 효과

| 지표 | 현재 | After |
|---|---|---|
| 더블 베팅 가능성 | 클라 dedupe | 서버 idempotency 100% |
| K-바이럴 공유 채널 | 0 | Kakao+Band+X+WebShare |
| 운영 자동화 | DB only | BigWin push + Vault + Cap cron |
| Layer 1 gz | 37KB | ≤ 180KB 유지 |
