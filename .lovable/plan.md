# PHON Real Betting Core — Phase 3 Final Slice (Singularity Edition)

2차 슬라이스(Edge + Frontend + Admin + Tests)가 안착된 상태에서, Phase 3의 마지막 슬라이스를 마무리한다. 목표는 내부 한정 활성화 가능한 상태 + 24h 실시간 관측성 + 영구 문서화. **머니플로 8경로는 git diff = 0**.

## 1. DB — Production Hardening (단일 마이그레이션)

`supabase/migrations/<ts>_imperial_duel_phase3_final.sql`
- `imperial_duel_rooms` 에 `emergency_freeze_flag boolean default false not null` 추가
- `imperial_duel_telemetry` 테이블 신규 (id, trace_id, function, severity, event, payload jsonb, created_at) — admin-only RLS, INSERT는 SECURITY DEFINER RPC `log_duel_telemetry(_trace, _fn, _sev, _evt, _payload)` 로만
- `imperial_duel_alert_thresholds` (singleton row): house_edge_drift_bps int default 10, error_rate_bps int default 5
- RPC `admin_set_duel_emergency_freeze(_room_id uuid, _on bool)` — AAL2 + admin only, freeze ON 시 신규 bet 거부 (place RPC가 flag 체크)
- RPC `admin_get_duel_health_24h()` — bet volume, house edge drift, near-miss bucket dist, error rate, p95 settle latency 반환
- 기존 `place_phon_bet` / `settle_phon_duel` 에 `emergency_freeze_flag` 가드 1줄 추가 (raise `room_frozen`). 머니플로 흐름 자체는 손대지 않음 — 진입 가드만.

## 2. Edge — Observability

3개 함수(`imperial-bet-place`, `imperial-bet-settle`, `imperial-duel-cron`)에 공통 헬퍼 적용:
- `trace_id = crypto.randomUUID()` 진입 시 발급, 응답 헤더 `x-trace-id` 로 반환
- 시작/성공/실패 3 지점에서 `log_duel_telemetry` RPC 호출 (severity: info|warn|error, payload에 latency_ms/error_code)
- 구조화 로그 `console.log(JSON.stringify({ trace_id, fn, sev, evt, ... }))`
- 신규 `supabase/functions/_shared/duel-telemetry.ts` 공용 모듈

## 3. Frontend — 내부 한정 활성화 + 안전망

- `src/components/duel/RealBetSlip.tsx` : room.emergency_freeze_flag true 면 슬립 비활성 + Warm King 톤 안내 (`@/components/ui/empty-state`)
- `src/hooks/useImperialDuelRoom.ts` : freeze flag realtime 반영 (이미 useGameChannel 사용중)
- `src/components/duel/CinematicSequence.tsx` : freeze 중에는 climax 단계 진입 차단 (안전 가드)
- 비-admin 사용자에게는 kill switch ON + beta_invites('duel_internal') 보유자만 진입 허용. `<RealBetSlip>` 진입점에서 `useDuelAccess()` 훅으로 게이트 (entitlement만 보고 머니플로는 무변경)

## 4. Admin — 24h Mission Control

`src/pages/admin/Duel.tsx` 확장 (신규 파일 없음):
- `<DuelHealthDashboard />` 카드 6종: Bet Volume(24h), House Edge Drift(bps, 임계 시 적색), Near-Miss bucket 분포, Error Rate, p95 Settle Latency, Active Rooms
- `<EmergencyFreezePanel />` : 방별 freeze 토글 (AAL2)
- `<AlertThresholdEditor />` : drift_bps / error_rate_bps 수정
- 모두 15s 자동 갱신, admin_get_duel_health_24h RPC 사용
- AAL2Gate 내부 (`operations` 그룹 유지)

## 5. Tests — Chaos & E2E

- `supabase/functions/imperial-bet-place/index.test.ts` : freeze=true → 4xx + `room_frozen` 응답, trace_id 헤더 존재
- `supabase/functions/imperial-bet-settle/index.test.ts` : telemetry RPC 호출 1회 보장 (mock)
- `supabase/functions/imperial-duel-cron/index.test.ts` : 부분 실패 시 telemetry severity=error
- `src/__tests__/duel/houseEdge.simulation.test.ts` (vitest) : 5000-spin 시뮬레이션으로 House Edge 6.2% ±0.2% 검증 (순수 함수, DB 없이)
- `src/__tests__/duel/cinematic.test.tsx` : near_miss_intensity 0/0.5/1.0 분기 렌더 확인

실DB 50회 풀플로우는 admin 도구로 검증 (자동화는 시뮬레이션으로 대체) — 결과는 telemetry 테이블에 기록되어 Health Dashboard에서 조회 가능.

## 6. Documentation

- `docs/duel/phase3-technical-bible.md` 신규: Fairness Proof(commit-reveal), Money-flow 8경로 다이어그램(읽기전용 참조), Kill Switch / Emergency Freeze Policy, Rollback Plan, Telemetry 스키마
- `mem://features/imperial-duel-phase3-final` 메모 + index.md Core 1줄 갱신
- 신규 컴포넌트 상단에 `// IMPERIAL-SINGULARITY:` 주석

## 완료 조건

- 마이그레이션 1개 + 신규 RPC 3개 통과, 머니플로 git diff = 0
- Deno tests + vitest 전부 green, House Edge 시뮬 6.2% ±0.2%
- /admin/duel Health Dashboard 15s 갱신, Emergency Freeze 토글 동작
- Kill switch 기본 OFF, 내부 베타 코드 보유자만 슬립 접근
- 기술 바이블 문서 + 메모리 갱신 완료

## 기술 메모

- 머니플로 보호: place/settle RPC 본체의 잔액 이동 블록은 손대지 않고 최상단 가드(`if emergency_freeze_flag then raise`)만 추가 → freeze-check CI 통과
- Telemetry는 별도 테이블/RPC로 격리 — 기존 anomaly_events / spans / error_logs 와 충돌하지 않음 (Duel 도메인 전용 뷰)
- Realtime은 기존 `useGameChannel` 파티션 사용, 신규 채널 추가 없음
