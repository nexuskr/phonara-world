# PR-L — Per-route Bundle Budget CI (Phase 4 Scale & Global Ready · Slice 1)

## 목표

모든 lazy route에 **강제 KB 상한**을 걸고 CI 파이프라인에서 자동 차단한다.
초과 시 빌드 실패 + PR 코멘트 봇이 현재 vs 이전 diff 테이블을 자동 작성한다.

50-70대 사용자가 "와… 이렇게 빠르고 가벼운 플랫폼은 처음이야"라고 느낄 수 있도록
Layer 1/Operator/Slots/Wallet/Game 각 청크에 **엄격한 gzip 예산**을 적용한다.

## 절대 보호 (불변)

- money-flow 8경로 git diff = 0줄 (PRJ_FREEZE_RAW_CHANNEL 목록 유지)
- 모든 가시 텍스트는 `g('key')` 만 사용
- `@pkg/*` alias 필수
- 기존 PR-I/J/K 산출물(Degrade Mode / Realtime Partition / Operator Isolation) 무손상

## 산출물

### 1. `size-limit.config.json` — 예산 정의

청크 패턴별 gzip 상한:

| Pattern | Budget (gzip) | 비고 |
|---|---|---|
| `dist/assets/index-*.js` | **180 KB** | Layer 1 entry (PR-K 기준 유지) |
| `dist/assets/operator-*.js` | **400 KB** | admin/operator 전체 (lazy) |
| `dist/assets/Casino-*.js` + `dist/assets/casino/*.js` | **120 KB** | 슬롯 메인 + 개별 슬롯 (각각) |
| `dist/assets/Crash-*.js` | **80 KB** | 게임 lazy route |
| `dist/assets/Roulette-*.js` | **80 KB** | 게임 lazy route |
| `dist/assets/{Packages,Pay,Wallet*}-*.js` | **100 KB** | 지갑/결제 lazy route |
| `dist/assets/{Support,Chat*}-*.js` | **80 KB** | 채팅/지원 |
| `dist/assets/{Live,LiveOverlay,Whales}-*.js` | **90 KB** | 라이브/마켓 |
| `dist/assets/vendor-*.js` | **250 KB** | warn only |
| `dist/assets/locale-*.js` | **40 KB / lang` | i18n shard |

각 항목은 `name` + `path` + `limit` + `gzip: true` + (entry 외엔) `running: false` (런타임 평가 비활성, 파일 사이즈만 측정).

### 2. `scripts/bundle-budget.mjs` — 커스텀 다중 청크 게이트

`size-limit` 패키지의 한계(글롭별 단일 청크 가정)를 보완하는 얇은 wrapper:

- `dist/assets/*.js` 전부 스캔
- `size-limit.config.json`을 읽어 패턴별로 매칭되는 파일 그룹화
- 각 그룹의 **최댓값(max)** 과 **합계(sum)** 를 budget과 비교
- 결과를 `reports/bundle-budget.YYYY-MM-DD.json` 으로 저장
- 초과 시 exit 1, 상세 표 출력
- `--baseline reports/bundle-budget.prev.json` 옵션으로 diff 표 출력 (PR 봇용)

### 3. `.github/workflows/bundle-budget.yml` — CI 게이트 + PR 코멘트

```yaml
name: bundle-budget
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  budget:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - name: Build
        run: bun run build
      - name: Operator isolation gate (PR-K)
        run: node scripts/check-operator-isolation.mjs
      - name: Bundle budget gate (PR-L)
        run: node scripts/bundle-budget.mjs
      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: bundle-budget-report
          path: reports/bundle-budget.*.json
      - name: PR comment (size diff)
        if: github.event_name == 'pull_request'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: bundle-budget
          path: reports/bundle-budget.comment.md
```

`scripts/bundle-budget.mjs` 는 함께 `reports/bundle-budget.comment.md` 를 생성:

```
### 📦 Bundle Budget — Phonara

| Route | Now (gz) | Budget | Δ vs prev | Status |
|---|---:|---:|---:|:---:|
| index | 172.4 KB | 180 KB | +1.2 KB | ✅ |
| operator | 388.1 KB | 400 KB | -3.0 KB | ✅ |
| Casino slots (max) | 118.7 KB | 120 KB | +0.4 KB | ✅ |
...
```

### 4. `package.json` 스크립트

```jsonc
"scripts": {
  "build": "vite build",
  "size:check": "node scripts/bundle-budget.mjs",
  "size:baseline": "cp reports/bundle-budget.latest.json reports/bundle-budget.prev.json"
}
```

`size-limit` npm 패키지는 **추가하지 않는다** (커스텀 스크립트만으로 모든 기능 커버 → 의존성 0개 추가).

### 5. `scripts/bundle-check.mjs` (기존)

Layer 1 단일 게이트는 유지. `bundle-budget.mjs` 는 그 상위 집합으로 동작.
`perf-gate.yml` 의 기존 `bundle-check.mjs` 호출 다음에 `bundle-budget.mjs` 호출 추가.

### 6. Warm-King 에러 메시지

`src/lib/glossary.ts` 에 키 추가 (CI 전용이지만 일관성 유지):

- `bundle.over_budget` = "잠시만요 — 화면이 무거워졌어요. 운영팀이 곧 가볍게 만들게요."
- `bundle.healthy` = "지금 화면이 아주 가볍게 잘 돌아가고 있어요."

번들 사이즈 관련 에러는 사용자에 직접 노출되지 않지만, 만일 `<SoftBoundary>` 가
청크 로드 실패를 잡을 경우 위 키를 사용하도록 fallback 텍스트 정렬.

### 7. `reports/bundle-budget.2026-05-19.json` — 베이스라인 스냅샷

최초 실행 결과를 커밋 → 이후 PR diff 표의 기준점.

## 검증

1. `bun run build` → dist 생성
2. `node scripts/bundle-budget.mjs` → 모든 그룹 PASS, 종료 코드 0
3. `node scripts/check-operator-isolation.mjs` → PASS (PR-K 회귀 0)
4. `node scripts/check-money-flow-freeze.mjs` → PASS (8경로 무손상)
5. `git diff -- src/packages/wallet/hooks/useDepositRealtime.ts ...` → 0줄
6. `reports/bundle-budget.2026-05-19.json` 존재 + 커밋
7. PR 시뮬레이션: 임의 청크에 100KB 더미 추가 → CI FAIL + comment 생성 확인

## 변경 파일 목록

- 신규: `size-limit.config.json`
- 신규: `scripts/bundle-budget.mjs`
- 신규: `.github/workflows/bundle-budget.yml`
- 신규: `reports/bundle-budget.2026-05-19.json`
- 수정: `package.json` (scripts 3종 추가, 의존성 변경 없음)
- 수정: `src/lib/glossary.ts` (2 key 추가)
- 수정: `.github/workflows/perf-gate.yml` (bundle-budget 단계 추가)
- 무손상: vite.config.ts / money-flow 8경로 / @pkg/* 구조

## 영향 범위

- **Bundle**: 변경 없음 (측정만 추가)
- **money-flow**: 0줄 변경
- **UX**: 사용자 가시 변경 없음 (glossary 2 key는 fallback용)
- **운영**: 모든 PR에 자동 사이즈 리포트 + 초과 시 머지 차단
- **CI 시간**: +30~60s (build 1회 재활용 가능)

## PR-L 종료 후

`✅ PR-L 완료. PR-M 준비됐습니다.` 선언 후 PR-M (Edge caching + i18n CDN) 상세 플랜을 이어서 제시.

### PR-M 미리보기

| 항목 | 내용 |
|---|---|
| 정적 캐시 헤더 | `public/_headers` 의 `/assets/*` → `cache-control: public, max-age=31536000, immutable` |
| HTML | `cache-control: public, max-age=0, must-revalidate` |
| 로케일 CDN | `locale-{ko,en,ja,vi}-*.js` 도 immutable, `Link: <...>; rel=preload; as=script` 헤더 active lang만 |
| 공용 RPC SWR | `@pkg/core/swr.ts` — `get_world_domination_stats` / `get_recent_payouts_100` / `get_whale_strikes_24h` 등 공개 RPC 60s SWR + `stale-while-revalidate` |
| Edge function 헤더 | 공개 RPC 응답에 `cache-control: public, s-maxage=60, stale-while-revalidate=300` |
| 검증 | curl로 헤더 확인, Lighthouse "Serve static assets with efficient cache policy" 100점 |
