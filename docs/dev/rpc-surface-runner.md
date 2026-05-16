# RPC Surface Runner (`__phonaraSurface`)

DEV 전용 3-mode (active / hidden / idle) RPC 측정 도구. Phase 2 visibility ledger와 runtime governor가 모드 전환 시 RPC 호출량을 얼마나 줄이는지 즉시 검증한다.

> **prod 미리보기에서는 의도적으로 비활성**
> `import.meta.env.DEV` 가드 때문에 Lovable Preview(`*.lovable.app`) / Published 도메인(`phonara.world`)에서는 `window.__phonaraSurface`가 `undefined`다. Vite가 prod 번들 빌드 시 `src/packages/entropy/rpc.surface.ts`를 tree-shake로 통째로 제거하므로 보안·성능 영향 0.

---

## 1. 사전 준비

- Node 18+ 또는 Bun 1.1+
- 저장소 클론 후 `.env`가 자동으로 채워져 있는지 확인 (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`)
  - 없으면 `cp .env.example .env` 후 GitHub 연동 환경의 값 복사

## 2. 로컬 DEV 실행

```bash
bun install
bun run dev
```

브라우저에서 http://localhost:8080 접속.

## 3. DEV 모드 확인

브라우저 콘솔에 다음 로그가 보이면 준비 완료:

```
[rpc.surface] installed (DEV)
```

> 안 보이면 prod 빌드를 보고 있는 것. 로컬 dev 서버 URL이 맞는지 확인.

## 4. API 레퍼런스

| 메서드 | 설명 |
|---|---|
| `__phonaraSurface.report()` | 현재까지의 3-mode 누적 스냅샷 반환 |
| `__phonaraSurface.entropy()` | Phase 2 dual ledger (tracked / untracked) 출력 |
| `__phonaraSurface.reset()` | 카운터 전체 초기화 |
| `__phonaraSurface.runScenario(opts?)` | active → hidden → idle 자동 시나리오 실행 |

`runScenario(opts)` 옵션:

```ts
{
  activeMs?: number  // default 60_000
  hiddenMs?: number  // default 60_000
  idleMs?:   number  // default 60_000
  label?:    string  // 결과 JSON 파일 라벨
}
```

## 5. 빠른 시작 (3분, 3×60s)

```js
await __phonaraSurface.runScenario()
```

## 6. 정식 5+5+5 시나리오 (15분)

```js
await __phonaraSurface.runScenario({
  activeMs: 300_000,
  hiddenMs: 300_000,
  idleMs:   300_000,
  label:    "5x3-full",
})
```

> 시나리오가 도는 동안 **탭을 다른 페이지로 이동하지 말 것**. `forcedMode`가 리셋되어 측정이 망가진다. 탭을 background로 두는 것은 OK — runner가 `document.hidden` getter를 임시 override 한다.

## 7. 결과 해석

리턴값:

```ts
{
  activeRPC: number,
  hiddenRPC: number,
  idleRPC:   number,
  verdict: {
    hidden: "PASS" | "FAIL",   // 임계치: active 대비 ≤ -90%
    idle:   "PASS" | "FAIL",   // 임계치: active 대비 ≤ -70%
  },
  baseline: {...},
  after:    {...},
  diff:     {...},
}
```

- **`PASS` 조건**
  - hidden 단계 RPC가 active의 **10% 이하** (≥ 90% 감소)
  - idle 단계 RPC가 active의 **30% 이하** (≥ 70% 감소)
- 콘솔에는 `[rpc.surface] scenario summary` 헤더와 함께 JSON이 출력된다.
- 동시에 `rpc.surface.scenario.YYYY-MM-DD.json`이 자동 다운로드된다.

### 리포트 커밋

PR-F 계약상 측정 결과는 `reports/` 폴더에 누적한다:

```bash
mv ~/Downloads/rpc.surface.scenario.2026-05-23.json reports/
```

같은 날짜 파일이 이미 있으면 `_<label>` 접미사로 보존.

## 8. 트러블슈팅

| 증상 | 원인 / 해결 |
|---|---|
| `__phonaraSurface is not defined` | prod 빌드를 보고 있음. `bun run dev`로 띄운 로컬 URL인지 확인. |
| hidden 단계 PASS 실패 | runtime governor가 fallback 경로로 RPC를 쏘는 중. `governor.report()` 확인. |
| idle 단계가 끝나도 `document.hidden`이 true로 남음 | `runScenario()`는 종료 시 자동 복구. 직접 종료(throw) 시엔 `__phonaraSurface.reset()` 후 새로고침. |
| 시나리오 중 라우팅됨 | `forcedMode` 리셋. 처음부터 다시. |

## 9. 관련 파일

- `src/packages/entropy/rpc.surface.ts` — runner 구현
- `src/main.tsx` — DEV 가드 + 전역 install
- `src/packages/runtime/runtime.governor.ts` — 모드별 RPC 게이팅 로직
- `src/packages/runtime/runtime.idle.ts` — idle 감지
- `reports/rpc.surface.*.json` — 일자별 baseline 및 시나리오 결과
