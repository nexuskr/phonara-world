# Imperial Empire Phase 4 — Follow-up Slice (Final Completion)

Phase 4 Core Infrastructure(Circuit Breaker v2, Observability, Auto-Heal, Rollout Activate, Command Center)가 점화 완료된 상태에서 남은 Follow-up Slice를 마무리하여 Limited Rollout Production Launch의 Final Go/No-Go Package를 산출한다.

불변 원칙: Money-flow 8경로 git diff = 0 / Operator Isolation PASS / `imperial_` prefix / Atomic·Idempotent·Observable·Rollbackable.

---

## 1. Full Stack Integration & Chaos Test

- `src/__tests__/integration/imperial-fullstack.integration.test.ts`
  - 300 가상 동시 사용자 시뮬레이션 (in-memory): place → settle → burn → rollback drill
  - Hybrid SCC + Tarjan 사이클 검출(in-memory wait-for graph), 사이클 0 단언
  - PID 컨트롤러 setpoint 추종 검증 (정착시간 < 5s, overshoot < 15%)
  - vitest 환경 only, 네트워크/DB 호출 0 (money-flow 무관)
- `scripts/chaos/imperial-fullstack-drill.ts`
  - tsx 실행 가능, 환경변수 없으면 dry-run 보고
  - kill switch 강제 ON → reject 확인 → unfreeze 후 회복시간 기록
  - 결과 → `reports/imperial.chaos.<date>.json`

## 2. Comprehensive Load Test

- `scripts/load/imperial-300k-locks.ts`
  - 300k 분산 잠금 시뮬레이션, Tarjan O(V+E), p50/p95/p99 lock acquire, deadlock 검출률
  - 결과 → `reports/imperial.loadtest.locks.<date>.json`
- `scripts/load/imperial-pid-autotune-cycle.ts`
  - Relay Feedback + Ziegler-Nichols open loop full cycle, Ku/Tu/Kp/Ti/Td 출력
  - 결과 → `reports/imperial.loadtest.pid.<date>.json`

## 3. Final Documentation & Archive

- `docs/duel/phase4-production-launch-bible.md` — 스택 다이어그램(ASCII), Rollout 시나리오, Rollback playbook, On-call runbook
- `docs/duel/phase4-go-nogo-checklist.md` — 18-item GO/NO-GO 체크리스트
- `mem://features/phase-4-limited-rollout` 신규 메모
- `mem://index.md` Core 한 줄 추가

## 4. Final Verification & Go/No-Go Package

- `check-money-flow-freeze.mjs` / `check-operator-isolation.mjs` 재실행 보고
- `imperial_get_kernel_summary()` / `admin_get_flywheel_health(24)` Net Deflation ≥ 0 확인
- Integration + Load test green, p99 lock acquire < 50ms
- Rollback drill 1회 성공 기록
- Final Go/No-Go Package(체크리스트 + 리포트 경로 + 다음 단계) 채팅 출력

---

## Technical Details

신규 파일(모두 money-flow와 무관):

```text
src/__tests__/integration/imperial-fullstack.integration.test.ts
scripts/chaos/imperial-fullstack-drill.ts
scripts/load/imperial-300k-locks.ts
scripts/load/imperial-pid-autotune-cycle.ts
docs/duel/phase4-production-launch-bible.md
docs/duel/phase4-go-nogo-checklist.md
mem://features/phase-4-limited-rollout
```

편집 파일: `mem://index.md` (Core 한 줄 추가)만 수정. 8경로 FREEZE 파일 및 `imperial_place_phon_bet` / `settle_phon_bet` / `_apply_house_edge_split` 일체 무수정.

Verification Gates:
1. money-flow freeze PASS
2. operator isolation PASS
3. kernel summary 정상
4. flywheel Net Deflation ≥ 0
5. integration test green
6. load test p99 < 50ms
7. rollback drill 성공
