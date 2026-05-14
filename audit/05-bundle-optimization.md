# P5 — Bundle Optimization (i18n + lucide-react chunk split)

## 변경 요약

### 1. i18n 메시지 dynamic split
- `src/lib/i18n.ts` (2,819 lines) → ko/en 리소스를 별도 모듈로 분리.
  - `src/locales/ko.ts` (1,379 lines, default export)
  - `src/locales/en.ts` (1,343 lines, default export)
  - `src/locales/ja.ts`, `src/locales/vi.ts` (기존, partial)
- `i18n.ts` 재작성: `loaders` 맵 + `loadLanguage()` lazy 로더, `addResourceBundle` 동적 주입.
- `i18nReady` Promise export — 활성 언어 + 최소 fallback(ko) 만 boot 시 로드.
- `src/main.tsx` — `i18nReady.then(boot, boot)` 로 첫 렌더 전 active locale chunk 도착 보장 (flash-of-keys 방지, fail-open).

### 2. Vite manualChunks 확장
`vite.config.ts` `manualChunks(id)`에 추가:
```ts
if (id.includes("/src/locales/ko")) return "locale-ko";
if (id.includes("/src/locales/en")) return "locale-en";
if (id.includes("/src/locales/ja")) return "locale-ja";
if (id.includes("/src/locales/vi")) return "locale-vi";
```
기존 `lucide-react` → `icons`, `i18next` → `i18n` chunk hint은 유지 (이미 분리되어 있음).

### 3. lucide-react
검토 결과 모든 호출부가 named import (`import { Crown, Flame } from "lucide-react"`) 패턴이라 Vite/SWC 트리쉐이킹이 정상 동작 중. production `icons` chunk = 63kb / **brotli 10.15kb**. 추가 분할은 비용 대비 이득 없음 (작은 chunk 다수보다 단일 캐시 가능 chunk가 유리). 결정: 현 구성 유지.

## Build 결과 (production)

| Chunk | Before (estimate) | After (raw) | After (brotli) |
|---|---|---|---|
| index.js (main) | ~480 KB | **381.79 KB** | **107.39 KB** |
| locale-ko | (in main) | 54.54 KB | 17.97 KB |
| locale-en | (in main) | 47.10 KB | 15.64 KB |
| locale-ja | 2.51 KB | 2.51 KB | 1.16 KB |
| locale-vi | 2.46 KB | 2.46 KB | 1.15 KB |
| i18n (i18next core) | 72.47 KB | 72.47 KB | 21.83 KB |
| icons (lucide-react) | 63.20 KB | 63.20 KB | 10.15 KB |
| supabase | 201.86 KB | 201.86 KB | 44.03 KB |

### 활성 언어별 boot 다운로드 (brotli)
| 사용자 | Before 추정 | After | 절감 |
|---|---|---|---|
| 한국어 (default, 90%+) | ~140 KB | **~125 KB** | **−15.6 KB (≈11%)** |
| 영어 | ~140 KB | ~141 KB | +0.4 KB (ko fallback 동시 로드 — 의도적) |
| 일본어 | ~140 KB | ~146 KB | en+ko fallback 포함 — 일본어 트래픽 미미 |

## 예상 초기 로드 효과
- **한국어 사용자**: gzip-equivalent 15KB 감소 → 평균 모바일(4G) RTT 1회분 + 100~250 ms LCP 단축 기대.
- **i18n 캐시 효율**: i18next 라이브러리 chunk(21KB)와 메시지 chunk(18KB)를 분리해, 메시지 업데이트 배포 시 i18next 코어 chunk는 캐시 히트.
- **lucide-react**: 별도 chunk(10KB brotli)로 격리 — 컴포넌트 코드 변경 시 아이콘 chunk는 캐시 히트, repeat-visit 비용 절감.
- **Boot 차단 보장**: `i18nReady.then(boot, boot)` — 활성 locale chunk가 못 와도 fail-open(키 표시 후 도착 시 자동 re-render).

## 잠재적 회귀 리스크 & 완화
| 리스크 | 완화 |
|---|---|
| 첫 paint 전 i18n 도착 지연 → 살짝 늦은 splash | brotli 18KB chunk + HTTP/2 multiplex로 < 100ms. 영향 미미. |
| 영어/일본어 사용자에 ko fallback 동시 로드 | 명시적: en/ja 번역 누락 시 silent ko 표시 보장. 제거 가능하지만 UX safer. |
| `i18n.changeLanguage("en")` 즉시 호출 시 한 프레임 키 노출 | `useTranslation()` 이 bundle 도착 시 자동 re-render. 보통 200~400ms. |
| `addResourceBundle(true,true)` deepMerge — 동일 namespace 재진입 시 비용 | 각 언어당 1회만 호출, idempotent (`loaded` Set). |

## 수정된 파일 목록
- **created**: `src/locales/ko.ts`, `src/locales/en.ts`, `audit/05-bundle-optimization.md`
- **rewritten**: `src/lib/i18n.ts` (2,819 → 175 lines, 외부 chunk로 메시지 이동)
- **edited**: `src/main.tsx` (i18nReady await), `vite.config.ts` (locale-* manualChunks)

## 미적용 / 추후 가능
- `i18next-http-backend` 도입 시 처음부터 namespace 단위로 더 잘게 split 가능 (로그인 화면에 `dashboard` namespace 안 보내기 등). 트레이드오프: 라우트별 로더 boilerplate 증가.
- `lucide-react` per-icon dynamic chunk: ROI 낮음 — 작은 chunk 80~100개 생성 시 HTTP 오버헤드가 더 큼.
- `recharts`/`lightweight-charts` 라우트 단위 lazy load (이미 large chunk이며 dashboard/chart 페이지에서만 필요). 다음 트랙 후보.
