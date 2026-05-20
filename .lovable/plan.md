# ApexForge Phase 2~4 잔여 압살 — 최종 마무리 플랜

Phase 1·슬라이스 A·B·C·D 본체는 모두 적재 완료. 남은 5개 항목을 순서대로 끝내고 Phase 3 로 넘어간다.

## 머니플로 불변 가드 (전 항목 공통)

다음 8경로 **git diff 라인 수 = 0** 을 모든 단계에서 유지:
- `imperial_place_phon_bet` / `_settle` / `_apply_house_edge_split`
- `credit_crypto_deposit` / `request_withdrawal`
- `src/packages/wallet/hooks/useDeposit.ts` / `useDepositRealtime.ts` / `useDepositCountdown.ts`
- 이번 작업은 100% `src/packages/apex/**` + `docs/**` + `scripts/**` + `.github/**` 한정.

---

## 1. CI/CD 복구 (install drift + 6종 green)

문제: 슬라이스 B/C 에서 새 파일이 추가됐지만 lockfile/depcruise 레이어 규칙·ESLint 보호경로에 apex 패키지가 등록되지 않아 6종 워크플로가 drift.

작업:
- `bun install` 재정렬 (frozen-lockfile 통과 확인)
- `.dependency-cruiser.cjs` 에 `src/packages/apex/**` 레이어 추가 (의존 방향: apex → core/ui/realtime 만 허용, operator/admin 차단)
- `.eslintrc` no-direct-sonner / no-raw-channel 예외 점검 — apex 는 `@/lib/notify` + `@pkg/realtime` 만 사용 중인지 grep 검증
- `scripts/check-money-flow-freeze.mjs` 그대로 PASS (apex 는 freeze 목록 외)
- `scripts/check-operator-isolation.mjs` 에 apex 청크가 entry preload 에 새지 않는지 추가 패턴
- 워크플로 6종: `perf-gate` / `bundle-budget` / `db-permissions` / `pr3-isolation` / `prerender` / `e2e` — 로컬 dry-run 후 green 확인

산출물: `reports/ci-recovery.2026-05-20.json`

## 2. Production Build + house-edge.md 최종 완성

작업:
- `vite build --mode production` 1회 — operator chunk 분리 / apex chunk size 측정
- `size-limit.config.json` 에 `apex-*` 패턴 추가 (한도 120KB gzip, max aggregate)
- `docs/apex/house-edge.md` 보강:
  - 5게임(Crash / Dice / Mines / Plinko / Slots-Lite) × {RTP, House Edge, Variance, Max Multiplier, Min/Max Bet}
  - Tier S 항목: Live Crash / Pump / Wheel / Limbo / Keno 의 목표치 (Phase 3 예약)
  - Stake.com / Rollbit / BC.Game 동일 게임 비교표 (RTP 격차 +0.3~0.8%p)
  - 검증 방법: `scripts/slot-sim.ts` 100M 스핀 시뮬레이션 결과 인용

## 3. Tier S 속도 최적화 실측

작업:
- `src/pages/apex/Health.tsx` 의 GPU/WASM 패널에서 5게임 각 60s 벤치 자동화 훅 추가 (이미 있는 `HybridRenderer.create` 활용, 비침습)
- 측정 항목: 평균 FPS / p1 FPS / frame-budget 초과율 / GPU fallback 발생률
- 목표: 모바일 mid-tier(iPhone 12 / Pixel 6 급) 에서 평균 60fps, p1 ≥ 50fps
- 결과 `reports/apex-perf.2026-05-20.json` 로 저장 + Health Dock "Perf" 탭에 표시

## 4. 전체 통합 검증

체크리스트:
- Health Dock 6탭 (Engine / GPU / WASM / Realtime / Idempotency / Share) 풀 동작 스크린샷
- Layer 1 bundle ≤ 180KB gzip (PR-L 한도)
- LCP ≤ 2.5s (lighthouserc)
- `bun run lint` / `bunx depcruise` / `bundle-budget.mjs` / `check-operator-isolation.mjs` / `check-money-flow-freeze.mjs` 전부 green
- e2e Tier 0 (`@critical`) 통과

## 5. Phase 2~4 종료 선언 + Phase 3 마스터 플랜

종료 보고 후 아래 Phase 3 끝판왕 플랜 제시:

### Phase 3 — Tier S Live Engine + Provably Fair v2 + Cross-Chain Cashout

- **3.1 Live Crash V2** — server-authoritative 100ms tick + WebSocket 멀티플라이어 + 자동 캐시아웃 큐
- **3.2 Provably Fair v2** — Ed25519 서명 시드 + 라운드별 공개 검증 페이지 `/apex/verify/:roundId`
- **3.3 Tier S 게임 5종** — Pump / Wheel / Limbo / Keno / HiLo (전부 HybridRenderer 위에 빌드)
- **3.4 Cross-Chain Cashout** — USDT(TRC20/ERC20/BSC) 자동 라우팅 + gas 보조 + 출금 1분 SLA
- **3.5 Stake-Style Race / Rakeback** — 주간 race 자동 정산 + 0.1%~5% 동적 rakeback (tier 연동)
- **3.6 Apex Mobile Shell** — Capacitor 래핑 + 푸시 + 앱스토어 제출 패키지

각 슬라이스는 머니플로 8경로 diff=0 보장 + Edge Function + RLS 가드 + 관측성 대시보드 동시 입수.

---

## 실행 순서 & 보고 포맷

순서대로 1 → 2 → 3 → 4 → 5. 각 단계 완료마다:

```
✅ [작업명] 지구상 1개뿐인 최고사양 완료
- 변경 파일: ...
- git diff 요약 (머니플로 8경로 diff=0)
- 실측 지표: ...
- 다음: ...
```

5단계 종료 시 정확히:
```
✅ Phase 2~4 완전 압살 종료. Phase 3 준비 완료
```
