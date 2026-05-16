# DEV 로컬 실행 + `__phonaraSurface.runScenario()` 사용 가이드 문서화

Lovable Preview는 prod 빌드라 `import.meta.env.DEV === false` → `window.__phonaraSurface`가 노출되지 않습니다. 로컬에서 Vite dev 서버를 띄워야 surface runner를 쓸 수 있습니다. 이 절차를 저장소 문서로 남깁니다.

## 추가할 파일

**`docs/dev/rpc-surface-runner.md`** (신규)

목차:
1. 사전 준비 (Node/Bun, `.env` 자동 주입 확인)
2. 로컬 DEV 실행 — `bun install` → `bun dev` → http://localhost:8080
3. DEV 확인 — 콘솔에 `[rpc.surface] installed (DEV)` 로그
4. `__phonaraSurface` API 레퍼런스
   - `report()` — 현재 3-mode 스냅샷
   - `entropy()` — Phase 2 ledger 출력
   - `reset()` — 카운터 초기화
   - `runScenario({ activeMs, hiddenMs, idleMs, label })` — 3단계 시뮬레이션
5. 빠른 시작: `await __phonaraSurface.runScenario()` (기본 3x60s)
6. 정식 5+5+5 시나리오: `await __phonaraSurface.runScenario({ activeMs: 300000, hiddenMs: 300000, idleMs: 300000 })`
7. 결과 해석
   - 리턴값 `{ activeRPC, hiddenRPC, idleRPC, verdict: { hidden, idle } }`
   - 임계치: hidden ≤ -90%, idle ≤ -70%
   - 자동 다운로드되는 `rpc.surface.scenario.YYYY-MM-DD.json`을 `reports/`에 커밋하는 절차
8. 트러블슈팅
   - `__phonaraSurface is not defined` → prod 빌드를 보고 있음. 로컬 dev로 전환
   - 시나리오 중 페이지 이동 금지 (forcedMode가 리셋됨)
   - hidden 단계는 `document.hidden` getter를 임시 override → 끝나면 자동 복구

## 추가 변경

**`README.md`** — "Development" 섹션 아래 한 줄 추가:
> RPC surface runner (3-mode 측정) 사용법은 [docs/dev/rpc-surface-runner.md](docs/dev/rpc-surface-runner.md) 참고.

## 변경하지 않는 것

- `src/packages/entropy/rpc.surface.ts` (이미 구현 완료)
- `src/main.tsx` DEV 가드 (PR-F 계약 유지)
- 어떤 비즈니스 로직도 건드리지 않음 — 순수 문서 PR

## 기술 메모

- `import.meta.env.DEV`는 Vite가 `bun dev`/`vite` 실행 시에만 true, `vite build` (Lovable Preview/Publish 포함) 시 false로 tree-shake됨
- 따라서 prod 번들에는 `rpc.surface.ts` 자체가 포함되지 않음 → 보안/성능 영향 0
- 문서에는 "prod 미리보기에서는 의도적으로 비활성"임을 명시
