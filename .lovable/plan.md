# Background Suspension 실패 원인 해결 (PR-G/H 검증 PASS)

## 측정 결과 요약

3×60s 시나리오:
- `activeRPC=2` (platform_kill_switches + get_whale_strikes_24h, 정상)
- `hiddenRPC=1` (FAIL, 목표 0~1 미만이지만 -90% 미달)
- `idleRPC=2` (FAIL, idle suspension 미작동 — active와 동일)

## 근본 원인 2가지

### 1. `use-kill-switches.ts`가 raw `setInterval` 사용
```
src/hooks/use-kill-switches.ts:71
const id = setInterval(refresh, 60_000);
```
- governor가 못 건드림 → hidden/idle 양쪽 모두 통과
- 카테고리 "admin" 으로 분류돼야 idle suspension(PR-H)이 잡음
- hidden 버킷의 `platform_kill_switches: 1`가 바로 이놈

### 2. `runtime.idle`의 idle 상태를 시나리오 러너가 트리거 못함
- `runtime.idle.ts`는 자체 `lastInput` 변수로 60초 무입력을 감지
- `rpc.surface.runScenario`는 자기네 `lastInteraction = 0`만 리셋 → runtime.idle의 lastInput은 그대로 → `pauseCategory("admin")` 호출 안 됨
- 결과: idle 단계에서도 admin/cosmetic 둘 다 활성 → 2 RPC 그대로 흐름

## 수정안

### A. `use-kill-switches.ts` 마이그레이션
```text
- import { setInterval } (raw)
+ import { setVisibleInterval } from "@/lib/util/visible-interval";
- const id = setInterval(refresh, 60_000);
- return () => clearInterval(id);
+ return setVisibleInterval(refresh, 60_000, {
+   meta: { owner: "use-kill-switches", category: "admin" },
+ });
```
효과:
- hidden: governor.pauseCategory("cosmetic")는 admin엔 영향 없지만, `document.hidden` 가드(tick 첫 줄)가 직접 막음 → hidden 버킷 0
- idle: runtime.idle이 pauseCategory("admin") 호출하면 자동 skip

### B. DEV-only `runtime.idle` 강제 API
`src/packages/runtime/runtime.idle.ts`에 DEV 가드로 노출:
```text
if (DEV) (window as any).__phonaraIdle = {
  force(on: boolean) {
    if (on) { lastInput = 0; idle = true; pauseCategory("admin"); }
    else    { lastInput = Date.now(); if (idle){ idle=false; resumeCategory("admin"); } }
  },
  isIdle: () => idle,
};
```

### C. `rpc.surface.runScenario`에서 idle 단계 진입/이탈 시 위 API 호출
```text
// Phase 2 시작
window.__phonaraIdle?.force(true);
...await idleMs...
// 종료
window.__phonaraIdle?.force(false);
```

## 기대 결과 (재측정)

```
activeRPC: 2
hiddenRPC: 0    ← PASS (-100%)
idleRPC:   0    ← PASS (-100%)
verdict: { hidden: "PASS", idle: "PASS" }
```

## 영향 범위

- 운영 동작 변화: kill switch 폴링이 백그라운드/유휴 시 일시정지 (60s 폴링 → 복귀 즉시 catch-up 호출). 보안성 영향 없음 (활성 사용자에게만 폴링).
- 머니플로우: 변경 없음 (`scripts/check-money-flow-freeze.mjs` 통과 예상).
- 번들: ±0 KB (전부 기존 모듈 재사용).
- DEV API: prod 빌드에서 `import.meta.env.DEV` 가드로 tree-shake.

## 파일 변경 목록

1. `src/hooks/use-kill-switches.ts` — raw setInterval → setVisibleInterval(admin)
2. `src/packages/runtime/runtime.idle.ts` — DEV `__phonaraIdle.force()` 노출
3. `src/packages/entropy/rpc.surface.ts` — idle 단계에서 `__phonaraIdle.force(true/false)` 호출

## 검증

1. `bun run build` (번들 회귀 없음 확인)
2. DEV 서버에서 `await __phonaraSurface.runScenario()` 재실행
3. `verdict.hidden === "PASS" && verdict.idle === "PASS"` 확인
4. 결과 JSON을 `reports/rpc.surface.2026-05-16.json`에 저장
