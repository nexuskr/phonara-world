# PR-H 숨김/유휴 RPC 누수 재검증 및 잔여 경계 호출 봉쇄

## 현재 관찰
- 콘솔 결과는 여전히 `activeRPC: 2`, `hiddenRPC: 1`, `idleRPC: 2`
- 누수 RPC는 그대로 `platform_kill_switches` / `get_whale_strikes_24h`
- 추가로 현재 콘솔의 `rpc.surface.ts:217/218` 및 `deltaPct.hidden/idle = null`은 **지금 소스와 맞지 않습니다**

## 핵심 판단
이번 이슈는 두 층으로 봐야 합니다.

1. **프리뷰가 최신 번들을 아직 안 물고 있을 가능성**
   - 현재 소스 기준이면 `diffReport()`는 `baseline.foreground.count`를 기준으로 계산하므로 `deltaPct`가 `null`로 나오지 않아야 합니다.
   - 그런데 사용자 콘솔은 여전히 이전 번들의 라인 번호와 계산 결과를 보여주고 있습니다.
   - 즉, 먼저 **프리뷰/개발 서버가 최신 `rpc.surface.ts`를 실행 중인지 재동기화**가 필요합니다.

2. **최신 번들에서도 남을 수 있는 실제 경계 누수**
   - `use-kill-switches`는 interval 경로만 막혀 있고, `focus` 이벤트와 realtime callback은 같은 가드를 직접 거치지 않습니다.
   - `use-auth-live-data`의 whale RPC는 `setVisibleInterval`에만 의존하므로, 경계 직전 큐에 들어온 호출은 함수 내부에서 한 번 더 차단하지 못합니다.
   - 그래서 최신 번들에서도 드물게 hidden/idle bucket에 1회씩 섞일 여지가 남아 있습니다.

## 변경안

### 1) 프리뷰를 최신 번들로 재동기화
- 개발 서버/프리뷰를 새로 고쳐 현재 `src/packages/entropy/rpc.surface.ts`가 실제로 반영되었는지 먼저 확인
- 확인 기준:
  - `deltaPct.hidden`, `deltaPct.idle`가 더 이상 `null`이 아니어야 함
  - 콘솔 라인 번호가 현재 파일 구조와 맞아야 함

### 2) `use-kill-switches`의 비-interval 경로까지 동일 가드 적용
`src/hooks/use-kill-switches.ts`

- `refresh()`의 hidden/admin pause 가드는 유지
- 추가로 아래 트리거들도 동일한 보호막을 통과하게 정리
  - realtime `postgres_changes` callback
  - `window.focus` callback
- 필요하면 **in-flight dedupe / 직전 refresh 재진입 방지**를 넣어 phase 경계에서 중복 fetch 시작 자체를 막음

### 3) `use-auth-live-data` whale RPC에 함수 내부 가드 추가
`src/hooks/use-auth-live-data.ts`

- `load()` 시작 시점에 아래를 다시 확인
  - `document.hidden`
  - `isCategoryPaused("cosmetic")`
- 즉, interval 레벨에서 한 번, RPC 함수 본문에서 한 번 더 막아 **경계 직전 큐 진입 호출**을 차단

### 4) 재검증은 동일 시나리오로 고정
- `__phonaraSurface.runScenario()`를 다시 실행
- hidden / idle bucket이 둘 다 0인지 확인
- verdict가 둘 다 PASS인지 확인

## 변경 파일
- `src/hooks/use-kill-switches.ts`
- `src/hooks/use-auth-live-data.ts`
- 필요 시 재검증만으로 충분하면 소스 수정 없이 프리뷰 재동기화에서 종료

## 기대 결과
- 최신 번들 반영 후 `deltaPct`가 정상 수치로 계산됨
- 잔여 경계 호출 차단 후:
  - `hiddenRPC = 0`
  - `idleRPC = 0`
  - `verdict.hidden === "PASS"`
  - `verdict.idle === "PASS"`

## 검증
1. 프리뷰/개발 서버 재동기화
2. DEV 콘솔에서 `__phonaraSurface.runScenario()` 실행
3. 확인 항목
   - `deltaPct.hidden` / `deltaPct.idle`가 `null` 아님
   - hidden bucket = 0
   - idle bucket = 0
   - verdict hidden/idle 모두 PASS
