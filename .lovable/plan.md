# Phase 3 — Imperial Gold Crash 게임

Provably Fair v2 기반 위에 AETHER Crash 게임을 Phonara에 이식합니다. 시각·성능·중독성 3축 모두 Stake/Rollbit 초월을 목표로 합니다. 머니플로 8경로는 절대 건드리지 않고, 기존 BetSlip/PHON 베팅 경로를 그대로 재사용합니다.

## 스코프

- 신규 게임 패키지: `src/packages/games/crash/**` (engine / hooks / store / ui / types)
- PF v2 완전 연동 (commit → byteStream → reveal → verify)
- Realtime: `useGameChannel('crash')` (Phase 1 4-파티션 래퍼 사용)
- 베팅: 기존 BetSlipBridge 재사용 (place_phon_bet RPC는 머니플로 8경로 — 본문 무변경)
- 라우팅: `/games/crash` 추가 (lazy chunk, Layer 1 번들 영향 최소화)

## 파일 구조

```text
src/packages/games/crash/
├── index.ts
├── types.ts                  # CrashRound, CrashPhase, BetTicket (Zod)
├── engine/
│   ├── index.ts
│   ├── crashEngine.ts        # 60fps tick, growth curve, crash detection
│   └── pf.ts                 # rng → crash multiplier (Stake 공식 호환)
├── store/
│   └── useCrashStore.ts      # Zustand: phase, multiplier, bets, history
├── hooks/
│   ├── useCrashRound.ts      # round lifecycle + PF commit/reveal
│   ├── useCrashChannel.ts    # useGameChannel('crash') 래퍼
│   └── useCrashAutoCashout.ts
└── ui/
    ├── CrashGame.tsx         # 메인 페이지 (route entry)
    ├── CrashChart.tsx        # Canvas curve + SVG overlay, gold gradient
    ├── CrashRocket.tsx       # 황금 왕좌 아이콘 (transform-only, GPU)
    ├── CrashCrackOverlay.tsx # crash 시 화면 균열 + particle
    ├── BetPanel.tsx          # multi-bet (2 슬롯)
    ├── AutoCashout.tsx       # preset 1.5/2/5/10× + manual
    ├── History.tsx           # 최근 50, ProvablyFairBadge
    └── Leaderboard.tsx       # live players (realtime)
```

라우터 추가: `src/App.tsx` lazy import `/games/crash`.

## PF v2 연동

- `imperial_pf_commit('crash', roundId)` → server_seed_hash 표시
- multiplier 공식 (Stake 호환, house edge 1%):
  ```
  h = hmacSha256(serverSeed, `${clientSeed}:${nonce}`)
  e = 2^52
  n = parseInt(h.slice(0,13), 16)
  crash = floor((100*e - n) / (e - n)) / 100   // 99/100 확률로 ≥1.00, 1/100은 1.00
  ```
- crash 직후 `imperial_pf_reveal` → realtime broadcast → 클라이언트 `useProvablyFair.verify`
- `<ProvablyFairBadge />` 라운드별 표시, 클릭 시 `<FairnessVerifier />` 모달

## 엔진 / 성능

- 단일 `requestAnimationFrame` 루프, 5ms 미만/tick
- 곡선: Canvas 2D 경로 + 오프스크린 그라디언트 캐시, 매 프레임 transform만 갱신
- 모바일: `touch-action: manipulation`, passive listeners, devicePixelRatio cap 2
- 백그라운드/비가시: `useViewportPause` (Phase 1)로 자동 정지
- 번들: crash 청크 < 60KB gzip, framer-motion은 이미 공용 청크 사용

## 상태 (Zustand)

```ts
phase: 'idle' | 'betting' | 'running' | 'crashed' | 'revealing'
roundId, multiplier, startedAt, crashAt
bets: { slot1, slot2 }      // amount, autoCashout, status
history: CrashRound[]       // 최근 50
players: LivePlayer[]       // realtime
pf: { hash, seed?, nonce, verified }
```

## Realtime 이벤트 (`useGameChannel('crash')`)

- `round:start` { roundId, hash, startsAt }
- `bet:placed` { userId, amount, slot }
- `cashout` { userId, multiplier, payout }
- `round:crash` { roundId, multiplier, seed, nonce }

## 베팅 (머니플로 무변경)

- BetPanel → 기존 BetSlipBridge → 기존 `place_phon_bet` 호출만 사용
- cashout은 기존 settle 경로 호출, 신규 머니 RPC 추가 없음
- PHON 토큰 베팅 + USDT 베팅 8경로 git diff = 0

## 시각 (Imperial Gold)

- 배경: `#050505` + radial gold haze (CSS conic-gradient, GPU)
- 곡선: 그라디언트 `#E8B923 → #F5D47A`, 끝점 펄스 글로우
- 황금 왕좌(rocket 대체): SVG, 곡선 끝 따라 transform
- Crash 시: 화면 0.4s 균열 SVG mask + gold particle burst (Canvas)
- 카피: KR 우선, `g('crash.*')` glossary 키 4개 추가

## 접근성 & 모바일

- 키보드: Space=cashout, B=bet, A=auto toggle
- 탭 타깃 48px, 큰 cashout 버튼 모바일 sticky bottom
- prefers-reduced-motion: particle/glow off, 곡선만 유지
- 햅틱: `HapticPulse` (Phase 1)

## 머지 게이트

- 머니플로 8경로 git diff = 0 (수동 검증)
- ESLint: `@/hooks/use-realtime-channel` 직접 import 금지 (Phase 1) — wrapper만
- size-limit: crash chunk < 60KB gzip, index 영향 0
- `check_permission_drift()` 0건 (이번 단계 신규 RPC 없음 — PF RPC는 Phase 2 그대로 재사용)
- 60fps 데스크탑/모바일 Chrome 수동 확인 (Performance Profile)

## 작업 순서

1. types + Zod + store
2. engine/pf.ts + crashEngine.ts (단위 PF 시뮬 1만 회 house edge ≈ 1% 확인)
3. CrashChart + CrashRocket + CrashCrackOverlay
4. BetPanel + AutoCashout + History + Leaderboard
5. useCrashRound + useCrashChannel + Realtime 연동
6. /games/crash 라우트 lazy 등록
7. Polish: particle, glow, sound placeholder, a11y, mobile pass
8. 최종 파일 목록 + 머지 게이트 결과 리포트

## 비범위

- 신규 머니 RPC, 신규 테이블, 베팅 한도 변경, 운영자 화면, 멀티게임 통합 — 모두 다음 단계
- WebGL/Three.js 도입 — 60fps Canvas로 충분, 번들 보호 위해 보류
