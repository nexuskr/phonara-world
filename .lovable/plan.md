# P3-B Tier S 5종 게임 출시 (Pump / Wheel / Limbo / Keno / HiLo)

Stake.com·Rollbit 압도용 Tier S 5종을 `@pkg/apex/games/*` 에 추가한다.
모든 머니플로는 기존 `apex_play_mock_game` 경로만 사용 → 8경로 git diff = 0.

## 1. 동결 수식 (docs/apex/house-edge.md §6 보강)

| 게임 | RTP | House Edge | Max Mult | Min/Max Bet (PHON) | 비고 |
|---|---|---|---|---|---|
| Pump   | 99.0% | 1.0% | 50.00x  | 100 / 1,000,000 | `m(t)=1.0024^t`, 5 difficulty |
| Wheel  | 96.0% | 4.0% | 49.50x  | 100 / 500,000   | Rollbit(3%) 압도, 3 risk |
| Limbo  | 99.0% | 1.0% | 1,000x  | 100 / 1,000,000 | `payout = 0.99/p` |
| Keno   | 97.0% | 3.0% | 10,000x | 100 / 250,000   | Classic 10-pick |
| HiLo   | 99.0% | 1.0% | 무제한  | 100 / 500,000   | 52-card deck |

수식은 코드에 박지 않고 `@pkg/apex/games/_shared/edge.ts` 단일 상수 모듈에서 import.

## 2. 코드 구조

```text
src/packages/apex/games/
  _shared/
    edge.ts            # 동결 RTP/edge 상수 (house-edge.md §6 미러)
    fairness.ts        # seed/nonce/HMAC-SHA256 (LiveCrashV2 재사용)
    types.ts           # BetIntent, BetResult 공통
  pump/{engine.ts, PumpGame.tsx, usePumpGame.ts, types.ts}
  wheel/{engine.ts, WheelGame.tsx, useWheelGame.ts, types.ts}
  limbo/{engine.ts, LimboGame.tsx, useLimboGame.ts, types.ts}
  keno/{engine.ts, KenoGame.tsx, useKenoGame.ts, types.ts}
  hilo/{engine.ts, HiLoGame.tsx, useHiLoGame.ts, types.ts}
src/pages/apex/games/
  Pump.tsx Wheel.tsx Limbo.tsx Keno.tsx HiLo.tsx   # lazy route 래퍼
```

- 렌더: `HybridRenderer.create({ kind })` (WebGPU 우선, WASM SIMD fallback).
- 베팅: 기존 `IdempotentBetButton` + `apex_play_mock_game` RPC 그대로.
- 공유: BigWin(≥10x) 시 `ApexShareSheet` 자동 오픈.
- 라우트: App.tsx lazy 추가 (Layer 1 영향 0KB 유지).

## 3. 머니플로 가드

- 신규 RPC 0개. 기존 `apex_play_mock_game(amount, multiplier, idempotency_key)` 만 호출.
- 게임별 결과 로깅이 필요한 경우 `imperial_log_observability`(read-only 텔레메트리) 만 사용.
- `scripts/check-money-flow-freeze.mjs` 8/8 PASS 강제.

## 4. Perf & Health Dock

- 각 게임 60s 벤치 → `reports/apex-p3b-tiers.2026-05-20.json`
  - FPS p50/p99, frame jitter p99, chunk size gz, RPC RTT p95
- `src/pages/apex/Health.tsx` Perf 탭에 "Tier S 5게임" row 5개 추가
  (lazy import 하여 Health 번들 증가 없음)

## 5. 슬라이스 순서 & 보고

순서: Pump → Wheel → Limbo → Keno → HiLo → Perf/Health 통합

각 게임 완료마다:
```
✅ P3-B [게임명] 지구상 1개뿐인 최고사양 완료
- 변경 파일 목록
- git diff 요약 (머니플로 8경로 diff=0)
- 실측 지표 (chunk gz, FPS, jitter)
- 다음 게임 계획
```

5종 + Perf 통합 완료 시:
```
✅ P3-B Tier S 5종 게임 지구상 1개뿐인 최고사양 완료
```
→ 즉시 P3-F Provably-Fair Verifier UI 고도화 상세 계획 제시.

## 6. 가드레일 체크리스트 (매 슬라이스 종료 시)

- [ ] 머니플로 8경로 git diff = 0
- [ ] house-edge.md §6 수식 0 터치
- [ ] 게임 chunk ≤ 80KB gz, Layer 1 ≤ 180KB gz
- [ ] operator 격리 유지 (admin 코드 무변경)
- [ ] notify 4-tier + use*Channel only
- [ ] 신규 코드 `@pkg/apex/*` 한정
