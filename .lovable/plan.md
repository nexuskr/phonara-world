
# /guide?tab=starter — Empire Cinematic V2

현재 상태: 10씬(`FomoScrollHero` → `SceneProblem/Solution/Proof/Persona/NetworkEffect/GuildWar/EmpireMap/Package` → `FomoFinalCTA`), `EmpireFX`(GoldNebulaBg/ParticleField/AnimatedCounter/SimBadge/senior 토큰) 적용 완료, Magic Link CTA, 70대 친화 22px+ 본문/64px+ 버튼, scroll-snap.

V2의 목표는 "이미 좋은 페이지"를 **3배 더 영화처럼** 만드는 것 — 새 씬은 추가하지 않고, 모든 씬의 모션·층감(layered depth)·임페리얼 인장을 강화한다.

---

## 1. EmpireFX 강화 (모든 씬 공통)

`src/components/guide/EmpireFX.tsx`에 새 프리미티브 추가:

- **`GoldOrbitField`** — 캔버스 기반 황금 입자가 곡선 궤도(orbit)를 도는 0.6 FPS 저전력 효과. 현재 `ParticleField`(랜덤 점멸)보다 한 단계 위. `prefers-reduced-motion` 시 정적 PNG 폴백.
- **`ImperialSeal`** — SVG 골드 인장(원형 + 왕관 + "EMPIRE · EST. 2024" 각인), 호버/뷰포트 진입 시 회전 + 빛 번짐. Proof 씬의 "운영자 무손실 황금 인장"으로 사용.
- **`ParallaxLayer`** — `useScroll` + `useTransform` 기반 컴포넌트. 씬 내부에서 배경/중경/전경 3겹 시차 스크롤.
- **`CinemaTransition`** — 씬 사이에 들어가는 12px 높이의 황금 leak/glow strip. snap 경계가 영화 컷처럼 느껴지게.
- **`GoldVignette`** — 화면 코너 4개 골드 글로우 SVG. 모든 씬 최상단에 1회만.
- 기존 `GoldNebulaBg`는 그라데이션을 한 단계 더 짙게 (gold/30 → gold/45, 추가 라디얼 2개).

토큰만 사용(`--gold`, `--imperial`, `--destructive`, `--secondary`). 1픽셀 불변.

## 2. 씬별 V2 강화

### 씬1 HERO (`FomoScrollHero.tsx`)
- 타이틀을 화면 폭의 88%까지 키우고 `font-imperial` + 황금 그라데이션 위에 **얇은 골드 stroke + 큰 drop-shadow**.
- "오늘 누적 출금" 박스를 **3카드 라이브 대시보드**로 확장: 동시접속 / 오늘 누적 출금 / 평균 출금시간(`LivePayoutSlaBadge`). 각 카드 `glass-strong` + 골드 hairline.
- 배경에 `GoldOrbitField` + `ParallaxLayer`로 골드 행성 SVG(느린 회전).
- CTA 버튼에 sheen 애니메이션을 **2.4s 주기 골드 wave**로 교체, 버튼 그림자를 `glow-gold-xl`로.

### 씬2 PROBLEM
- 3개 통계 카드를 **세로 카운트업 + 가로 빨간 임팩트 라인**(SVG `path` length 애니메이션)으로 강화.
- 시니어 친화 폰트 사이즈를 기본 22px → **24px**로 한 단계 더 올린 분기(`senior.bodyXl`).
- 카드 진입 시 살짝 흔들리는 `shake` 키프레임(reduce-motion 시 생략).

### 씬3 SOLUTION (60초 군대 배틀)
- 현재 SoldierRow를 **15→25명**으로 확대하고, 진격 애니메이션을 `motion.g` keyframe으로 좌→우 슬라이드.
- 승리 시점에 **골드 임펄스 펄스**(원형 ring 2겹 expand) + "내 군대 승리" 자막 카드.
- 상단에 ↑/↓ 두 거대 버튼 데모(실제 동작 X, 단순 시각 데모).

### 씬4 PROOF
- `PayoutTicker`를 풀너비 + 위/아래 **골드 페이드 마스크**로 둘러싸 영화 자막처럼.
- `LivePayoutSlaBadge` 옆에 새 **`ImperialSeal`** 컴포넌트 배치 — "운영자 무손실 · 출금 100% 보장" 각인. 클릭 시 약관 페이지(`/legal/escrow`)로.
- 하단에 "최근 24h 출금 ₩X,XXX,XXX,XXX" 메가 카운터.

### 씬5 PERSONA
- 20·40·60대 아바타 3개를 **`@dicebear` 대신 인라인 SVG 초상**(이미 있는 디자인 시스템 컬러로) 또는 `lovable-asset` 이미지로 교체. 70대도 읽히도록 22px+ 인용문.
- 각 카드에 **3D tilt**(`framer-motion` `whileHover` rotateX/Y ±6°, reduce-motion 시 비활성).
- 카드 하단에 작은 "지금 ₩X만원 누적 출금" 라이브 미니바.

### 씬6 NETWORK EFFECT (기존)
- SVG 트리 노드를 **펄스 링**(2겹 expanding ring)으로 강조.
- "1명 데려오면 평생 5%" 문구를 **임페리얼 인장 미니 버전**으로 감싸기.

### 씬7 GUILD WAR (기존)
- TOP 3 길드 카드에 **순위 메달 SVG**(1=gold, 2=silver, 3=bronze) + 골드 외곽선.
- "상금 풀" 카운터를 헤더 메가 사이즈로.

### 씬8 EMPIRE MAP (기존)
- 9개 region circle에 **점령 진행 ring** 애니메이션 추가.
- 지도 위 골드 헤일로(radial gradient) 보강.

### 씬9 PACKAGE (`ScenePackage`)
- `EmpireMonarch` 카드에 **회전 골드 frame**(2.4s linear) + `RecoveryBonusCalculator` 결과에 **숫자 폭발**(particles burst 12개 SVG).
- 카드 진입 시 `scale 0.92 → 1` + `boxShadow` 키프레임.

### 씬10 FINAL CTA (`FomoFinalCTA`)
- 버튼을 **80px 높이**로 키우고 💎 아이콘을 SVG로 교체(애니메이션 회전).
- 버튼 아래 **"지금 18,432명이 보고 있습니다"** 라이브 시청자 카운터(`SimBadge`).
- 버튼 위에 **`ImperialSeal`** + "환불보장 / 19+ 본인인증 / OTP 필수" 3-pill row.

## 3. 시네마틱 전환 (씬 사이)

- `Guide.tsx`에서 각 starter 씬 사이에 `<CinemaTransition />` 삽입 (12px 골드 leak strip + 1.2s shimmer). snap-stop이 아니므로 스크롤 흐름 그대로.
- 씬 진입 시 `whileInView` margin을 `-40px` → `-80px`로 통일 → 더 일찍 모션 시작.

## 4. 타이포 & 토큰

- `tailwind.config.ts`에 `glow-gold-xl`, `text-gradient-imperial-2` 두 토큰만 추가 (기존 토큰 확장).
- `senior` 객체에 `bodyXl: "data-[large=true]:text-[24px]"` 추가, 본문 분기를 22px→24px로 한 단계 올린다.
- `index.css`에 `--gold-stroke` HSL 토큰 1개 추가(타이틀 1px stroke용).

## 5. 백엔드/데이터 — 0 변경

- 모든 카운터·티커는 기존 `useOnline`, `LivePayoutSlaBadge`, `PayoutTicker`, `get_referral_stats`, `guilds` SELECT 그대로.
- 새 RPC·테이블·RLS 없음. 결제·출금·게임 엔진·미션 로직 1픽셀 불변.
- AdultGate / Magic Link / 19+ 컴플라이언스 그대로.

## 6. 회귀 보호

- `?tab=detail` 코드 경로(`SceneTrust/Hook/LiveProof/...`)는 건드리지 않음.
- `prefers-reduced-motion` 분기 모든 신규 모션에 적용(`useReducedMotion`).
- 모바일 360px 폭에서 본문 22px+ / 버튼 56px+ / CTA 64px+ 유지, scroll-snap 정상.

## 7. 변경 파일 (예상)

```text
src/components/guide/EmpireFX.tsx          (확장: GoldOrbitField, ImperialSeal, ParallaxLayer, CinemaTransition, GoldVignette)
src/components/guide/FomoScrollHero.tsx    (3카드 라이브 대시보드, 행성 파라랙스)
src/components/guide/FomoScrollScenes.tsx  (씬2~5 모션 강화, ImperialSeal, 3D tilt)
src/components/guide/SceneNetworkEffect.tsx (펄스 링, 미니 인장)
src/components/guide/SceneGuildWar.tsx     (메달 SVG, 메가 카운터)
src/components/guide/SceneEmpireMap.tsx    (점령 ring 애니)
src/components/guide/FomoFinalCTA.tsx      (80px 버튼, 인장, 시청자 카운터)
src/pages/Guide.tsx                        (CinemaTransition 삽입만)
tailwind.config.ts                         (glow-gold-xl 토큰 1개)
src/index.css                              (--gold-stroke 토큰 1개)
```

신규 컴포넌트 0개, 신규 테이블 0개, 신규 RPC 0개.

---

이대로 진행할까요?
