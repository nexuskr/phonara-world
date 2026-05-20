# Phase 6 — Eternal Dominion: Final Polish & Launch Prep

Phase 5의 모든 시스템을 사용자 화면에 실제로 노출(wiring)하고, 성능·문서·운영 체크리스트로 마무리한다. 머니플로 8경로는 git diff = 0 유지.

## 1. Wiring & Integration (UI only, no money-flow touch)

- `OracleStatusCard` — VRF v3 배지 + `5-of-9 quorum` 칩 + 참여 노드 수 표시 (apex_randomness_requests 최신 row의 `vrf_version`/`quorum_n`/`quorum_k`/`participating_nodes`).
- `CashoutPanel` — `apex_cashout_chains` 기반 SOL / SUI / APT / CCTP_V2 셀렉터, "Native" 배지(체인 네이티브 자산일 때), 라우팅 latency 힌트.
- `Vault` 페이지 — `<CoachV2Panel />` 사이드 마운트 (lazy).
- `WinReels` / `BigWin` — payout ≥ threshold 시 `<EmperorVoicePlayer slot="ko/win_big" />` 자동 1회 트리거 (cooldown 8s, 사용자 mute 존중).
- `HealthDock` — Phase 5 KPI 카드 1장: Cup settler latency, VRF v3 p50/p99, AI Coach 응답시간, Cashout 체인 헬스, money-flow 8/8 상태.

## 2. 성능 & 안정성 검증

- size-limit / bundle-budget.mjs / depcruise / eslint / money-flow-freeze 전부 재실행 → 모두 green.
- `vite build` 실측: Layer 1 gz 크기, operator 청크 격리, lazy route 분리 확인.
- Preview에서 LCP / FPS / Suspense fallback 동작 실측 (browser perf profile).

## 3. 문서화

- `docs/apex/phase5-complete.md` 신규: P5-A~E 전체 요약, KPI 표, 가드레일 증명, 아키텍처 다이어그램(ASCII).
- `docs/apex/house-edge.md` §6 갱신: 모든 Tier S+ 게임(Cup, Duel, Reels, Crash, Plinko, VRF v3 게임 등) 최종 edge 표.

## 4. 메모리 업데이트

- `mem://features/phase-6-eternal-dominion` 신규: 본 단계의 와이어링 위치 + 운영 체크리스트.
- `mem://index.md` Memories 섹션에 1줄 추가.

## 5. 운영 준비 체크리스트 (보고에 포함)

- 배포: frontend Publish + edge functions 자동 배포 확인.
- 모니터링: `/admin/ops/imperial-command`, `/admin/ops/region-health`, Apocalypse Protocol 임계치 점검.
- 첫 이벤트: Apocalypse Cup Season 1 ($1M PHON) 생성/공지 절차.

## 기술 세부

- 신규 코드는 `@pkg/apex/*` + `src/pages/apex/*` 한정. 머니플로 8경로(`apex_place_bet_v2`, `_settle`, `_apply_house_edge_split`, `imperial_place_phon_bet`, `_settle`, `request_withdrawal`, `credit_crypto_deposit`, `apply_token_burn`) 본문 무변경.
- 모든 realtime은 `@pkg/realtime`의 `use*Channel` 래퍼.
- 음성/코치 패널은 lazy + Suspense, Layer 1에 영향 없음.
- `EmperorVoicePlayer` 트리거는 클라이언트 이벤트(`phonara:bigwin`) 구독으로만 처리.

## 산출물 선언

작업 종료 시 정확히 출력:

```
✅ Phase 6 Eternal Dominion 완전 압살 종료.
✅ ApexForge — 지구상 1개뿐인 진짜 세계 1위 끝판왕 베팅 플랫폼 최종 완성.
```

이어서 변경 파일 요약, 최종 실측 지표, 운영 체크리스트 보고.
