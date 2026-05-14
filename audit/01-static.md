# 트랙 1 — 정적 분석 & 빌드 헬스 리포트

**일자**: 2026-05-14 / **소스 파일**: 526 / **빌드 상태**: ✅ 성공

## 요약 스코어카드

| 항목 | 결과 | 상태 |
|------|------|------|
| `tsc --noEmit` | 0 errors | ✅ 통과 (단, strict/noImplicitAny/strictNullChecks 모두 OFF) |
| ESLint | **936 errors / 61 warnings** (997) | ⚠️ 경고 다수, 일부 Critical |
| `madge` 순환 의존 | 527 파일 분석, **0 순환** | ✅ 깨끗 |
| `vite build` | 성공, 최대 청크 raw 498KB / brotli 138KB | ✅ 600KB 이하 통과 |
| baseline drift | 132개 SECURITY DEFINER 함수가 baseline 미등록 | ⚠️ 정책 검토 필요 |

---

## 🔴 CRITICAL (즉시 패치 — 런타임 크래시 위험)

### C1. `src/pages/EmpireArena.tsx:132-133` — Hook order violation
```tsx
if (!user) return null;            // ← early return
const { prices } = useBybitTicker(); // ← 이후에 호출되는 훅
```
**증상**: `user` 가 null↔객체로 토글될 때마다 React 훅 카운트 어긋남 → "Rendered fewer/more hooks than during the previous render" 크래시. 페이지 진입 직후 첫 렌더에 user가 nullish면 즉시 화이트스크린 가능.
**수정**: `useBybitTicker()` 호출을 early return **위로** 이동.

### C2. `src/components/AttendanceCard.tsx:63-64` — 동일 패턴
```tsx
if (!db.user) return null;         // 14행
...
const [now, setNow] = useState(...); // 63행 — 이미 early return 통과 후
useEffect(() => { ... }, []);       // 64행
```
**증상**: 비로그인↔로그인 전환 시 동일하게 React 크래시.
**수정**: `useState(now)` / `useEffect(timer)` 도 early return 위로 이동.

### C3. `src/components/ui/mini-chart.tsx:110, 169, 236, 298` — 4건
`useChart()` 가 `<Container>{(width) => ...}</Container>` 의 render-prop 콜백 내부에서 호출됨. 현재는 Container가 children을 항상 1회만 호출해 동작하지만, **React는 이를 별도 함수로 인식 가능 → 향후 Container 변경 시 즉시 깨짐**. 상위 컴포넌트(LineMini/BarMini/AreaMini/StackedBar)에서 width 측정 → 자식 콜백으로 내려보내는 구조로 리팩터 필요.
**임시 처치**: 4개 차트 컴포넌트마다 useChart를 LineMini 본문으로 끌어올리고 Container에는 width만 받게 변경. (Track 2에서 처리 권장)

---

## 🟠 HIGH

### H1. `@typescript-eslint/no-explicit-any` — **817건**
src/ 내 261개 파일에 `: any` 사용. 금융 critical 경로 우선:
- `src/lib/notify.ts`, `src/lib/walletRefresh.ts`, `src/lib/store.ts` → 잘못된 타입이 RPC 응답 매핑 오류 유발 가능
- `catch (e: any)` 패턴은 표준 — `unknown` 마이그레이션은 후순위로 OK
**전략**: tsconfig는 그대로 두고, 신규 코드만 strict하게. 기존 `any`는 리팩터 시 점진 제거.

### H2. `react-hooks/exhaustive-deps` — **31건 + 7 warning**
주요 패턴:
- `useEffect(() => { load(); }, [])` 인데 `load`가 useCallback 미적용 → ref/closure 안정성 가짜
- `LiveStats`, `ProfileForm`, `WithdrawDialog` 등 데이터 로드 함수에 다수 분포
**위험도**: 일반적으로는 무해하지만, props 변경 시 stale closure로 잘못된 값을 RPC에 전달할 가능성. 금융 핵심 경로(WithdrawDialog 등)만 우선 패치.

### H3. baseline drift — **132개 SECURITY DEFINER 함수**가 `function_permissions_baseline` 미등록
대부분 트리거(`tg_*`, `trg_*`)와 내부 cron(`settle_*`, `recompute_*`) 으로 추정 → 사용자 호출 불가. 그러나 `claim_daily_attendance`, `request_refund`, `spin_roulette`, `submit_deposit`, `verify_withdraw_otp`, `claim_loss_protection`, `claim_founding_season_seat`, `crown_war_*` 등 **사용자 호출 가능 RPC도 다수 포함**.
**조치**: baseline 테이블에 신규 함수 일괄 INSERT 마이그레이션 필요. (Track 4 보안 단계에서 다룸)

---

## 🟡 MEDIUM

### M1. `no-empty` — 91건
빈 `catch {}` / 빈 `if {}` 블록. 에러 삼킴 위험. `notify.fail()` 또는 `console.warn` 최소 1줄 권장.

### M2. `@typescript-eslint/ban-ts-comment` — 5건
`src/App.tsx:124-128`, `src/lib/route-prefetch.ts:105-107` 의 `@ts-ignore` → `@ts-expect-error`로 교체 (1줄 수정).

### M3. `no-console` — 8건 모두 "Unused eslint-disable directive"
이미 console.log 제거됨, disable 주석만 남은 dead code. 8개 파일에서 `// eslint-disable-next-line no-console` 줄 삭제만 하면 됨.

### M4. `react-hooks/rules-of-hooks` 외 잔여 7건
대부분 `mini-chart.tsx` 4건 (C3에서 다룸) + EmpireArena 1건 (C1) + AttendanceCard 2건 (C2) — Critical로 흡수됨.

---

## 🟢 LOW

- `no-useless-escape` 1건 — 정규식 정리
- `no-control-regex` 1건 — 의도된 경우 `// eslint-disable` 주석
- `@typescript-eslint/no-empty-object-type` 2건 — `{}` → `Record<string, never>`
- `@typescript-eslint/no-require-imports` 1건 — `tailwind.config.ts:176` (Tailwind plugin require, 무시 가능)
- `@typescript-eslint/no-unused-expressions` 5건 — 조건부 호출 `cond && fn()` → `if (cond) fn()`

---

## 빌드/번들 상세

| 청크 | Raw | Brotli |
|------|-----|--------|
| `index-*.js` (entry) | 498 KB | 138 KB |
| `supabase-*.js` | 207 KB | 44 KB |
| `lwcharts-*.js` (lightweight-charts) | 171 KB | 47 KB |
| `proxy-*.js` (Radix) | 124 KB | 36 KB |
| `TradingArenaBybit-*.js` | 90 KB | 24 KB |
| `_AdminRoutes-*.js` | 72 KB | 19 KB |

- 600KB 초과 청크 0개 ✅
- circular dependency 0건 ✅
- entry 498KB는 Vite 권장(500KB) 한계 근접 — 이후 Track 2에서 `framer-motion` 동적 분리 검토.

---

## RPC 시그니처 정합성

`src/integrations/supabase/types.ts` 는 자동 생성 파일. tsc 0 errors가 곧 시그니처 정합성 보증 (모든 `supabase.rpc()` 호출이 타입 OK). 추가 mismatch 없음.

---

## 다음 액션 (자동 패치)

본 보고서와 함께 **Critical C1, C2 즉시 패치**를 별도 commit으로 진행합니다.
- C3(mini-chart 리팩터)는 시각 회귀 위험 있어 Track 2 진행 전 별도 승인 권장.
- High/Medium 항목은 모아서 Track 5(UX) 단계에서 일괄 정리.
- baseline drift 132건은 Track 4(보안) 단계에서 마이그레이션으로 일괄 등록.
