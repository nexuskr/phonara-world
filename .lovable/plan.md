## 목표
`/secure-auth` 로그인 페이지를 6번 레퍼런스 + 사용자 첨부 "서울 야경" 이미지를 배경으로 하는 풀스크린 다크 영화적 화면으로 리뉴얼. 좌측 = 진입(이메일/소셜 로그인 카드), 우측·배경 = 글로벌 제국 사회적 증명(LIVE FEED · TOP 5 · CROWN EXPLOSION · 신뢰 배지). 기존 백엔드 RPC만 사용 — 신규 마이그레이션 0건.

## 배경 처리 (변경된 핵심)
**사용자 첨부 서울 야경 이미지를 그대로 배경 베이스로 사용 + 6번 사진 스타일로 업그레이드.**

레이어 스택(아래 → 위):
1. `bg-[url('/auth-seoul-night.jpg')] bg-cover bg-center` — 첨부된 서울 야경 사진을 `public/auth-seoul-night.jpg`로 저장해 그대로 사용.
2. 디밍 그라디언트 오버레이 — `bg-gradient-to-b from-background/40 via-background/70 to-background/95` (상단 살짝 비치고 하단으로 갈수록 가독성 확보).
3. 골드 비네트 — `radial-gradient(ellipse at 70% 30%, hsl(var(--gold)/0.18), transparent 60%)` (6번 사진의 골드 무드).
4. SVG 도트 그리드 + 가는 위경도 라인 (불투명 8%) — 6번 사진의 "데이터 시티" 느낌.
5. 라이브 펄스 마커 — `LiveFeedPulses.tsx`(신규)가 `get_whale_strikes_24h` 결과의 country를 위경도로 매핑(`src/lib/countryLatLng.ts` 신규 ~60개국 정적 테이블)해서 화면 위에 골드/시안 ring 펄스. 신규 LIVE FEED row마다 새 펄스 1.6s 트리거. `prefers-reduced-motion` 시 정적 dot.
6. 모바일(<md)에서는 배경 이미지 더 강하게 dim(`bg-background/85`)해서 폼 가독성 우선.

three.js/3D 의존성 **추가하지 않음** — 첨부 사진 자체가 도시 스카이라인이므로 3D 글로브는 중복. 펄스만 SVG로 오버레이해서 6번 사진의 "글로벌 라이브" 효과를 더 가볍게 구현.

## 데이터 소스 (기존 RPC만, 신규 0)
- `get_world_domination_stats()` → 상단 KPI 4개(총 사용자 / 온라인 / 24h 거래량 / 누적 지급액). 30s 폴링 + `useCountUp` 부드럽게 변동.
- `get_whale_strikes_24h(40)` → LIVE FEED 마키(국기 + 마스킹 닉 + 이벤트 + 금액 + "Xs ago"). 60s 폴링 + `crown_events` realtime 신규 row prepend.
- `get_weekly_referral_leaderboard(5)` → TOP 5 EMPERORS THIS WEEK 우측 패널. 60s 폴링.
- `crown_events`(realtime) → 24h CROWN EXPLOSION 카운터(`useCountUp`) + 신규 이벤트 시 파티클 버스트 + 배경 펄스 트리거.

## 화면 레이아웃
```text
┌──────────────────── 풀스크린 (배경: 서울야경 + 오버레이 + 라이브 펄스) ────────────────────┐
│ TOP BAR  [PHONARA 로고]   KPI 4개(실시간 카운트업)        [Lang ▾]                       │
│                                                                                          │
│ ┌────────── 좌측 (5/12, md+) ──────────┐    ┌────────── 우측 (7/12) ──────────────────┐ │
│ │ H1 "당신의 제국이 지금 시작됩니다"     │    │ ▣ LIVE FEED — 세로 무한 마키            │ │
│ │ sub: "글로벌 12만 황제 · 실시간 가동"  │    │   🇰🇷 KIM**  Crown ×2.4  +12,400 PHON  │ │
│ │                                       │    │   🇺🇸 JOH**  Withdraw   $48,200         │ │
│ │ [로그인 / 회원가입 탭]                 │    │   🇯🇵 SAT**  Baron 승급                  │ │
│ │  · 이메일 / 비밀번호                   │    │   …                                      │ │
│ │  · Google 로그인 버튼                  │    │ ▣ TOP 5 EMPERORS THIS WEEK              │ │
│ │  · "5초 매직링크" 보조 링크            │    │   1. 🥇 LEE**   1,240 RP                │ │
│ │                                       │    │   2. 🥈 PAR**     980 RP                │ │
│ │ ─ 신뢰 배지 6칩 (강화)                │    │ ▣ CROWN EXPLOSION COUNTER ×N           │ │
│ │   100% Anonymous · AAL2 · KYC-Free   │    │   (24h 누적 + 폭발 파티클)              │ │
│ │   AES-256 · 24/7 Ops · Bank-grade    │    │                                          │ │
│ │                                       │    │                                          │ │
│ │ ── 폼 하단 한 줄 ─────────────────── │    │                                          │ │
│ │ "PHONARA EMPIRE는 만 19세 이상       │    │                                          │ │
│ │  성인만 이용 가능한 서비스입니다."    │    │                                          │ │
│ └───────────────────────────────────────┘    └──────────────────────────────────────────┘
│                                                                                          │
│ BOTTOM 마키: Crown War · NFT Atelier · AI Coach · Galaxy Auction · Empire Booster · ... │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## 컴포넌트 계획 (신규는 모두 `src/components/auth/`)
1. `AuthSeoulBackdrop.tsx` — `public/auth-seoul-night.jpg` + 그라디언트 오버레이 + 골드 비네트 + 도트그리드 SVG. `<LiveFeedPulses/>` 자식으로 렌더.
2. `LiveFeedPulses.tsx` — 부모로부터 받은 최근 LIVE FEED 이벤트의 country → 위경도 → SVG `<circle>` 펄스. framer-motion `AnimatePresence`로 1.6s 후 자연 소멸. reduced-motion fallback.
3. `LiveFeedRail.tsx` — `get_whale_strikes_24h(40)` 60s 폴링 + `crown_events` realtime prepend, framer-motion 무한 세로 마키, 국기 이모지 + 마스킹 닉 + 이벤트 + 금액 + 상대시간(매초 갱신은 `use-now-tick` 훅 재활용). 부모(SecureAuth)에 onNewEvent 콜백을 통해 펄스 트리거.
4. `Top5EmperorsCard.tsx` — `get_weekly_referral_leaderboard(5)` 60s 폴링.
5. `CrownExplosionCounter.tsx` — `crown_events` realtime + `useCountUp` + 신규 시 골드 파티클 버스트(framer-motion).
6. `LiveKpiBar.tsx` — `get_world_domination_stats()` 30s 폴링 + `useCountUp`(기존 `src/hooks/use-count-up.ts` 재사용).
7. `TrustBadgeStrip6.tsx` — 6칩 (100% Anonymous · AAL2 Secured · 24/7 Live Ops · Bank-grade AES-256 · KYC-Free · SOC2-aligned).

기존 파일 수정:
- `src/pages/SecureAuth.tsx` — 레이아웃 전면 교체. **로그인/회원가입/Google OAuth 로직과 zod 스키마는 그대로 보존**, 좌측 카드 안으로 이동. 폼 하단에 사용자가 지정한 한 줄 문구 추가.
- `index.css` — 필요 시 `.auth-vignette`, `.auth-dotgrid` 유틸 추가(HSL 토큰만 사용).

`src/lib/countryLatLng.ts` (신규, 정적 ~60개국 lookup table) — 펄스 좌표 매핑.

## 자산
사용자 첨부 서울 야경 이미지를 `public/auth-seoul-night.jpg`로 저장(빌드 시 정적 서빙). 이미지가 무거울 경우 `bun add sharp`(이미 있음) 활용해 ≤300KB로 압축.

## 의존성
**신규 패키지 0건**. three/R3F 추가 안 함. framer-motion / lucide-react / supabase-js / zod 모두 기존 사용중.

## 실시간 변동 매핑 (요구사항 점검)
- ✅ KPI 4숫자 → `useCountUp` + 30s 폴링.
- ✅ CROWN EXPLOSION 카운터 → `crown_events` realtime + `useCountUp`.
- ✅ LIVE FEED → 60s 폴링 + realtime prepend + 매초 "Xs ago" 갱신 + 무한 마키.
- ✅ TOP 5 RP 숫자 → 60s 폴링 + `useCountUp`.
- ✅ 배경 글로벌 펄스 → LIVE FEED 신규 row마다 해당 국가 좌표에 ring 트리거.
- ✅ LIVE FEED 국기 이모지 — 기존 `get_whale_strikes_24h` 응답에 country 코드가 있으므로 `🇰🇷` 등 그대로 표시. 누락 시 `🌐` 폴백.

## 폼 하단 한 줄 (사용자 지정 문구)
```
PHONARA EMPIRE는 만 19세 이상 성인만 이용 가능한 서비스입니다.
```
- 위치: 로그인/회원가입 카드 폼 가장 아래, 신뢰 배지 6칩 위.
- 스타일: `text-[11px] text-muted-foreground text-center break-keep`, `lucide-react ShieldAlert` 아이콘 좌측.
- 기존 상단 `<AdultOnlyBanner/>`는 유지(중복 OK — 상단 경고 + 하단 안내).

## 범위 외 (이번 PR에서 안 함)
- 신규 마이그레이션 / RPC / 엣지 함수 0건.
- `Auth.tsx` 리다이렉트 셸·라우팅 변경 없음.
- 결제 / 관리자 페이지 / 모바일 네이티브 변경 없음.
- 3D 글로브(R3F) 도입 안 함 — 첨부 사진이 도시 스카이라인이라 중복.

## 검수 절차
1. 빌드 통과(신규 패키지 0건 → 번들 사이즈 동일).
2. 미인증 상태로 `/secure-auth` 진입:
   - 서울 야경 배경 + 골드 비네트 + 도트그리드 + 라이브 펄스 노출.
   - KPI 4개 카운트업, LIVE FEED 마키, TOP 5, CROWN EXPLOSION, 6칩 신뢰 배지, 폼 하단 19+ 문구 노출.
   - LIVE FEED 신규 row마다 배경 좌표에 펄스 트리거.
3. 로그인 / 회원가입 / Google OAuth 모두 정상(기존 회귀 없음).
4. `prefers-reduced-motion` ON 시 마키 정지 + 펄스 정적 dot.
5. 모바일(<md): 배경 더 강하게 dim, 우측 패널은 폼 아래로 스택 — 폼 가독성 우선.
6. Lighthouse: LCP < 2.5s 유지(배경 이미지 압축 + `loading="eager" fetchpriority="high"`).
