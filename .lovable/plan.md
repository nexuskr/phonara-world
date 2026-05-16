# perf-gate / perf 복구 — PR-A: signature-engine lazy 분리

`perf-gate / perf` 잡이 Layer 1 = 339.9 KB gz (budget 180 KB, 초과 159.9 KB) 로 죽고 있다.
가장 큰 단일 청크인 `signature-engine` (73.3 KB gz / 230.5 KB raw) 을 부트에서 떼어내는 PR-A 만 먼저 진행한다.

## 목표

- Layer 1 ≤ 180 KB gz 1차 진입.
- `signature-engine` 청크는 카지노 로비/홈 진입 시점에 modulepreload 되지 않고, 실제 슬롯 페이지 진입 시에만 로드.
- 슬롯 사용자 체감 동작 변화 0 (Suspense fallback = `null`, 동일 라우트 내 1회 로딩).

## 원인 (요약)

`vite.config.ts`의 `manualChunks`가 슬롯 엔진을 별도 청크로 분리하지만, 슬롯 페이지들이 **정적 import** 라서 entry → page → engine 그래프가 그대로 이어져 Vite 가 `<link rel="modulepreload">` 를 자동 주입 → Layer 1 카운팅에 들어감.

## 변경 파일

1. **슬롯 페이지 7종** — `SlotSignatureWrapper` 정적 import 를 `React.lazy` 로 치환:
   - `src/pages/casino/CosmicForge5000.tsx`
   - `src/pages/casino/OlympusLegacy5000.tsx`
   - `src/pages/casino/SugarFever3000.tsx`
   - `src/pages/casino/NeonTokyo88.tsx`
   - `src/pages/casino/Wizard2000.tsx`
   - `src/pages/casino/DragonEmpire.tsx`
   - `src/pages/casino/PiratesCurse1500.tsx`
   - `src/pages/casino/PharaohsVault2500.tsx`
   - `src/pages/casino/CherrySakura500.tsx`
   - `src/pages/casino/AztecSun1200.tsx`
   - `src/pages/casino/VikingThunder4000.tsx`
   - `src/pages/casino/Olympus1000.tsx` (OlympusSlot 직접 import → lazy)

   패턴:
   ```ts
   const SlotSignatureWrapper = lazy(() => import("@/components/slots/SlotSignatureWrapper"));
   // <Suspense fallback={null}><SlotSignatureWrapper ... /></Suspense>
   ```

   Background/Paytable/Overlay 컴포넌트는 wrapper props 로 전달되므로 wrapper lazy 만으로 engine 청크 전체가 deferred 됨.

2. **`vite.config.ts`** — 변경 없음. 기존 `signature-engine` manualChunks 유지 (lazy import 가 alone in graph 이면 Vite 가 자동으로 async chunk 처리).

3. **검증**
   - `bun run build` → `signature-engine-*.js` 가 async chunk 로 표시되는지 확인.
   - `node scripts/bundle-check.mjs` → Layer 1 ≈ 266 KB gz 로 감소 (still > 180? — 만약 미달이면 PR-B/C/D 후속).
   - 슬롯 페이지 로딩 시 첫 spin 까지 추가 지연 < 200ms.
   - `node scripts/check-money-flow-freeze.mjs` 0 diff.

## 분리 처리 (이 PR 아님)

- PR-B: `pickers` (cmdk/vaul/embla/day-picker) lazy.
- PR-C: `audio` (howler+sounds) lazy in 슬롯 페이지.
- PR-D: `locale-ja/vi` dynamic import.
- PR-E: `motion` 슬림화.

PR-A 만으로 Layer 1 ≤ 180 KB 미달성 시 PR-B 를 즉시 이어 진행한다.

## 영향 범위

- 슬롯 페이지 진입 시 wrapper + engine 첫 로드 (≈73 KB gz) 1회 추가 네트워크. 동일 세션 내 다른 슬롯 진입 시 캐시 히트.
- 홈/대시보드/지갑/카지노 로비는 engine 청크 다운로드 0 — Layer 1 부담 제거.
- 런타임 로직/사운드/Crown 보상 경로 변화 0.
