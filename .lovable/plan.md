# Phase 3.5 — Deflationary Flywheel Singularity

PHON 경제의 심장(Burn / Treasury / Liquidity / Volatility)을 단일 원자 루프로 점화한다.
Money-flow 8경로는 git diff = 0, Kill Switch 기본 OFF, Operator Isolation 유지.

## 1. DB — Flywheel Core

신규 테이블 (모두 admin-only RLS + 본인 SELECT 없음):

- `imperial_treasury_ledger(id, ts, source, kind, phon_delta, balance_after, ref_id, meta jsonb)`
  - kind ∈ `burn | treasury | reward | liquidity | injection_out | injection_in`
- `imperial_emission_state(id=1 singleton, circulating_phon, target_phon, scale_factor, updated_at)`
- `imperial_volatility_window(bucket_start, vol_score numeric, tier text, sample_n int)`
  - tier ∈ `calm | warm | hot | surge | extreme`
- `imperial_injection_events(id, ts, trigger_vol_score, amount_in, amount_out, excess_return, reason)`
- `imperial_flywheel_params(key text pk, value jsonb, updated_by, updated_at)` — 튜닝 파라미터 핫리로드

신규 RPC (모두 SECURITY DEFINER, search_path 잠금):

- internal: `_apply_house_edge_split(_total_phon, _ref_id)` — 45/35/15/5 분기 + ledger insert (atomic)
- internal: `_recompute_emission_scale()` — circulating/target 비율로 scale_factor 갱신
- internal: `_recompute_volatility_tier()` — 최근 30분 베팅 분산 → tier
- public read: `get_flywheel_snapshot()` — 사용자 표시용 안전 지표
- admin: `admin_get_flywheel_health(_hours int)`
- admin: `admin_set_flywheel_param(_key, _value)`
- admin: `admin_force_injection(_amount, _reason)` (AAL2)

`platform_kill_switches`에 신규 키: `flywheel_burn`, `flywheel_injection`, `flywheel_emission_scale` (기본 OFF = 비활성).

## 2. 기존 RPC 통합 (머니플로 무수정 원칙)

`imperial_place_phon_bet` / `imperial_settle_phon_bet` 자체 SQL은 변경 금지.
대신 settle 직후 호출되는 기존 audit 트리거(이미 존재) 안에서 `_apply_house_edge_split` 만 추가 호출.
트리거 본문만 확장되며 money-flow 8경로 파일은 손대지 않는다.

Slippage는 RPC가 아니라 클라이언트 미러(`src/lib/flywheel.ts`)에서 계산 →
서버는 settle 시 실측 slippage를 ledger meta에 저장(검증용).

공식 (바이블):

```text
slippage = min(0.42, (bet / liquidity_pool)^1.75 * 1.85)
emission_scale = clamp(0.4, target/circulating, 1.6)
volatility_mult = {calm:1.00, warm:1.08, hot:1.18, surge:1.30, extreme:1.45}
injection_trigger = vol_tier in (surge, extreme) AND treasury > min_reserve
excess_return = max(0, post_injection_pool - pre_injection_pool*1.02)
```

## 3. Cron

- `*/1 * * * *` `_recompute_volatility_tier()`
- `*/5 * * * *` `_recompute_emission_scale()`
- `*/2 * * * *` `maybe_inject_liquidity()` (kill switch 체크 → trigger 시 `admin_force_injection` 내부판)

## 4. Edge / Frontend

Edge: 변경 없음. Telemetry helper(`_shared/duel-telemetry.ts`)에 `flywheel` 카테고리 이벤트 4종 추가.

Frontend (신규/수정):

- `src/lib/flywheel.ts` — 공식 미러 + 색상 시스템
- `src/hooks/use-flywheel-snapshot.ts` — `get_flywheel_snapshot` 30s SWR
- `src/components/duel/VolatilityGauge.tsx` — 5단계 게이지 (calm→extreme)
- `src/components/duel/SlippagePreview.tsx` — 베팅 입력 옆 예상 슬리피지 색상 표시
- `src/components/duel/TreasurySupportBadge.tsx` — Warm King 5메시지 회전
- `src/components/duel/RealBetSlip.tsx` — Slippage/Volatility 위젯 마운트 (UI only, 로직 불변)

Warm King 메시지 5종 (i18n key `flywheel.warmking.*`):
황실 지원 / 시장 가열 / 제국 안정 / 폭풍 경보 / 보상 강화.

## 5. Admin Mission Control

`src/pages/admin/Duel.tsx`에 신규 탭 "Flywheel" 추가, 컴포넌트:

- `<FlywheelHealthDashboard />` — Burn 24h, Treasury balance, Net deflation rate, Emission scale
- `<VolatilityHeatmap />` — 30분 버킷 × 24h
- `<SlippageEfficiencyPanel />` — 예측 vs 실측 분포
- `<InjectionHistoryTable />` — 최근 50건 + Force Injection 버튼 (AAL2)
- `<EmissionTrendChart />` — circulating/target 추이
- `<FlywheelParamEditor />` — 핫리로드 (AAL2)
- `<FlywheelKillSwitchPanel />` — 3개 신규 스위치

모두 `admin_get_flywheel_health` 15s 자동 갱신.

## 6. Tests

- `src/__tests__/flywheel/split.test.ts` — 45/35/15/5 합 = 100% (round-safe)
- `src/__tests__/flywheel/slippage.test.ts` — 경계값 + cap 42%
- `src/__tests__/flywheel/emission.clamp.test.ts` — 0.4..1.6
- `src/__tests__/flywheel/montecarlo.test.ts` — 5000-spin house edge 6.2% ±0.15%
- `supabase/functions/imperial-bet-settle/flywheel.test.ts` — telemetry 카테고리 발생 확인

## 7. Rollout

- 신규 kill switch 3개 모두 OFF 배포 → 내부 alpha만 ON
- 72h hyper-monitoring: telemetry KPI 6종 + manual audit
- 합격 기준: edge 6.2% ±0.15%, slippage 분포 정상, critical error 0

## 8. Docs / Memory

- `docs/duel/phase3.5-flywheel-bible.md` — 공식, ASCII 플로우, 튜닝, 롤백
- 신규 코드 헤더에 `// IMPERIAL-SINGULARITY v3.5:`
- `mem://imperial-vision/phon-deflationary-flywheel` + index Core 1줄 추가

## 9. Guard Rails (불변)

- money-flow 8경로 파일 git diff = 0 (check-money-flow-freeze.mjs PASS)
- 신규 realtime 채널 0 (기존 `useGameChannel`만 재사용)
- operator isolation: 모든 admin 컴포넌트는 `src/components/admin/` 아래 → operator 청크로 격리
- Kill Switch 기본 OFF, Emergency Freeze는 Phase 3에서 만든 `emergency_freeze_flag` 재사용

## 10. 기술 세부 (요약)

```text
                +-------------------+
   bet settle ->|  audit trigger    |
                |  (기존 파일)       |
                +---------+---------+
                          | call
                          v
                +-------------------+
                | _apply_house_edge |--45%--> BURN ledger
                |   _split()        |--35%--> TREASURY ledger
                |                   |--15%--> REWARD ledger
                |                   |-- 5%--> LIQUIDITY ledger
                +---------+---------+
                          |
        cron 2m           v
   maybe_inject_liquidity()  reads volatility_tier
                          |
                          v
                injection_events + ledger(injection_in/out)
```

소요: DB ~250줄, Edge 변경 없음, Frontend ~700줄, Admin ~600줄, Tests ~400줄, Docs ~300줄.
