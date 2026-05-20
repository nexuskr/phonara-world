# Phase 5 — Ultimate Endgame

5개 슬라이스(P5-A ~ P5-E)로 ApexForge를 진짜 지구상 유일무이한 베팅 플랫폼으로 마감. 본 플랜은 **P5-A Tier S+ Expansion**을 이번 턴 1단계 압살 범위로 잡고, B/C/D/E는 후속 턴 골격을 명시한다.

## P5-A — Tier S+ Expansion (이번 턴 압살 대상)

신규 게임 5종 추가. 각 게임은 lazy chunk + HybridRenderer(WebGPU/WASM/CPU) + VRF v2.5(Drand+Ed25519) attestation 자동 호출.

### 신규 게임
1. **Crash Multi-Cashout** — 단일 라운드에서 partial cashout 3-step (33% / 66% / 100% 슬라이더). `apex_play_mock_game(game_code='crash_v2_mc')`에 client_partial 메타만 추가. 머니플로 본문 무변경.
2. **Hashdice** — 서버 시드 + client seed + nonce → SHA-256 → 0~9999 매핑. Over/Under 베팅.
3. **Tower** — 8층 × 4칸 중 1개가 안전. 라운드 시작 시 8 row 전부 미리 VRF로 결정 (verifier에 노출).
4. **Dragon Tiger** — 2-card 단순 비교. 베팅 3종(Dragon/Tiger/Tie) + 사이드 betting(Big/Small).
5. **Provably-Fair Roulette V2** — 0/00 더블제로 + 동시 칩 ≥ 10. 결과 wheel 회전 애니메이션은 WASM-SIMD 가속.

### 디렉터리
```text
src/packages/apex/games/
  crash-multi/        # CrashMultiCashout.tsx + slider.tsx
  hashdice/           # Hashdice.tsx
  tower/              # Tower.tsx
  dragon-tiger/       # DragonTiger.tsx
  roulette-v2/        # RouletteV2.tsx
src/pages/apex/games/
  CrashMC.tsx Hashdice.tsx Tower.tsx DragonTiger.tsx RouletteV2.tsx
supabase/functions/
  apex-game-catalog/  # 신규 게임 메타 + RTP/house-edge 노출 (read-only)
docs/apex/
  house-edge.md       # §6에 5종 추가 (수식 0 터치, 표만 확장)
```

### 라우팅
```text
/apex/games/crash-mc
/apex/games/hashdice
/apex/games/tower
/apex/games/dragon-tiger
/apex/games/roulette-v2
```
ApexShell 라우트 + Games 카탈로그 페이지에 카드 5개 추가(이미지 0, CSS gradient).

### 머니플로 / 가드레일
- 신규 게임은 모두 기존 `apex_play_mock_game` RPC 재사용. **새 RPC 0개**.
- house-edge §6 수식 무변경. 신규 게임 RTP는 메타데이터 카탈로그에만 기재.
- 각 게임 페이지 wrapper에서 `useAttestOnSettle({ game, roundRef })` 호출 → VRF 자동 트레이스.
- Chunk 예산: 각 게임 ≤ 80KB gz (vite manualChunks `apex-game-*`).
- Layer 1 영향 0 (전부 lazy import).
- realtime 신규 채널 0. `useGameChannel`만 사용.

### Verifier 확장
- `/apex/verify/:roundId`에 게임별 결과 재현 로직 추가 (5종). Drand round + composed_seed → 결정값.
- `src/packages/apex/lib/fair/` 에 게임별 deterministic decoder export 5개.

### 실측 지표 목표
- 각 게임 첫 진입 LCP ≤ 1.4s (4G mid-tier)
- 각 게임 chunk gz ≤ 80KB
- 60s 벤치 60fps avg / p1 ≥ 50fps
- Money-flow freeze 8/8 PASS

## P5-B — Community Layer (다음 턴)
- `apex_chat_rooms` + `apex_chat_messages` (`drand_round` stamp 필수, admin RLS)
- `apex_squad_rooms` (3인 팀) + `apex_squad_mirrors` (친구 베팅 미러)
- `@pkg/apex/community/` (ChatRoom / SquadRoom / MirrorToggle)
- Tournament 룸 = Race v2 (`apex_tournaments` 테이블)
- Realtime: `useChatChannel('apex:room:<id>')`

## P5-C — Apocalypse Cup (다음 턴)
- `apex_cup_seasons` + `apex_cup_brackets` (round_id, drand_round)
- Edge: `apex-cup-settler` (cron `0 0 1 * *` 월 1일 KST)
- `@pkg/apex/events/CupBracket.tsx` + `CupLeaderboard.tsx` + `CupPrizePool.tsx`
- $1M PHON 풀은 treasury split 1% 누적 (수식 무변경, 1% 슬리브 신설)

## P5-D — VRF v3 Threshold (다음 턴)
- tBLS 5-of-9 노드: Cloudflare Workers ×3, AWS Lambda ×3, GCP Cloud Run ×3
- `apex-vrf-oracle-v3` Edge — 5개 partial signature aggregator
- `APEX_VRF_TBLS_*` secrets 9세트
- Fallback chain: tBLS → Ed25519(v2.5) → Ephemeral
- Health Dock OracleStatusCard에 노드 5/9 quorum 칩

## P5-E — Cross-Chain Liquidity + AI Coach v2 (다음 턴)
- SOL / SUI / APT 입출금 라우트 + CCTP v2 native USDC bridging
- `apex-cashout-processor` 체인 매핑 확장
- AI Coach v2: `apex-ai-coach` Edge (Gemini 2.5 Flash) + Tier S 5종 실시간 추천
- 손실 보호 자동 트리거 ≥ 손실 1k PHON / 1h
- ElevenLabs 황제 보이스(ko/en) 사전 녹음 12개 → R2 호스팅

## 보고 흐름
P5-A 슬라이스 완료 후 정해진 양식:
```text
✅ P5-A Tier S+ Expansion 지구상 1개뿐인 최고사양 완료
- 변경 파일 목록
- git diff 요약 (머니플로 diff=0)
- 실측 지표 (chunk gz / LCP / FPS / 8/8 freeze)
- 다음 슬라이스 계획 (P5-B Community Layer)
```

마지막 P5-E 완료 시:
```text
✅ Phase 5 완전 압살 종료. ApexForge — 이제 진짜 지구상 유일무이한 베팅 플랫폼의 왕좌를 차지했다.
```
