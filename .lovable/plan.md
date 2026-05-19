# ApexForge Phase 2 — Games + Community + Polish

기존 ApexForge 7-Tab Hybrid Overlay (`/apex/*`) 위에 **Stake.com 압살용 게임 5종 + Community + 시각/모션 폴리시**를 추가한다. 머니플로 8경로 git diff = 0, Phonara 기존 코드 무변경 원칙은 그대로 유지.

## 결정 사항 (사용자 요청 반영)
- 스택: Vite + React 18 + TS + Tailwind + shadcn/ui + Supabase 그대로. Next.js/Nx/Rust 등 전환 없음 — 이후 이식 경로는 기존 `MIGRATION.md`에 이미 명세됨.
- 모든 신규 게임은 **mock 자체 RNG + 기존 `phon_balances` 차감/지급 RPC 재사용**. Imperial Duel/casino slots 기존 RPC 는 절대 변경하지 않음.
- 디자인 토큰: 이미 잠긴 `--apex-neon (#00FF9F)` + `--apex-magenta (#FF00FF)` + `--apex-black` 재사용. 신규 토큰 추가 없음.
- Framer Motion: 페이지-레벨 lazy import 만 (App root MotionConfig 금지 — Layer 1 budget 룰).

## 신규/확장 라우트

| 탭 | 라우트 | 핵심 |
|---|---|---|
| Games 허브 | `/apex/games` | 5개 미니게임 카드 그리드 + LIVE 멀티플라이어 미리보기 |
| Dice | `/apex/games/dice` | Over/Under 슬라이더, 1.01x~9900x, provably-fair badge |
| Crash | `/apex/games/crash` | 실시간 곡선(canvas) + auto-cashout, mock 1Hz tick |
| Plinko | `/apex/games/plinko` | 16-row, 3 risk tiers, canvas ball drop |
| Mines | `/apex/games/mines` | 5×5, 1~24 mines, multiplier preview |
| Slots Lite | `/apex/games/slots` | 3-reel mock (기존 풀 슬롯은 `/casino/*` 그대로) |
| Community | `/apex/community` | 글로벌 채팅(기존 `chat_messages` 재사용) + 빅윈 자랑 + 친구 추천 카드 |

기존 ApexShell 하단탭 7개에 `Games` / `Community` 두 칸 추가 → **9-tab** (모바일은 5 visible + "More" sheet 로 그룹).

## 시각/모션 폴리시 (Stake 압도)
- `<ApexBackdrop />`: 풀스크린 캔버스 파티클 (60fps cap, prefers-reduced-motion 무시 안 함). ApexShell 에만 마운트.
- `<ParticleBurst />`: 게임 승리 시 canvas-confetti(이미 lazy 로딩 패턴 존재) + 1.2s 광채 링.
- 버튼: `apex-pulse` + `apex-glow-neon` 조합, hover 시 magenta 그라데이션 스윕.
- 카드: `apex-glass` 위에 1px conic-gradient 보더(animated 6s).
- 게임 결과 토스트: `notify.win()` 신규 헬퍼 (기존 `@/lib/notify` 4-tier 룰 준수).

## 데이터 변경 (마이그레이션 1건, 최소)

```text
apex_game_rolls(
  id, user_id, game_code,        -- 'dice'|'crash'|'plinko'|'mines'|'slots_lite'
  bet_phon, payout_phon, multiplier,
  server_seed_hash, client_seed, nonce,
  result_json, created_at
)
-- RLS: 본인 SELECT, INSERT 는 RPC 만
```

RPC: `apex_play_mock_game(game_code, bet_phon, params jsonb)` — `phon_balances` 차감 → mock RNG → payout 지급 → `apex_game_rolls` INSERT → `(payout, multiplier, server_seed_hash)` 반환. Idempotent key + 일일 cap(50회). 신규 출금 경로 없음.

`get_apex_recent_rolls(_limit int)` 공개 RPC — Community 탭 빅윈 피드용.

## 구현 위치
```
src/packages/apex/
  games/
    DiceGame.tsx, CrashGame.tsx, PlinkoGame.tsx, MinesGame.tsx, SlotsLiteGame.tsx
    useApexGame.ts            -- RPC 래퍼 + optimistic 잔액
    ProvablyFairBadge.tsx     -- @pkg/games/core/pf 재사용
  components/
    ApexBackdrop.tsx, ParticleBurst.tsx, NeonButton.tsx, GlowCard.tsx
src/pages/apex/
  Games.tsx (허브), Community.tsx, games/{Dice,Crash,Plinko,Mines,Slots}.tsx
```
`src/App.tsx` 에 lazy 라우트 7개 추가. `ApexShell.tsx` 의 TABS 배열 확장 + "More" 시트.

## QA 체크 (배포 전 필수)
1. `scripts/check-money-flow-freeze.mjs` — 8경로 git diff = 0.
2. `scripts/check-operator-isolation.mjs` — apex 청크가 admin 청크와 분리.
3. `scripts/bundle-budget.mjs` — `/apex/*` 페이지 chunk 각각 ≤ 90KB gz.
4. 머니플로 신규 RPC `apex_play_mock_game` 는 `MONEY_FLOW_GUARD` 화이트리스트 미등록 — 별도 KILLABLE 카테고리로만 분류.
5. Phonara 기존 페이지 모두 정상 렌더 (스모크).

## 비범위 (안 함)
- 실 Solana cNFT, 실 Sportsbook 연동, Rust gRPC RNG, Three.js, 신규 출금 경로, Phonara 기존 RPC 시그니처 변경, Imperial Duel/Casino slots 본문 수정, MotionConfig 글로벌 도입, 신규 디자인 토큰 추가.

## 작업 순서
1. DB 마이그레이션 (`apex_game_rolls` + 2 RPC + RLS).
2. `@pkg/apex/games` 5종 + `useApexGame` + ProvablyFairBadge.
3. `/apex/games` 허브 + 5개 게임 페이지 + 라우트.
4. `Community.tsx` (글로벌 채팅 + 빅윈 피드).
5. `ApexBackdrop` + `ParticleBurst` 마운트.
6. ApexShell 9-tab + "More" 시트.
7. QA 5종 통과 확인.
