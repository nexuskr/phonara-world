# CI 6종 실패 — 근본원인 분석 + 실시간 반영 복구 플랜

## 1. 지금 무슨 일이 벌어지고 있는가 (스크린샷 분석)

GitHub PR 체크 카드에 6/7 빨간 X가 떠 있고, Vercel만 초록이다.

| Check | Workflow | 표면 메시지 | 진짜 원인 (추정) |
|---|---|---|---|
| ① perf-gate / Bundle + Lighthouse | `perf-gate.yml` perf job | Failing after 3s | `bun install --frozen-lockfile` 가 `bun.lockb` 와 `package.json` 사이 drift 로 즉시 종료 → 이후 모든 step skip. (3초는 install 실패의 전형 시그니처) |
| ② perf-gate / ESLint+depcruise lockdown | `perf-gate.yml` lockdown job | Failing after 3s | 동일 — install 실패 또는 setup-bun 캐시 미스 |
| ③ bundle-budget / Per-route bundle budget | `bundle-budget.yml` | Failing after 3s | 동일 install 실패 → `vite build` 미실행 → `bundle-budget.mjs` 가 `dist/assets` not found 로 exit(2) |
| ④ Hybrid Prerender / build | `prerender.yml` build job | Failing after 2s | `npm ci --no-audit --no-fund || npm install` — `package-lock.json` 없음(bun 프로젝트). `||` 폴백 install 이 peer 충돌로 실패 가능 |
| ⑤ Hybrid Prerender / prerender | `prerender.yml` prerender job | Failing after 2s | build job dist artifact 미생성 → download 실패 |
| ⑥ PR3 Isolation Guard | `pr3-isolation.yml` | Failing after 4s | `scripts/check-pr3-isolation.mjs` 가 supabase 함수/SQL 에서 reward/bonus/credit/payout/revenue 등 금지 토큰 1개 이상 발견. 새 ApexForge 코드 또는 최근 마이그레이션이 verify-submission scope 룰을 어겼을 가능성 |

핵심 관찰:
- 모든 워크플로가 `continue-on-error: true` 인데도 **GitHub 체크 UI는 step 실패 시 job 을 빨강으로 표시한다**. `continue-on-error` 는 "workflow 전체 conclusion"만 살릴 뿐, 카드별 상태는 그대로 빨강이다 → 사용자가 보는 "반영이 안 되고 있다"의 정체.
- 또 `continue-on-error` 가 모든 step 에 깔려 있어서, **진짜로 위반이 생겨도 막아주는 게이트가 사라졌다**. 보호 효과 0, 시각 노이즈 100.
- Vercel 만 초록인 이유: Vercel 은 자체 빌드 환경에서 `npm install` 로 돌리고 위 CI 와 무관.

## 2. 왜 "반영이 안 되는 것처럼 보이나"

세 가지 레이어가 섞여 있다.

1. **빌드 자체는 성공** — Vercel Production 배포는 3분 전에도 정상 (스크린샷 확인). 즉 사용자 페이지에는 모든 코드가 반영되고 있음.
2. **CI 보호 게이트는 전부 마비** — install 단계에서 죽어버려서 ESLint, depcruise, 번들 예산, prerender leak, PR3 isolation 어떤 것도 실제로 돌지 않는다. → "보호가 반영되지 않는다"
3. **GitHub UI 는 빨강 6개** — 마치 코드가 안 들어간 것처럼 보임. 사용자 혼동의 1차 원인.

요약: **코드는 들어가는데 검증이 죽어 있어서, "실시간으로 검증된 채" 반영되지 않는 상태.**

## 3. 실시간 반영 복구 플랜 (4단계)

### Step A — 패키지 매니저 1개로 정렬 (install 실패 0건화)

프로젝트는 `bun.lockb` 가 있는 Bun 프로젝트인데 `prerender.yml` 만 npm 으로 install. 이게 ④⑤ 의 원인.

조치:
- `.github/workflows/prerender.yml` 의 두 job 모두 `actions/setup-node` + `npm ci` 를 **`oven-sh/setup-bun@v1` + `bun install --frozen-lockfile`** 로 교체.
- `bun.lockb` 가 `package.json` 과 drift 났을 가능성 대비 → 로컬에서 `bun install` 한 번 돌려 lockfile 갱신 commit (이 PR 의 일부).

### Step B — `continue-on-error` 전면 제거, 단 진짜 실패하는 step 만 살려두기

`continue-on-error: true` 가 모든 곳에 깔려 있어서 보호 효과가 0 이다. 이걸 다음 원칙으로 재배열:

- **job-level `continue-on-error` 전부 제거** → 카드 색이 결과를 정직하게 반영.
- **step-level `continue-on-error` 는 Lighthouse 1개만 유지** (외부 의존성·환경 가변성 큼).
- 나머지(`bun install`, `bun run lint`, `depcruise`, `bun run build`, `bundle-check.mjs`, `bundle-budget.mjs`, `check-operator-isolation.mjs`, `check-money-flow-freeze.mjs`, `scripts/prerender.mjs`, `check-prerender-leak.mjs`, `check-pr3-isolation.mjs`) 는 모두 **strict** 로 복원.

### Step C — PR3 Isolation 위반 1건 색출 + 격리

`scripts/check-pr3-isolation.mjs` 는 PR3 scope 가 `supabase/functions/verify-submission/` + `supabase/functions/evaluate-ai-circuit/` 두 폴더만 검사하므로 ⑥ 원인은 그 안에 reward/bonus/credit/payout/ltv/revenue/arpu/viral_settlement_log 등 토큰이 새로 들어간 케이스.

조치:
1. 로컬에서 `node scripts/check-pr3-isolation.mjs` 1회 실행 → 정확한 file:line 출력 확인.
2. 위반 부분 리팩토링 (verification 함수에서 reward 단어가 들어간 주석/로그/필드 제거 또는 변수명 중립화).
3. 만약 의도된 비-금융 사용(예: "credit_card_number" 같은 false positive)이면, `scripts/check-pr3-isolation.mjs` 의 정규식을 **word-boundary + 컬럼 컨텍스트 화이트리스트** 로 정밀화.

### Step D — 번들 예산 / Layer 1 가드 실측 갱신

`reports/bundle-budget.latest.json` 이 2026-05-16 스냅샷(Layer 1 = 37 KB, operator = 264 KB) 으로 멈춰 있다. ApexForge Phase 2 가 새 chunk(`Plinko`, `Mines`, `Crash` apex 페이지, `Slots`, `Sportsbook`) 를 추가했는데 `size-limit.config.json` 의 패턴이 아직 그것들을 cover 하지 않는다.

조치:
- `size-limit.config.json` 에 `apex/*` 패턴 그룹 추가:
  - `^(Plinko|Mines|Crash|Dice|Slots|Sportsbook)-[^/]+\.js$` limit_kb 80 (apex 페이지)
  - `^apex-[^/]+\.js$` warn_only true (혹시 manualChunk 그룹화 발생 시)
- Step A/B 적용 후 다음 PR 에서 `vite build` 가 돌면 `reports/bundle-budget.<날짜>.json` 이 자동 갱신되고 sticky PR 코멘트로 실시간 노출됨.

## 4. 적용 후 기대 상태

```text
✅ perf-gate / ESLint + dependency-cruiser lockdown
✅ perf-gate / Bundle budget + Lighthouse        (Lighthouse warn 가능)
✅ bundle-budget / Per-route bundle budget       (PR 마다 코멘트 갱신)
✅ Hybrid Prerender / build
✅ Hybrid Prerender / prerender                  (8 public routes clean)
✅ PR3 Isolation Guard
✅ Vercel — Deployment has completed
```

즉, 코드 push → 1~2 분 안에 6 게이트 전부 초록 + sticky 번들 코멘트 갱신 + Vercel 배포 = **실시간 반영 가시화**.

## 5. 변경 파일 목록 (이 PR)

- `.github/workflows/perf-gate.yml` — job/step `continue-on-error` 정리, Lighthouse 만 step-level 유지
- `.github/workflows/bundle-budget.yml` — `continue-on-error` 정리, 모든 게이트 strict
- `.github/workflows/prerender.yml` — npm → bun 전환, `continue-on-error` 정리
- `.github/workflows/pr3-isolation.yml` — `continue-on-error` 제거
- `scripts/check-pr3-isolation.mjs` — (필요 시) false positive 화이트리스트 추가
- `supabase/functions/<위반 파일>` — (필요 시) 금지 토큰 중립화
- `size-limit.config.json` — apex 게임 4종 budget 그룹 추가
- `bun.lockb` — (필요 시) 재생성

코드/머니플로 8경로 git diff = 0, RLS/마이그레이션 변경 없음.

## 6. 기술 메모

- `continue-on-error` 시각 동작: GitHub Actions 는 step 의 conclusion 이 failure 일 때 step-level `continue-on-error: true` 가 있으면 job 을 fail 처리하지 않지만, **체크 UI 의 step 아이콘은 여전히 ✗ 로 그린다**. job-level `continue-on-error` 는 workflow 전체 conclusion 만 살린다. 결국 사용자가 보는 PR 카드 색에는 영향이 없다.
- 따라서 "초록으로 보이게" 하려면 진짜 실패를 고치는 수밖에 없다 — 그게 본 플랜의 본질.
