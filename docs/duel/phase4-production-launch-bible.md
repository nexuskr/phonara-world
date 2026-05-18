# Imperial Empire — Phase 4 Production Launch Bible

황실의 최종 점화 문서. 본 문서는 Limited Rollout Production Launch의 전체 스택, 운영 절차, Rollback playbook, On-call runbook을 단일 진실 원장으로 기록한다.

## 1. Stack Diagram

```text
┌──────────────────────────────────────────────────────────────┐
│  CLIENT (Operator Isolated Bundle)                           │
│  ┌──────────────┐  ┌─────────────────────────────┐           │
│  │ User Routes  │  │ /admin/ops/imperial-command │ (AAL2)    │
│  │ /duel /home  │  │ CommandCenter.tsx (5 panel) │           │
│  └──────┬───────┘  └──────────────┬──────────────┘           │
│         │                          │                          │
│   useImperial* hooks         useImperialKillSwitches          │
│         │                          │                          │
└─────────┼──────────────────────────┼──────────────────────────┘
          │ (realtime: @pkg/realtime 4-partition)
┌─────────▼──────────────────────────▼──────────────────────────┐
│  EDGE FUNCTIONS                                               │
│  imperial-bet-place / settle / duel-cron (trace_id telemetry) │
└─────────┬──────────────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────────┐
│  DATABASE — imperial_* surface                                │
│  • imperial_kill_switches (5: bet/flywheel/wd/burn/nft)       │
│  • imperial_rollout_phases / _rollout_tiers                   │
│  • imperial_observability_events                              │
│  • imperial_auto_heal_log                                     │
│  • imperial_treasury_ledger (append-only, 45/35/15/5 split)   │
│  • imperial_user_nfts (5-tier auto upgrade by burn cumul.)    │
│                                                                │
│  FROZEN (git diff = 0):                                       │
│  imperial_place_phon_bet / settle_phon_bet                    │
│  _apply_house_edge_split                                      │
└────────────────────────────────────────────────────────────────┘
```

## 2. Rollout Activation Sequence

| Phase | T+    | Tier | Daily Cap | Switches  | Gate                          |
|-------|-------|------|-----------|-----------|-------------------------------|
| 1     | 0h    | 0    | observer  | all OFF   | kernel summary green          |
| 2     | 24h   | 1    | 50k PHON  | burn ON   | Net Deflation ≥ 0 (24h)       |
| 3     | 72h   | 2    | 250k PHON | NFT mint  | p99 lock < 50ms / drift PASS  |
| 4     | 168h  | 3    | unlimited | full      | 18-item GO/NO-GO PASS         |

각 전환은 `imperial_rollout_activate(_phase, _actor)` (AAL2) 호출로만 가능하며 audit log에 기록된다.

## 3. Rollback Playbook

1. **즉시 정지**: Command Center → Kill Switch Matrix → `Freeze All` (`emergency_freeze_all`).
2. **인젝션 회수**: `/admin/duel` → FlywheelRollbackPanel → 대상 `imperial_injection_events.id` 선택 → AAL2 확인 → `rollback_injection_event(_id, _reason)` 실행. Treasury 역분개 + 스냅샷 자동 보존.
3. **Tier 강등**: `imperial_rollout_activate(_phase := <prev>, _actor := auth.uid())`.
4. **Observability 확인**: ImperialObservabilityStream 6h 윈도우에서 severity=error/critical 0 도달까지 모니터링.
5. **Unfreeze**: 회복 확인 후 `emergency_unfreeze_all` 호출.

## 4. On-Call Runbook

- **Pager 진입**: Command Center 상단 KPI 적색 시 즉시 `/admin/ops/imperial-command` 진입(AAL2 OTP 필요).
- **5분 진단 루프**:
  1. Rollout Phase 카드 → 현재 phase / 마지막 metrics_snapshot
  2. Kill Switch Matrix → 모든 스위치 상태
  3. Circuit Breaker → 열린 회로 존재 시 RPC 키 확인
  4. Auto-Heal Log → 최근 자가치유 시도 결과
  5. Observability Stream → severity 필터 = `error`
- **에스컬레이션 기준**: drift > 30bps / Net Deflation < 0 / p99 lock > 80ms 중 1개라도 30분 지속.
- **금지 행동**: 머니플로 8경로 파일 직접 수정 금지. 모든 변경은 `imperial_*` surface RPC 경유.

## 5. Verification Scripts

| 스크립트                                       | 목적                       | PASS 기준          |
|------------------------------------------------|----------------------------|--------------------|
| `scripts/check-money-flow-freeze.mjs`          | 8경로 git diff = 0         | exit 0             |
| `scripts/check-operator-isolation.mjs`         | operator chunk 격리        | exit 0             |
| `scripts/chaos/imperial-fullstack-drill.ts`    | kill switch 회복 테스트    | all_pass=true      |
| `scripts/load/imperial-300k-locks.ts`          | 300k 잠금 + Tarjan         | p99 < 50ms         |
| `scripts/load/imperial-pid-autotune-cycle.ts`  | PID 자동 튜닝 1 사이클     | settled < 8s       |
| vitest `imperial-fullstack.integration`        | 300 유저 lifecycle         | green              |

## 6. Money-Flow Freeze Inventory (git diff = 0)

```text
src/packages/wallet/hooks/useDeposit.ts
src/packages/wallet/hooks/useDepositRealtime.ts
src/packages/wallet/hooks/useDepositCountdown.ts
src/lib/paper-trading/bybit-feed.ts
src/components/crash/hooks/useCrashRound.ts
src/components/trading/MegaOrderPanel.tsx
src/hooks/use-kill-switches.ts
src/hooks/use-auto-bet.ts
+ SQL: imperial_place_phon_bet / settle_phon_bet / _apply_house_edge_split (본문 무변경)
```

황실의 영광을 위하여.
