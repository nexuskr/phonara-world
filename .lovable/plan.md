# Phase 2 본작업 — RUNTIME DETOX MIGRATION (Triage-Driven)

> Phase 2 Pre-Flight (visibility instrumentation) 완료. 이제 ledger 가 보여주는 entropy 78개를 **money-flow 는 동결한 채** cosmetic / admin / unknown 범주에서 점진 이주.
> 목표 KPI: `hidden RPC -90%`, `idle RPC -70%`, `coverage ≥ 0.7`.
> 원칙: "성능은 바꿔도 의미는 바꾸지 않는다."

## 0. 진입 조건 (이미 충족)

- `@pkg/runtime` / `@pkg/entropy` / `@pkg/risk` 스캐폴드 존재
- `runtime.observe` DEV override 가 legacy interval 캡처 중
- `reports/rpc.surface.2026-05-16.json` baseline 커밋됨
- Money-flow FREEZE 인벤토리 (8개) — ESLint + CI 가드 작동
- PR 템플릿에 entropy / coverage / baseline 3줄 강제

## 1. 다음 PR 시퀀스 (작업 순서 고정)

PR 단위로 분리. 합치지 말 것. 각 PR 끝나면 `reports/entropy.surface.<date>.json` + `reports/rpc.surface.<date>.json` 갱신 커밋.

```text
PR-A  Triage Freeze List       (코드 변경 0, 분류만)
PR-B  Cosmetic Wave 1          (ticker / marquee / countdown 14개)
PR-C  Cosmetic Wave 2          (rail / pulse / banner 12개)
PR-D  Admin Panels Wave        (operator / kpi / kernel 8개)
PR-E  Unknown 잔여 Triage      (남은 entropy 강제 분류 + 이주 또는 명시적 freeze)
PR-F  Hidden-Tab Suspension    (document.hidden 시 cosmetic 일괄 pause)
PR-G  Idle Suspension          (60s idle 시 admin 일괄 pause)
PR-H  Phase 2 Exit Audit       (KPI 검증 + Phase 3 게이트)
```

Money-flow 8개는 **모든 PR 에서 git diff 0줄**. CI 가드(`check-money-flow-freeze.mjs`)가 자동 차단.

## 2. PR-A — Triage Freeze List

**산출:** `reports/triage.2026-05-17.json` — entropy 78개 각각에 다음 필드:

```ts
{
  owner: string,          // file:line
  intervalMs: number,
  category: "money_flow" | "cosmetic" | "admin" | "unknown",
  decision: "freeze" | "migrate" | "delete-candidate",
  ownerPR: "B" | "C" | "D" | "E",
  notes?: string
}
```

**규칙:**
- `money_flow` → `freeze`, ownerPR 없음
- `cosmetic` ≤2초 주기 + 화면 보일 때만 의미 → `migrate`, B/C 분배
- `admin` → `migrate`, D
- 분류 실패 → `unknown` 유지, E 로
- **코드 변경 0줄.** triage json + plan 갱신만.

게이트: 78개 합 = ledger snapshot 수. 누락 1개라도 있으면 PR-A 차단.

## 3. PR-B / PR-C — Cosmetic Migration

각 interval 을 `setVisibleInterval(fn, ms, { meta: { owner, category: "cosmetic" } })` 로 교체.

**변경 패턴 (한 PR 안에서 동일 패턴만 묶기):**

```ts
// BEFORE
useEffect(() => {
  const id = setInterval(refresh, 60_000);
  return () => clearInterval(id);
}, []);

// AFTER
useEffect(() => {
  return setVisibleInterval(refresh, 60_000, {
    leading: false,
    catchUpOnVisible: true,
    meta: { owner: "WhaleStrikeRail", category: "cosmetic" },
  });
}, []);
```

**금지:**
- 주기(ms) 변경
- `refresh` 함수 시그니처 / 내부 로직 변경
- 동시에 RPC payload 변경
- money_flow 카테고리 어떤 파일도 건드림

**Exit 게이트 (PR 마다):**
- `tracked` 만 증가, `untracked` 정확히 N만큼 감소 (N=이주 개수)
- `coverage` 단조 증가
- baseline 대비 동일 시나리오(foreground 5min) RPC 카운트 ±5% 이내
- bundle size delta ≤ +0.5KB

## 4. PR-D — Admin Panels

`/admin/*` 패널들의 폴링(15s/30s) 을 `setVisibleInterval` + `category: "admin"` 으로 이주. 추가로 패널 unmount 시 cleanup 정확성 검증 (현재 leak 의심 4건 — KernelObservability / OracleFortress / TrustV2Admin / WhaleStrikeFunnelPanel).

## 5. PR-E — Unknown 잔여 처리

`untracked` 에 남은 항목 1개라도 있으면:
1. stack trace 로 owner 재추정 → `entropy.map.ts` 룰 추가
2. 그래도 unknown → **명시적 freeze 결정**을 triage json 에 기록 (이유 필수)

게이트: PR-E 머지 후 `category: "unknown"` count = 0.

## 6. PR-F — Hidden-Tab Suspension

`@pkg/runtime/runtime.governor.ts` 의 스텁을 구현:

```ts
document.addEventListener("visibilitychange", () => {
  if (document.hidden) governor.pauseCategory("cosmetic");
  else                governor.resumeCategory("cosmetic");
});
```

`setVisibleInterval` 자체가 visibility-aware 이지만, 본 PR 은 **governor 가 ledger 전체를 일관 제어**하도록 통합. money_flow / admin 은 영향 없음.

**KPI 측정:** baseline 시나리오 2(백그라운드 5min) 재실행 → hidden RPC -90% 확인. 미달 시 PR 차단.

## 7. PR-G — Idle Suspension

60s 무입력 + foreground → governor 가 `admin` 카테고리 pause. 입력 감지 시 즉시 resume. cosmetic 은 계속 (UX 보존).

**KPI 측정:** idle 5min 시나리오 → idle RPC -70% 확인.

## 8. PR-H — Phase 2 Exit Audit

`scripts/phase2.exit.audit.mjs` 신규:

| 지표 | 기준 |
|---|---|
| coverage | ≥ 0.7 |
| untracked.size | < 5 (장기 freeze 항목만) |
| category=unknown | 0 |
| hidden RPC | baseline 대비 -90% |
| idle RPC | baseline 대비 -70% |
| money-flow git diff (Phase 2 전체) | 0줄 |
| bundle delta (Phase 2 전체) | ≤ +2KB |

전부 통과 → Phase 3 (Realtime Detox) 게이트 오픈.

## 9. 비-목표 (Phase 2 본작업 동안 절대 안 함)

- Money-flow interval 어떤 형태로든 수정 (PHON FREEZE)
- RPC payload / 응답 schema 변경
- React Query 옵션(`staleTime` 등) 튜닝 — Phase 5
- Realtime 채널 통합 — Phase 3
- Risk reactor 자동 트리거 — Phase 4
- 컴포넌트 split / lazy load — Phase 6

## 10. 즉시 시작할 작업 (이 다음 메시지)

**PR-A 부터.** 사용자 승인 시:
1. 브라우저 DEV 콘솔에서 entropy ledger snapshot 추출
2. `entropy.map.ts` 룰로 자동 분류 + 수동 보정
3. `reports/triage.2026-05-17.json` 커밋
4. `.lovable/plan.md` 에 PR-B 상세 변경 패턴 채워 넣기

코드 1줄도 안 바뀜. 분류만.

## 한 줄

> Phase 2 본작업은 "interval 이주"가 아니라 "ledger 가 시스템을 통제하기 시작하는 순간"이다.
