---
name: Phase 6 Eternal Dominion
description: Phase 5 wiring 마무리(VRF v3 칩, Native cashout, CoachV2 Vault 마운트, Emperor 자동 음성, Phase5 KPI 카드) + 문서 + 운영 체크리스트
type: feature
---

## Phase 6 — Eternal Dominion: Final Polish & Launch Prep

### Wiring (UI only, money-flow git diff = 0)
- `src/packages/apex/health/OracleStatusCard.tsx` — `vrf_version`/`quorum_k`/`quorum_n`/`participating_nodes` 컬럼 표시, `VRF v3` + `{p}/{k}-of-{n} quorum` 칩, `apex-vrf-oracle-v3` 호출.
- `src/packages/apex/withdraw/CashoutPanel.tsx` + `useApexCashout.ts` — SOL/SUI/APT/CCTP_V2 네트워크 추가, NATIVE 배지 + p95 latency 힌트(SOL 4.8s, SUI 5.5s, APT 5.8s, CCTP_V2 18s).
- `src/pages/apex/Vault.tsx` — `<CoachV2Panel />` lazy + Suspense 마운트.
- `src/pages/apex/WinReels.tsx` — payout ≥ 1,000,000 PHON 도달 시 `window.dispatchEvent(new CustomEvent('phonara:bigwin', { detail:{ payout }}))` → `<EmperorVoicePlayer slot="ko/win_big" autoEvent="phonara:bigwin" autoThreshold={1_000_000} silent />` 가 8s cooldown + `localStorage.apex:voice:muted:v1` mute 존중하며 1회 재생.
- `src/pages/apex/Health.tsx` — Money Flow 탭에 `<Phase5KpiCard />` 추가 (Cup settler / VRF v3 p50·p99 / Coach / Cashout native / 8/8 PASS).

### Voice mute contract
사용자가 음소거하려면 `localStorage.setItem('apex:voice:muted:v1','1')`. 자동/수동 모두 차단.

### BigWin 이벤트 컨트랙트
- 이벤트명: `phonara:bigwin`
- detail: `{ payout: number }` (PHON 단위)
- 발화자: WinReels (현재) / 추후 BigWin overlay·CupChampion 화면도 동일 이벤트 사용 가능
- 수신자: `<EmperorVoicePlayer autoEvent="phonara:bigwin" autoThreshold={N} silent />`

### 문서
- `docs/apex/phase5-complete.md` — P5-A~E 요약, KPI 표, ASCII 아키텍처, 가드레일 증명, 신규 파일 목록.
- `docs/apex/house-edge.md` §6 — Tier S 5종 비교표 유지 (Phase 5에서 RTP 식 0 터치).

### 운영 체크리스트
1. 배포: 프론트는 Publish → Update. Edge functions(`apex-cup-settler`, `apex-vrf-oracle-v3`, `apex-coach-v2`)는 자동 배포됨.
2. 모니터링: `/admin/ops/imperial-command` (Phase 4 Command Center), `/admin/ops/region-health` (PR-O), `/apex/health` Money Flow 탭의 Phase 5 KPI 카드.
3. 첫 이벤트: `apex_admin_cup_create_season($1M PHON, 64-bracket, Drand auto-settle)`로 Apocalypse Cup Season 1 개설.

### 가드레일
- 머니플로 8경로 git diff = 0 (모든 wiring은 UI/표시 레이어만, RPC 시그니처 무변경).
- House Edge §6 수식 0 터치.
- Layer 1 gz ≤ 180KB 유지(모든 신규 컴포넌트 lazy + Suspense).
- 모든 realtime은 `@pkg/realtime` `use*Channel`만 사용.
- 신규 코드는 `@pkg/apex/*` + `src/pages/apex/*` 에만.
