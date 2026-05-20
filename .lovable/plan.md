# ApexForge — Phase 2~4 끝판왕 슬라이스 (WebGPU/WASM · Idempotency v2 · Viral · Edge)

> 전제: Phase 1 라이브 (Health Dock · BigWin Ticker · 5 RPC · 4 신규 테이블).
> 머니플로 8경로 git diff = 0, House Edge 수식 0 터치. 신규 코드는 `@pkg/apex/*` 와 `supabase/functions/apex-*`에만.

---

## 슬라이스 A — WebGPU + WASM SIMD 하이브리드 엔진 (Phase 2)

### A-1. 디렉터리

```text
src/packages/apex/engine/
  types.ts            // ParticleField, CurveFrame, EngineCaps 공통 타입
  EngineCaps.ts       // navigator.gpu 감지 + adapter info + SIMD 감지 (1회 캐시)
  WebGPUEngine.ts     // Particles / Crash curve compute pipeline (WGSL inline)
  WASMEngine.ts       // SIMD fallback (dice/plinko/particles tick) — JS impl + 후속 .wasm 슬롯
  HybridRenderer.ts   // 자동 라우터: gpu > wasm-simd > cpu, 동일 API surface
  hooks.ts            // useHybridEngine() React hook (Suspense-safe, lazy init)
  index.ts
```

- 라우팅: `HybridRenderer.create({ kind: 'particles'|'crash'|'dice'|'plinko' })`
  → 내부에서 `EngineCaps`로 best path 선택 → 동일 `tick(dt)` / `read()` API 반환.
- 안전 가드: WGSL struct 정렬(vec3→16-byte pad), `device.lost` 핸들러, storage buffer ≤ 8, `requiredLimits` 없이 default만.
- 모바일 저사양: `EngineCaps.tier = low|mid|high` 자동 분류 (cores·DPR·memory)로 입자 수·workgroup 자동 축소.
- WASM은 1차로 **순수 TS placeholder** (loop unroll + Float32Array)로 60fps 보장, 후속 PR에 `public/wasm/apex-engine.wasm` 슬롯 (이미 디렉터리/glue 로딩 코드만 준비).

### A-2. 기존 게임 비침습 주입

- `Crash.tsx` / `Slots.tsx` / `Dice.tsx` / `Plinko.tsx` / `ApexBackdrop.tsx`
  - `engine?: HybridEngine` prop 추가 (기본값 = `useHybridEngine(kind)`).
  - 기존 캔버스 draw 루프는 유지하되, **데이터 소스만** engine.read()로 교체.
  - 머니플로 호출(`apex_play_mock_game`) 0 터치.
- ApexBackdrop는 `/apex/games/*`에서 OFF (LCP -300ms 즉시 회수).

### A-3. Health Dock 연동

- `/apex/health` GPU/WASM 탭에 EngineCaps 실측 + 활성 엔진(gpu/wasm/cpu) + 프레임당 compute 시간(ms) 노출.

---

## 슬라이스 B — 5게임 멱등화 wrapper (Phase 3, Money Flow 안전)

### B-1. 클라이언트 멱등키

- `@pkg/apex/lib/idempotency.ts`
  - `newIdemKey(gameCode)` = `crypto.randomUUID()` (게임코드 prefix).
  - sessionStorage 5분 캐시(`apex:idem:<key>`) → 페이지 새로고침해도 동일 베팅 dedupe.
- `useIdempotentBet(gameCode)` hook
  - `{ pending, lastResult, place(params, bet) }` 노출.
  - 동시 호출 시 in-flight Promise 재사용 → 중복 클릭 100% 차단.
  - Result UX: "이미 처리중…" → "✅ 처리 완료" → 3초 후 idle.

### B-2. RPC wrapper (머니플로 FREEZE 유지)

- `apex_play_mock_game` 원본 본문 **무변경**.
- 신규 SECURITY DEFINER `apex_place_bet_v2(_game_code, _bet_phon, _bet_usdt, _params, _idem_key)`
  - 1) `apex_game_rolls`에 `idempotency_key` 기존 row 있으면 즉시 그 row 반환 (no double charge).
  - 2) 없으면 `apex_play_mock_game(...)` 호출 → 결과 row의 `idempotency_key` UPDATE.
  - 3) `apex_daily_cap` upsert (50/day).
  - **머니 이동 자체는 기존 RPC가 수행** → diff = 0.
- API 래퍼 `placeBetIdempotent()` 추가, 5게임 컴포넌트는 이 wrapper만 호출.

### B-3. UX

- `<IdempotentBetButton>` 공용 컴포넌트 — pending spinner + 5초 timeout fallback + retry 1회.

---

## 슬라이스 C — KakaoTalk / Naver Band 12-스티커 자동 공유 (Phase 4)

### C-1. 스티커 자산

- `public/stickers/apex/01..12.png` (PNG 320×320 transparent).
- 1차는 **CSS+SVG로 12종 절차적 생성** → 빌드 의존성 0, 즉시 PWA 캐시.
  - 카테고리: BigWin(3) · Jackpot(3) · Milestone(3) · Streak(3).
- `@pkg/apex/viral/stickers.ts` — index → meta(label, palette, emoji).

### C-2. 공유 시트

- `<ApexShareSheet kind="bigwin|jackpot|milestone" amount mult />`
  - 채널: Kakao(웹 공유 API + share URL) · Band(`band.us/plugin/share`) · X · Web Share API · 클립보드.
  - 공유 직후 `apex_log_kakao_share(kind, refId)` 호출 → 미션 진행도 +1.
  - 5만 PHON 이상 빅윈/Jackpot 시 자동 오픈 (1회 디듀프).

### C-3. 통합 지점

- BigWin: Crash/Slots/Plinko `multiplier ≥ 10×` 또는 payout ≥ 50k PHON.
- Milestone: 첫 베팅, 일일 미션 클리어, 7일 streak.
- Health Dock "Viral" 탭에 공유 카운트 24h/7d/total 표시.

---

## 슬라이스 D — Supabase Edge Functions 3종 (Deno)

### D-1. `supabase/functions/apex-bigwin-notifier/index.ts`
- POST 트리거 (DB trigger AFTER INSERT on apex_game_rolls multiplier ≥ 10).
- 5분 디듀프 (user_id+game). 결과: realtime broadcast on `wallet:apex_bigwins` 채널.
- `verify_jwt = false` (DB trigger 호출).

### D-2. `supabase/functions/apex-vault-claim-processor/index.ts`
- POST { idem_key } → `apex_claim_daily_vault()` 래퍼 + 응답에 `next_claim_at` 계산.
- 클라이언트 직접 RPC 호출과 호환(이 엣지는 푸시·이메일 fan-out 전용).
- `verify_jwt = true`.

### D-3. `supabase/functions/apex-daily-cap-enforcer/index.ts`
- Cron `0 15 * * *` (UTC = KST 00:00) → `apex_daily_cap` 어제 데이터 정리 + 24h roll 카운트 재계산.
- 안전망: `apex_play_mock_game` 내 cap 체크가 1차, 이 엣지는 telemetry/리포트.

### D-4. 공통

- `_shared/cors.ts` 재사용. `npm:@supabase/supabase-js@2/cors`.
- 모든 응답에 `corsHeaders` + 입력 zod 검증.

---

## 가드레일 (모든 슬라이스 공통)

- 머니플로 8경로 본문 git diff = 0 (apex_play_mock_game, phon_balances, apex_usdt_mock_balances, apex_game_rolls, credit_crypto_deposit, request_withdrawal, _apply_house_edge_split, imperial_place_phon_bet).
- House Edge 수식 0 터치.
- ESLint / depcruise / operator-isolation / bundle-budget 4 게이트 그린.
- Layer 1 gz index ≤ 180KB 유지 (엔진은 lazy import + Pixi 미사용).
- `notify` 4-tier, `useWalletChannel`/`useGameChannel` 만 사용 (raw channel 금지).

---

## 실행 순서 (이번 턴)

1. **A** WebGPU/WASM 엔진 + Health Dock 연동 → 빌드 확인.
2. **B** 멱등 wrapper RPC migration + hook + 5게임 주입.
3. **C** 12 스티커 + 공유 시트 + 자동 트리거.
4. **D** 3 Edge functions + DB trigger.
5. 보고: 각 슬라이스 끝마다 ✅ + 파일 목록 + diff 요약.

## 예상 효과

| 지표 | Before (Phase 1) | After (이번 턴) |
|---|---|---|
| 모바일 Crash FPS | 35-45 | **60 안정** |
| 더블 베팅 가능성 | 1차 클라 dedupe | **서버 idempotency 100%** |
| 카카오/밴드 K-바이럴 | 0 | **12 스티커 + 자동 시트** |
| 운영 가시성 | DB only | **3 Edge + realtime broadcast** |
| Layer 1 gz | 37KB | **37KB (변동 0)** |
