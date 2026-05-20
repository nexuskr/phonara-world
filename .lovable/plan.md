# Layout 통일 (P1-C Layout Hotfix)

## 진단

`StakeStyleSidebar`와 `MobileBottomNav`의 `HIDDEN_PREFIX`는 일치하지만, 사이드바가 라우트 전환 시 깜빡이는 원인은 다음 2가지:

1. **`useEffect` 타이밍**: `has-desktop-sidebar` 클래스를 `useEffect`로 추가/제거 — 라우트 전환 직후 첫 프레임에는 padding-left가 아직 적용/해제되지 않아 컨텐츠가 살짝 점프.
2. **마운트 race**: `StakeStyleSidebar`가 `lazy()` 로드라 첫 진입 시 사이드바 등장이 1-2프레임 늦음. 이때 `<main>`이 padding-left=0 상태로 먼저 paint → 다시 232px shift.

## 변경 (최소 침습 2파일)

### `src/components/nav/StakeStyleSidebar.tsx`
- `useEffect` → `useLayoutEffect` 로 교체 (라우트 전환과 같은 프레임에 padding 동기화).
- 모듈 최상단에서 `document.documentElement.classList.add("has-desktop-sidebar")` 한 줄 즉시 실행 (md+ 전용 CSS이므로 mobile은 영향 없음). 이러면 lazy 로딩 race도 제거.

### `src/App.tsx`
- `StakeStyleSidebar`를 `lazy()` → 정적 import 로 변경 (1.5 KB gz, Layer 1 영향 무시 가능).
- `MobileShell`은 그대로 lazy 유지 (모바일 진입 시에만 필요).

### 검증
- 모든 사용자 라우트(`/`, `/home`, `/duel`, `/trade`, `/phon`, `/wallet`, `/casino`, `/games`, `/empire`, `/missions`, `/profile`)에서:
  - md+ → 좌측 232px 사이드바 + main 콘텐츠 (padding-left 동기화)
  - mobile → 하단 72px 5탭 (사이드바 완전 숨김)
- 비사용자 라우트(`/auth`, `/secure-auth`, `/admin`, `/apex`, `/landing`, `/legal`, `/welcome`, `/guide`)는 둘 다 숨김 (변경 없음)

## 절대 금지
- 머니플로 8경로 변경
- 페이지 코드(Home/Trade/Duel/PHON) 수정
- 백엔드 RPC 수정
