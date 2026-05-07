## Phonara 다국어 시스템 (Phase 2.5) - 최종 실행 계획

해외 유저 유입 + 한글 최적화 동시 달성. 확장 가능한 i18n 인프라를 깔되, 실용적 단계로 분할.

### 핵심 결정사항 (개발자 관점 최적화)

1. **언어**: Phase A는 **한국어(ko) + 영어(en)** 만. 나머지는 인프라만 준비.
2. **라이브러리**: `react-i18next` + `i18next-browser-languagedetector` (업계 표준, 가장 안정적)
3. **번역 파일**: JSON, namespace 분리, **번들에 포함** (lazy-load 대신 import — Vite에서 더 안정적, CDN 라운드트립 제거)
4. **한글 폰트**: **Pretendard Variable** 추가 (현재 Fraunces/Italiana는 라틴 전용 → 한글 글자 깨짐 위험 해결)
5. **이번 페이즈 범위**: 인프라 + LanguageSwitcher + 핵심 3개 영역(auth, nav, onboarding) 까지. 나머지 허브는 **다음 페이즈**.

---

### Step 1. 인프라 구축

**패키지 설치**
- `i18next`, `react-i18next`, `i18next-browser-languagedetector`

**파일 구조**
```text
src/
  lib/
    i18n.ts                    // init + config
    formatters.ts              // formatKRW, formatDate (Intl 기반)
  locales/
    ko/
      common.json   nav.json   auth.json   onboarding.json   topbar.json
    en/
      (동일 5개 파일)
  components/
    LanguageSwitcher.tsx       // 글로브 드롭다운
```

**`i18n.ts` 핵심 설정**
- `fallbackLng: 'ko'`
- `supportedLngs: ['ko', 'en']`
- detection 순서: `localStorage('phonara-lang')` → `navigator` → `ko`
- `interpolation.escapeValue: false`
- 모든 namespace를 정적 import (번들 포함, 초기 로드 ~15KB gzip)

**`main.tsx`**
- `import './lib/i18n'` 추가 (App 렌더 전 초기화)

### Step 2. 한글 최적화 (i18n과 별개로 즉시 효과)

**`index.css`**
- Pretendard Variable CDN import (`cdn.jsdelivr.net/gh/orioncactus/pretendard`)
- `body { font-family: 'Pretendard Variable', Fraunces, ... }` (한글은 Pretendard, 라틴은 Fraunces fallback 자동)
- 글로벌 `word-break: keep-all; overflow-wrap: break-word;` (한글 단어 중간 끊김 방지)
- 숫자 전용 클래스 `.tabular-nums` 유지 (Orbitron)

**`formatters.ts`**
- `formatKRW(n)` → `Intl.NumberFormat(currentLang, { style:'currency', currency:'KRW' })`
- `formatNumber(n)` → 천단위 콤마
- `formatDate(d)` → 현재 locale 따라 포맷

### Step 3. LanguageSwitcher 컴포넌트

**디자인** (Phonara 디자인 시스템 일관성)
- 작은 버튼: 글로브 아이콘(lucide `Globe`) + 현재 언어 코드(`KO`/`EN`)
- 클릭 시 glassmorphism 드롭다운 (gold border, void-black bg)
- 옵션: `🇰🇷 한국어` / `🇺🇸 English`
- 선택 → `i18n.changeLanguage(code)` + `localStorage` + `document.documentElement.lang = code`

**배치**
1. `TopHUD.tsx` 우측 끝 (로그인 후 항상 노출)
2. `SecureAuth.tsx` 우상단 (로그인 전 — 해외 유저 첫인상)

### Step 4. 핵심 3영역 i18n 적용

우선순위 순:

**4-1. `auth.json`** — `SecureAuth.tsx`, `Auth.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`, `CompleteProfile.tsx`
- 로그인/가입/PIN/비밀번호 관련 모든 텍스트
- 신규 해외 유저가 가장 먼저 보는 화면 → 최우선

**4-2. `nav.json` + `topbar.json`** — `Layout.tsx`, `HubTabs.tsx`, `TopHUD.tsx`
- 5-Hub 라벨: Command/Earn/Empire/Treasury/Legacy + 한글 라벨
- 사이드바, 하단탭, FAB 라벨
- TopHUD의 "잔고/Balance", "활성 부스트/Active Boost" 등

**4-3. `onboarding.json`** — `FirstTimeOnboarding.tsx`, `FirstMissionCard.tsx`
- 3-step 환영 멘트
- "First Mission" 카드 카피

**4-4. `common.json`** — 버튼/공통 라벨
- "확인", "취소", "저장", "로딩 중..." 등 글로벌 재사용

### Step 5. SEO 다국어

**`index.html`**
- `<html lang="ko">` 동적 업데이트는 LanguageSwitcher가 처리
- hreflang 메타 추가:
  ```html
  <link rel="alternate" hreflang="ko" href="https://phonara.world/" />
  <link rel="alternate" hreflang="en" href="https://phonara.world/?lang=en" />
  <link rel="alternate" hreflang="x-default" href="https://phonara.world/" />
  ```
- `?lang=en` query param 지원 (i18n detection에 추가)

### Step 6. 검증

- 영어 모드 전체 회귀: SecureAuth → 온보딩 → Layout 네비게이션
- 텍스트 오버플로우 체크 (영어가 한글보다 길다 — 버튼/라벨 길이 검증)
- localStorage 영속성: 새로고침 시 언어 유지
- 한글 워드브레이크: 긴 한글 문장이 단어 중간에 끊기지 않는지

---

### 다음 페이즈 (이번 작업 X — 미리 안내)

- **Phase 2.6**: 5-Hub 페이지 본문 i18n (Dashboard, Missions, Packages, Wallet, Achievements 등)
- **Phase 2.7**: 토스트/에러 메시지 i18n (Sonner 메시지 전체 키화)
- **Phase 2.8**: 일본어(ja), 중국어 간체(zh-CN) 추가
- **Phase 3.x**: 이메일 템플릿 + edge function 메시지 다국어

---

### 예상 영향

- 번들 크기: +20KB gzip (i18next + locales 5개 namespace × 2 언어)
- 초기 로드 영향: 미미 (Pretendard CDN은 unicode-range subset으로 lazy)
- 코드 영향 파일 수: ~15개 (인프라 4 + 핵심 페이지 11)
- 한글 가독성: 즉시 개선 (Pretendard + word-break)

이 한 페이즈 안에 위 Step 1~6 모두 완료. 사용자가 즉시 글로브 아이콘으로 언어 전환 가능.
