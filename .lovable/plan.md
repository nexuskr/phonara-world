## Phase 2 — 비주얼 임팩트 (로그인 시네마틱 + Command Hero + Empire 30석 카운터)

신규 유저가 처음 보는 0.6초 — 그리고 로그인 직후 화면 — 을 Phonara의 무기로 만든다.

---

### 핵심 결정

1. **비주얼 무기는 3D 이미지 1~2장이 전부 — 더 많이 만들면 산만해짐**
   - Login Cinematic용: **Gold Crown + Phone (premium 모델)** — 1장이면 충분
   - Command Hero 배경용: **Imperial Throne 룸 풍경 (standard 모델)** — 흐릿한 배경으로만 사용
2. **시네마틱은 0.6s 안에 끝나야 함** — 더 길면 짜증 유발
3. **실제 데이터(잔고, 미션, 부스트)와 연결** — 예쁘기만 하면 의미 없음
4. **30석 카운터는 이미 컴포넌트 존재** (`EmpireFoundingCounter.tsx`) → 디자인 강화 + 노출 위치 확장만

---

### Step 1. 3D 자산 생성 (premium 1장 + standard 1장)

**1-A. `src/assets/login-crown-phone.png` (premium, transparent_background=true)**
- 프롬프트: "ultra premium 3D rendered golden imperial crown floating above a sleek black smartphone, cinematic studio lighting, glowing imperial gold (#E8B923), subtle cyan and purple rim light, holographic particles, dark void background, hyperrealistic, octane render, luxury empire aesthetic, on a clean transparent background"
- 1024×1024 PNG (alpha)

**1-B. `src/assets/command-throne-bg.jpg` (standard)**
- 프롬프트: "atmospheric cyberpunk imperial throne room, deep black void with gold light beams, holographic data screens floating, volumetric fog, cinematic depth of field, ultra wide shot, dark luxurious empire aesthetic, blurry background plate"
- 1920×1080 JPG (배경용, 매우 흐림)

---

### Step 2. Login Cinematic — `SecureAuth.tsx`

**0.6초 오프닝 시퀀스** (한 번만 실행, 그 후 정적):
- `0.0s`: 화면 검정 + 골드 입자 1개 점등
- `0.15s`: Crown+Phone 이미지 페이드인 + 0.95→1.0 스케일 + 살짝 회전
- `0.3s`: PHONARA 워드마크가 좌우에서 글자 단위로 슬라이드인 (stagger 30ms)
- `0.45s`: 골드 라인 1개가 워드마크 밑으로 그어짐
- `0.6s`: 카드 본체(로그인 폼) glassmorphism + neon-border가 아래에서 fade-up

**기술 스택**: Framer Motion (이미 설치됨? 확인 필요 — 없으면 CSS keyframes만 사용). 안전하게 **CSS keyframes + delay** 만 사용 — 외부 의존성 0.

**구현**:
- `SecureAuth.tsx` 카드 위쪽에 cinematic 컨테이너 추가
- 첫 렌더에만 `sessionStorage` 키로 1회 재생 (재진입 시 스킵)
- 카드 자체에는 영향 없음 (i18n 작업 보존)

---

### Step 3. Command Hero — `Dashboard.tsx` 상단 영웅 카드

기존 Dashboard 위쪽에 **3D 미션 영웅 카드** 1개 추가 (기존 BoostHero 위에 배치):

**구성** (영웅 카드 1개에 모든 게 담김):
- **배경**: `command-throne-bg.jpg` (블러 + 골드 그라디언트 오버레이)
- **좌측 (60%)**:
  - 닉네임 인사 (이미 i18n 'common' 활용)
  - 잔고를 거대 골드 숫자로 (Orbitron, text-5xl, tabular-nums)
  - "Today +X,XXX원" 작은 라벨
- **우측 (40%)**:
  - 오늘의 추천 미션 1개를 **3D tilt 카드**로 (`tilt-card` 유틸 활용)
  - "지금 시작하다" CTA → `/missions`
- **하단**:
  - **Empire 30석 카운터** 풀 위젯 (`EmpireFoundingCounter` 비-compact)
  - 한 줄 (FOMO 핵심 — "X석 남음" 골드 펄스)

**높이**: ~280px (모바일은 세로 스택, 데스크톱은 가로).

**구현 위치**: `Dashboard.tsx` 라인 45 직후 (greeting 위쪽에).
- 기존 greeting/ticker는 영웅 카드 안으로 통합 (중복 제거)

---

### Step 4. Empire 30석 카운터 — 글로벌 노출

현재는 컴포넌트만 있고 어디 노출되는지 약함. 3곳 추가:

1. **Command Hero 하단** (Step 3에 포함)
2. **TopHUD 모바일 컴팩트** — `compact` prop 활용, 잔고 옆에 "Crown 24/30" 작은 칩
3. **Empire 페이지 헤더** — 풀 사이즈

조건: `remaining > 0` 일 때만 노출 (마감 시 자동 숨김).

---

### Step 5. 마이크로 인터랙션 (선택, 임팩트 큼)

- **잔고 숫자 카운트업 애니메이션** (0 → 실제값, 0.8s ease-out) — 첫 진입 1회만
- **Empire 카운터 펄스** — `remaining ≤ 5` 일 때 골드 글로우 펄스
- **Crown 이미지 부유 애니메이션** — 로그인 화면에서 ±4px 위아래 (3s loop)

---

### Step 6. 검증

- 로그인 시네마틱 0.6s 안에 끝나는지 (느리면 답답)
- 모바일에서 영웅 카드 세로 스택 정상
- 영어 모드에서 텍스트 오버플로우 없는지
- 잔고 카운트업이 매 진입마다 안 도는지 (1회 제한)
- 이미지 lazy 로드 + `loading="eager"` (히어로 이미지)

---

### 변경 파일 (예상)

- 생성: `src/assets/login-crown-phone.png`, `src/assets/command-throne-bg.jpg`, `src/components/CommandHero.tsx`, `src/components/CinematicIntro.tsx`
- 편집: `src/pages/SecureAuth.tsx`, `src/pages/Dashboard.tsx`, `src/components/TopHUD.tsx`, `src/components/EmpireFoundingCounter.tsx` (스타일 강화), `src/lib/i18n.ts` (히어로 카드 키 추가)

---

### 작업 순서 (가장 안전)

1. 이미지 2장 먼저 생성 (가장 시간 오래 걸림)
2. `CinematicIntro.tsx` (재사용 가능한 0.6s 시퀀스) — SecureAuth에 마운트
3. `CommandHero.tsx` — Dashboard 상단에 마운트
4. EmpireFoundingCounter compact 버전 TopHUD에 추가
5. 영어/한글 둘 다 회귀 테스트

---

### 다음 페이즈 (이후 작업)

- Phase 2.6: 나머지 i18n + 토스트 메시지
- Phase 2.7: 모바일 성능 최적화 (Lighthouse)
- Phase 3: Empire Tier 비주얼 + 게임화

이 한 페이즈로 **Phonara의 첫인상이 완전히 바뀝니다**. 이미지 2장이 게임체인저.
