# Imperial Empire Phase 4 — 18-item GO/NO-GO Checklist

각 phase 진입 직전 본 체크리스트의 18항목이 모두 GO일 때만 `imperial_rollout_activate` 를 호출한다.

| # | 영역 | 항목 | PASS 기준 | 확인 위치 |
|---|------|------|-----------|-----------|
| 1 | Money-Flow | 8경로 git diff = 0 | freeze 스크립트 exit 0 | `scripts/check-money-flow-freeze.mjs` |
| 2 | Money-Flow | `imperial_place_phon_bet` 본문 무변경 | git log 확인 | repo |
| 3 | Isolation | Operator chunk 격리 | isolation 스크립트 exit 0 | `scripts/check-operator-isolation.mjs` |
| 4 | Kernel | `imperial_get_kernel_summary()` 정상 | error_rate < 0.5% | Command Center |
| 5 | Flywheel | `admin_get_flywheel_health(24)` Net Deflation ≥ 0 | snapshot 확인 | /admin/duel |
| 6 | Burn | `apply_token_burn` idempotency unique 가동 | 중복 호출 1건만 적재 | DB 검증 |
| 7 | NFT | 5-tier 자동 업그레이드 트리거 동작 | 누적 burn 임계 통과 시 tier+1 | `imperial_user_nfts` |
| 8 | Oracle | divergence < 30bps & quorum ≥ 3 | OracleFortress green | /admin/ops |
| 9 | Rollout Tier | 현재 tier ≤ 목표 phase tier | rollout_phases.last | Command Center |
| 10 | Kill Switch | 모든 5 스위치 의도 상태 일치 | 매트릭스 점검 | Command Center |
| 11 | Circuit Breaker | open 회로 0 | inspect() 결과 | ImperialCircuitPanel |
| 12 | Auto-Heal | 최근 1h critical 자가치유 0 | `imperial_get_auto_heal_log(1)` | AutoHealPanel |
| 13 | Observability | severity=error 30m 이내 0 | stream 필터 | ObservabilityStream |
| 14 | Integration | vitest fullstack 통과 | green | CI |
| 15 | Load | p99 lock acquire < 50ms | `imperial.loadtest.locks.*.json` | reports/ |
| 16 | PID | 자동 튜닝 정착 < 8s, overshoot < 30% | `imperial.loadtest.pid.*.json` | reports/ |
| 17 | Chaos | 5 시나리오 all_pass | `imperial.chaos.*.json` | reports/ |
| 18 | Rollback Drill | 최근 7일 내 1회 성공 기록 | audit 확인 | `imperial_injection_events` |

서명: ____________ (Operator AAL2 사용자명, KST 일시)
