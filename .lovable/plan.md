# Slice 8 Phase 2 — Imperial Duel: Spectator + Live Betting + Full Arena

## 범위 정리 (먼저 합의 필요)

이 프로젝트는 **Vite + React 프론트엔드 + Lovable Cloud(Supabase)** 스택입니다. 요청에 포함된 다음 항목들은 **이 프로젝트에서 구현 불가능**하므로 Phase 2 범위에서 제외하거나, 별도 인프라 트랙(`phonara-unicorn/` ECS 스캐폴드)으로 분리해야 합니다:

- Consul Service Mesh / Envoy Sidecar / mTLS / Intentions / L7 Policy
- Prometheus / Node Exporter / Alertmanager / Grafana
- cert-manager TLS 자동 갱신
- 자체 WebSocket 서버 (현재는 Supabase Realtime 사용 — 이미 PR-J 4-파티션 + PR-N 5축 region sharding 으로 캡슐화됨)
- Reanimated 3 Worklet (React Native 전용 — 웹에서는 framer-motion + CSS transform 로 대체)

이 인프라 항목들이 정말 필요하다면 별도 트랙(`phonara-unicorn/infra/terraform/`)에서 다뤄야 하며, 현재 user-facing 앱과는 독립적입니다. Phase 2 안에 끼워 넣으면 money-flow FREEZE / Operator Isolation / Bundle Budget 게이트가 전부 깨집니다.

**아래 본 플랜은 "프론트엔드에서 실제로 만들 수 있는 끝판왕 Imperial Duel Phase 2"** 에 집중합니다. 인프라/관측성/메시 트랙을 함께 진행할지 별도 명령으로 알려주세요.

---

## Phase 2 구현 범위 (프론트엔드 완결)

### 1. Spectator Mode (`/duel/arena/:roomId` 확장)
- 신규 URL 쿼리 `?as=spectator` — 결투에 참여하지 않고 관전만.
- `SpectatorDeck` 컴포넌트: 양측 군중 사이드바, 좌/우 응원 비율 게이지, 실시간 입장 토스트(가짜 닉네임 마스킹).
- 좌석 상태는 `useDuelRoom` 훅에 `spectatorMode: boolean` 추가, 베팅 패널/결투 시작 버튼 비활성.

### 2. Real-time Betting Panel (시뮬레이션, money-flow 무관)
- 신규 `BettingPanel` (오른쪽 하단 또는 모바일 bottom sheet) — Left/Right 선택 + 베팅 금액 슬라이더(데모 PHON, 실제 잔액 미차감).
- `useOddsEngine` 훅: 양측 베팅 풀 비율을 0.5s 간격으로 시뮬레이션 업데이트, 배당률은 `(totalPool / sideStake) * 0.95 (수수료)` 공식.
- 라운드 종료 시 가상 정산 토스트만 표시(잔액 변경 0, FREEZE 보호).
- 신규 `@pkg/duel/engine/odds.ts` + `@pkg/duel/hooks/useOddsEngine.ts`.

### 3. Live Sync (Supabase Realtime wrapper 재사용)
- `useGameChannel({ key: "duel:room:" + roomId })` 로 다른 탭/사용자 간 베팅 풀 broadcast (presence + broadcast 이벤트만, DB 쓰기 없음).
- Heartbeat: 기존 `@pkg/realtime/heartbeat.ts` 자동 적용.
- 재연결: `useRealtimeChannel` 내장 로직 사용. 신규 WS 서버 미구축.

### 4. Full Arena Cinematic Polish
- `ThroneStage` v2: 다층 글로우 (radial + sweep + inner highlight), Crown 입자 lazy import (`canvas-confetti` 기존 의존성 재사용).
- `RewardTierBanner`: Base→Surge→Crown→Empyrean→Divine 5단계 시네마틱 헤드라인 + tier별 색상 토큰.
- Near-miss 시 0.4s 슬로우모션 + 화면 진동(`transform: scale + translateY`).
- Mobile gesture: `react-use-gesture` 미사용 — 순수 CSS `touch-action` + `pointer-events` 로 thumb-zone 베팅 슬라이더.

### 5. FOMO Layering
- 기존 `useFomoOracle` 에 `spectatorPressure` 추가 (관중 수 + 베팅 풀 격차 → personalScore 가산).
- `FomoFloatingOracle` 에 "지금 N명이 폐하의 결투를 지켜보고 있습니다" 라이브 카피.

### 6. 검증 오라클 4-Tab 확장
- 베팅 라운드용 5th tab "Betting Audit" — 라운드별 베팅 풀/정산 비율을 HMAC 시드와 묶어 표시 (시뮬레이션 데이터, 검증 가능).

---

## 신규/수정 파일 (예상)

```text
src/packages/duel/engine/odds.ts                 NEW
src/packages/duel/hooks/useOddsEngine.ts         NEW
src/packages/duel/hooks/useSpectatorSync.ts      NEW   (useGameChannel wrapper)
src/packages/duel/components/arena/BettingPanel.tsx       NEW
src/packages/duel/components/arena/SpectatorDeck.tsx      NEW
src/packages/duel/components/arena/RewardTierBanner.tsx   NEW
src/packages/duel/components/arena/ThroneStage.tsx        EDIT (v2 폴리시)
src/packages/duel/components/oracle/VerificationOracleModal.tsx  EDIT (5th tab)
src/packages/duel/hooks/useDuelRoom.ts            EDIT (spectatorMode)
src/packages/duel/hooks/useFomoOracle.ts          EDIT (spectatorPressure)
src/pages/ImperialDuelArena.tsx                   EDIT (panel 마운트 + spectator 분기)
src/packages/duel/index.ts                        EDIT (re-export)
```

money-flow FREEZE 8경로 / Operator chunk / Bundle budget(180KB index) / Phase D/F push / 신규 RPC / 신규 edge function = **diff 0**.

---

## 톤
- "옥좌에 베팅을 올리소서", "폐하의 진영에 N명이 합류했습니다", "황실이 끓어오릅니다 — 배당이 폭발합니다" 등 Warm King.

---

## 작업 순서
1. `odds.ts` + `useOddsEngine` (시뮬레이션 엔진)
2. `useSpectatorSync` (useGameChannel broadcast/presence)
3. `BettingPanel` + `SpectatorDeck`
4. `RewardTierBanner` + ThroneStage v2 폴리시
5. Arena 페이지 통합 (spectator 분기)
6. VerificationOracle 5th tab
7. Mobile 390 / Desktop 1440 QA + bundle budget 확인

---

## 확인 필요 사항

1. 위 인프라 항목(Consul/Envoy/Prometheus/cert-manager/자체 WS 서버) **별도 인프라 트랙으로 분리**에 동의하십니까? (이 앱 안에선 구현 불가)
2. 베팅은 **시뮬레이션(잔액 변동 0)** 으로 유지합니까, 아니면 실제 PHON 차감을 원하시면 별도 RPC + RLS + money-flow 정책 작업이 필요합니다 (이 경우 FREEZE diff 0 약속과 충돌).
