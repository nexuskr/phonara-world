# PHONARA.WORLD — Great Simplification (대개편)

**"5초 안에 이해되는 가상세계."**
복잡함을 다 걷어내고, 처음 들어온 사람이 즉시 **Earn · Bet · Games · Trade** 4개로만 인식하게 만든다.

---

## 0. 핵심 진단 (지금 왜 허접해 보이는가)

1. **첫 화면 정보 폭격** — Dashboard에 카드가 20개+ 노출 (Hero, Briefing, VIP Preview, Stories, Journey Map, Claim Panel, Trading Entry, Casino, KPI×4, HubTabs, FOMO Strip, Crown War, Whale Rail, Bet Panel, P2E, Boost Hero, Feed, Revenue, Challenge, Countdown, Ticker, Attendance, Tier Compare, Jackpot, Bots, Mission, Ranking …)
2. **정체불명 단어** — Empire / Crown / Imperial / Baron / Founding / Galaxy / Cosmic 등 신화 용어가 첫 인상을 흐림. "여기 뭐 하는 곳?"
3. **사이드바·탭·HUB 중복** — HubTabs + EmpireSignature + PowerHeader + WhaleStrikeRail + FomoStrip 동시 표시
4. **CTA 분산** — 베팅, 충전, 미션, 출금, 황제, NFT 버튼이 모두 동급으로 노출됨
5. **시각 톤이 게임/카지노보다 "신비 종교" 느낌** — Stake처럼 "여긴 베팅·게임이구나"가 0.5초 안에 안 와닿음

---

## 1. 새 첫인상 (NORTH STAR)

```text
┌─────────────────────────────────────────────────┐
│  PHONARA.WORLD                    PHON 잔액 + 👤 │
│  ─────────────────────────────────────────────  │
│  💸 EARN     🎰 GAMES     📈 TRADE     🏆 LIVE │   ← 4탭만
│  ─────────────────────────────────────────────  │
│                                                 │
│  [큰 히어로 1장 — 현재 탭에 맞는 메시지 1줄]    │
│  [주요 액션 1개 — "지금 시작 +500 PHON"]        │
│                                                 │
│  [그 아래는 해당 탭의 핵심 카드 3~5개만]        │
│                                                 │
└─────────────────────────────────────────────────┘
                  하단 라이브 티커 1줄
```

**5초 룰:** 첫 화면에서 누구나 "여긴 부업·게임·트레이딩 하는 곳"이라고 즉시 답할 수 있어야 함.

---

## 2. 새 정보 구조 (IA)

### 메인 탭 4개 (좌측 사이드바, 모바일 하단 탭바)

| 탭 | 뜻 | 한 줄 설명 | 들어갈 것 |
|---|---|---|---|
| 💸 **EARN** | 부업 | "무료로 PHON 벌기" | 출석·미션·초대·오퍼월·Play-to-Earn |
| 🎰 **GAMES** | 게임 | "슬롯·크래쉬·룰렛" | 카지노 12종 · 크래쉬 · 룰렛 |
| 📈 **TRADE** | 트레이딩 | "코인 가격 베팅" | TradingArena · NFT 부스트 |
| 🏆 **LIVE** | 라이브·랭킹 | "실시간 빅윈·랭킹·VIP" | Whale Rail · 랭킹 · VIP · Lounge |

### 우측 상단 (영구 표시)
- PHON 잔액 + 충전 버튼 (1개)
- 프로필 아바타 (드롭다운: 지갑/VIP/설정/로그아웃)

### 숨김 처리 (탭 안쪽 메뉴로 이동)
- Empire / Crown / Founding / Galaxy / Cosmic → **"🏆 LIVE > 명예의 전당"** 1개 메뉴로 통합
- Achievements / Missions / Referral → **"💸 EARN"** 안 카드로
- Marketplace / NFT Atelier / Collection → **"📈 TRADE > NFT 부스트"**
- Trust / Legal / Support / Status → **푸터 1줄**

---

## 3. 단어 정화 (브랜딩 톤)

| 기존 (혼란) | 새 (직관) |
|---|---|
| Empire / Imperial / 황제 | **Level** (1~10) |
| Crown | **Bonus Pts** |
| Baron 승급 | **VIP 승급** |
| Founding Seat / Galaxy | **시즌 좌석** |
| Cosmic Emperor | **Top Player** |
| Whale Strike | **Live Wins** |
| Imperial Story | **News** |
| Phonara World ✓ | (유지) |

DB 컬럼·내부 코드는 그대로(`empire_levels` 등) — **UI 문구만 일괄 교체**. 변경 비용 최소.

---

## 4. 페이지별 정리

### `/` (Index, 비로그인 랜딩)
- 풀스크린 히어로 1장 + "지금 가입하고 무료 PHON 받기" CTA 1개
- 아래 4섹션 가로 스와이프: EARN / GAMES / TRADE / LIVE (각 3줄 설명 + 썸네일)
- 푸터: Trust · Legal · Support
- **삭제:** WhaleStrikeRail · VipArrivalsTicker · WorldDominationWall · 트럼프배너 · vs CEX 티커 (모두 LIVE 탭 안으로)

### `/dashboard` → **/home** 으로 리네임
- 상단: PHON 잔액 + 오늘 미션 진행률 1줄
- 큰 카드 1개: "오늘의 추천 행동" (AI Coach 1줄 + CTA 1개)
- 아래 카드 4개만: 출석 · 진행 중 미션 · 진행 중 베팅 · 친구 신청
- **삭제:** Hero V3 풀스크린 / Stories / Journey Map / Claim Panel / KPI Grid / MoreSection 전체 (각 탭으로 이동)

### `/earn` (신규, 단순)
- 5카드 그리드: 출석 · 일일미션 · 친구초대 · Play-to-Earn · 오퍼월

### `/games` (Casino 리네임)
- 카드 12개 그리드, 필터: 인기/신규/잭팟
- 상단에 크래쉬·룰렛 큰 배너 2개

### `/trade`
- 차트 + 베팅 패널만 (현재 TradingArena 정리 버전)
- NFT 부스트는 하단 슬림 카드 1개

### `/live`
- 탭 4개: Live Wins · 랭킹 · VIP · 명예의 전당
- 기존 Empire/Crown/Founding/Galaxy 콘텐츠가 여기로 흡수

---

## 5. 디자인 톤 (Stake·롤빛 수준)

- **다크 베이스** `#0B0E1A` + **네온 골드** `#F0B935` + **액센트** 핫핑크 `#FF3B7C`
- **카드:** 1px 그라디언트 보더 + 미세 글로우. 그림자 최소.
- **여백 크게.** 카드 사이 24px+. 한 화면에 카드 4~5개 이상 금지.
- **폰트:** Pretendard 700/500 (한글) + Space Grotesk 700/500 (영문). 신비주의 폰트 전면 폐기.
- **아이콘:** lucide-react 1.5px 스트로크 통일. 이모지 남발 금지(탭 헤더만 허용).
- **모션:** 0.2~0.3s ease. 풀스크린 화려 연출은 빅윈 순간에만.
- **사운드:** 전역 음소거 기본. 게임 진입 후만 자동 ON.

---

## 6. 6주 → 2주 우선 (Great Simplification 먼저)

이전 마스터플랜의 Week 1~6 시작 전에 **Week 0 (2주) 대개편**을 끼워넣는다.

### Sprint 0-A (Week 1) — IA & 단어 정화
- 사이드바·탭바 4개로 축소 (EARN/GAMES/TRADE/LIVE)
- `/dashboard` → `/home` 슬림 버전으로 교체 (카드 4개)
- `<Layout>` 우측 PowerHeader 단순화 (PHON + 아바타만)
- 단어 사전(`src/lib/i18n/glossary.ts`) 만들고 UI 문구 일괄 교체
- HubTabs / EmpireSignature / FomoNotificationStrip / CrownWarHUD / WorldDominationWall **첫 화면에서 제거** (LIVE 탭 안으로)

### Sprint 0-B (Week 2) — 첫 화면·랜딩 리디자인
- `/` 새 랜딩: 풀스크린 히어로 + 4탭 스와이프 + CTA 1개
- 첫 로그인 60초 온보딩: 가입 → 무료 룰렛 → 미션 1개 → 게임 데모 (단어는 전부 새 사전)
- 다크+골드+핫핑크 토큰 일괄 적용 (index.css 갱신)
- 폰트 교체 + 이모지/신비주의 카피 정리

### → 이후 Week 1~6 (이전 마스터플랜) 그대로 진행
Earn Hub MVP → 듀얼 지갑/환전 → 중독 루프 → 통합 세계관 → VIP·소셜 → 데이터·푸시

---

## 7. 기술 사항

### 제거/이동 대상 컴포넌트 (Dashboard에서)
DashboardHeroV3 / ImperialStoryRail / ImperialJourneyMap / JourneyClaimPanel / KpiGridV3 / MoreSection 안 다수 → **LIVE 탭으로 이동 또는 lazy 유지하되 default off**

### 신규/리네임
- `src/pages/Home.tsx` (새 슬림 Dashboard)
- `src/pages/Earn.tsx` (신규)
- `src/pages/Games.tsx` (Casino 리네임 + 정리)
- `src/pages/Live.tsx` (Empire/Whale/VIP/명예의전당 통합)
- `src/lib/i18n/glossary.ts` (단어 매핑)
- `src/components/nav/MainSidebar.tsx` + `MobileTabBar.tsx` (4탭)

### 디자인 토큰 (index.css)
```css
--bg: 222 47% 7%;
--card: 222 40% 10%;
--gold: 44 88% 58%;
--pink: 340 100% 62%;
--text: 0 0% 96%;
--muted: 222 15% 60%;
```

### 라우트 alias (점진 마이그레이션)
`/dashboard` → `/home` 리다이렉트, `/casino` → `/games`, `/empire/*` → `/live/*` 1주 병행 후 제거.

### 기존 자산 (보존 — UI만 숨김/이동)
모든 RPC·DB·엣지·Empire/Crown/Founding/Galaxy/VIP/NFT 로직 그대로. **시각 노출만 정리.**

---

## 8. 성공 기준 (2주 후)

| 지표 | 현재 | 2주 목표 |
|---|---|---|
| 첫 화면 카드 수 | 20+ | **6 이하** |
| 첫 5초 이해도 (5명 user test) | "모르겠다" | "베팅·부업·게임" |
| Bounce (3초 내) | ~40% | <20% |
| 가입 전환 (랜딩→가입) | ~3% | 8%+ |
| 가입→첫 액션 (미션/베팅) | ~25% | 60%+ |

---

## 9. 다음 액션

승인 시 **Sprint 0-A (IA & 단어 정화) 즉시 착수**.
1주 후 슬림 첫 화면 데모 → 사용자 테스트 5명 → Sprint 0-B 진행.
그 후 이전 마스터플랜 Week 1(Earn Hub MVP)부터 정상 진행.
