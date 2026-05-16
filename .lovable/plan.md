# PR-H rpc.surface 시나리오 레이스 수정

## 현재 결과
- `activeRPC: 2`
- `hiddenRPC: 1` — `platform_kill_switches` 1회
- `idleRPC: 2` — `get_whale_strikes_24h`, `platform_kill_switches` 각 1회

## 재진단
앱 쪽 가드 자체보다는 **`rpc.surface.runScenario()`의 단계 전환 순서** 때문에 경계 시점 호출이 잘못 집계되고 있습니다.

1. **Hidden 1회**
   - hidden 단계 시작 시 `forcedMode = "hidden"`이 먼저 켜지고,
   - 그 직후 `document.hidden = true` / `visibilitychange`가 적용됩니다.
   - 이 아주 짧은 틈에서 60초 경계에 도달한 `platform_kill_switches` 폴링이 실행되면, 실제로는 “전환 경계 호출”인데 hidden 버킷으로 분류됩니다.

2. **Idle 2회**
   - idle 단계에서도 `forcedMode = "idle"`가 먼저 켜지고,
   - `__phonaraIdle.force(true)`로 governor pause가 걸리기 전 짧은 틈이 있습니다.
   - 같은 경계 구간에서 `get_whale_strikes_24h` / `platform_kill_switches`가 1회씩 실행되면 idle 버킷으로 잡힙니다.

3. **verdict 계산도 현재 왜곡됨**
   - baseline 수집은 foreground만 채우므로 `baseline.hidden` / `baseline.idle`은 구조적으로 0입니다.
   - 그런데 `diffReport()`는 hidden/idle을 각각 이 0과 비교합니다.
   - 따라서 나중에 count가 0이 되더라도 PASS 판정이 안정적으로 나오지 않습니다.

## 변경안

### 1) `rpc.surface.runScenario()` 단계 전환을 원자적으로 정리
`src/packages/entropy/rpc.surface.ts`

- hidden 단계:
  1. 먼저 실제 런타임 상태를 hidden으로 전환
  2. visibility listener / catch-up이 한 프레임 정리되도록 settle
  3. 그 다음 카운터 reset
  4. 마지막에 hidden 측정 시작

- idle 단계:
  1. 먼저 visible 복귀에 따른 catch-up을 측정 바깥에서 정리
  2. `__phonaraIdle.force(true)`로 governor pause를 먼저 확정
  3. settle 후 reset
  4. 마지막에 idle 측정 시작

즉, **분류 모드 진입보다 실제 pause/visibility 상태를 먼저 확정**해서 경계 호출이 phase bucket에 섞이지 않게 만듭니다.

### 2) phase boundary flush helper 추가
`src/packages/entropy/rpc.surface.ts`

- 예: 다음 tick / animation frame까지 기다리는 `flushPhaseBoundary()` 추가
- 목적:
  - visibilitychange 리스너 실행 완료
  - `setVisibleInterval`의 catch-up/onVisible 처리 소진
  - 경계 직전 타이머와 측정 구간을 분리

### 3) verdict 기준 수정
`src/packages/entropy/rpc.surface.ts`

- hidden/idle 비교 기준을 `baseline.foreground.count`로 변경
- 기대 의미:
  - active 대비 hidden은 90% 이상 감소
  - active 대비 idle은 70% 이상 감소

이렇게 해야 현재 시나리오 구조와 수치 해석이 일치합니다.

## 변경 파일
- `src/packages/entropy/rpc.surface.ts`

## 기대 결과
- 경계 레이스 제거 후:
  - `hiddenRPC = 0`
  - `idleRPC = 0`
- verdict 계산 수정 후:
  - `verdict.hidden === "PASS"`
  - `verdict.idle === "PASS"`

## 검증
1. `bun run build`
2. DEV 콘솔에서 `__phonaraSurface.runScenario()` 실행
3. 확인 항목
   - hidden bucket = 0
   - idle bucket = 0
   - verdict hidden/idle 모두 PASS
4. 필요 시 결과를 `reports/rpc.surface.2026-05-16.json`에 반영
