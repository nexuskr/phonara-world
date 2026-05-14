
# Phase D — World #1 Empire (사용자 피드백 반영 최종판)

순서 변경: **Week 1 → Week 3(Viral) → Week 2(AI/PWA) → Week 4(Monetization)**
이유: 바이럴이 유입을 만들고 → AI가 유지율을 만들고 → VIP가 수익화. 반대로 가면 초기 모멘텀이 약해짐.

---

## Week 1 — "살아있는 제국" 기반 (필수 선행)

### 1.1 `<WorldDominationWall />` (홈 최상단)
3초 안에 "여기 사람 많다 / 돈이 돈다 / 세계가 움직인다"를 체감.

**구성 요소**
- **글로벌 KPI 행**: 24h GMV · 누적 출금 · 동시접속(Supabase Presence) · 활성 Empire 수 · 최대 Crown 폭발
- **국가별 깃발 마키**: 최근 24h 활동 국가 top 12, 깃발 + 활동량
- **🆕 LIVE NOW 인간 피드** (60초 윈도)
  - "🇯🇵 Emperor minted Legendary NFT"
  - "🇰🇷 Whale triggered Crown Explosion +2,341"
  - "🇺🇸 Baron reached Tier 9"
  - 마스킹 닉네임, framer-motion 슬라이드 인
- **🆕 시간대 자동 헤드라인**
  - 09–18 JST → "Tokyo Empire Rising"
  - 09–17 EST → "New York Session Active"
  - 02–06 KST → "Night Crown Rush"
  - 21–24 KST → "Korean Prime Hour"
  - 서버 UTC + 사용자 locale로 결정

**백엔드**
- 공개 RPC `get_world_domination_stats()` — 5초 캐시
- 공개 RPC `get_live_activity_60s(_limit)` — 마스킹된 최근 60초 이벤트 (atelier_runs/crown_events/empire_levels/nft_collection 머지)
- Supabase Presence 채널 `world` (가입자 수만 노출)
- `function_permissions_baseline` 등록 + drift 통과

### 1.2 다국어 SEO/OG 완성
- `react-helmet-async` 도입 + 라우트별 `<Helmet>` (lang/og:locale/canonical 분기 ko/en/ja/zh)
- `scripts/generate-sitemap.ts` (predev/prebuild) + hreflang
- `og-card-renderer` 확장: `?locale=` + `?style=epic` 파라미터

### 1.3 🆕 감정형 동적 OG 이미지
공유 링크 = 광고. 정적 카드 X.

**5종 템플릿** (`og-card-renderer` 내부 SVG)
- `crown_explosion`: 붉은 폭발 + 황금 왕관 + 유저명 + Crown 수치
- `legendary_mint`: NFT rarity glow + 별빛 파티클 + "WORLD #1 EMPIRE"
- `baron_promotion`: 7+ 티어 코로나 + 승급 호칭
- `world_rank`: 글로벌 순위 + 국가 깃발
- `default_empire`: 사이트 기본

**호출 예**
```
/og?style=crown_explosion&user=Phantom&crown=2341&locale=ko
```

---

## Week 3 — Viral Loop (다음 우선)

### 3.1 1탭 외부 공유 + 보상
- `<StoryShareButton />` 확장: X / 카카오 / 라인 / Threads / 클립보드
- 공유 시 동적 OG (Week 1.3 사용)
- `share_events` + `record_share(kind, channel)` RPC, 일 3회 +5 PHON

### 3.2 인플루언서 커스텀 referral
- `/referral` 확장: 커스텀 슬러그 + 실시간 conversion 위젯
- 인플루언서 전용 30일 leaderboard

### 3.3 라이브 시즌 토너먼트 (월/수/금 정기)
- `tournaments` 테이블 + `enter_tournament` / `settle_tournament` (cron)
- `/tournaments` + 홈 `<TournamentRail />`

### 3.4 OBS 라이브 오버레이 (`/live`)
- transparent 배경, 스트리머가 OBS browser source로 임베드
- 실시간 PnL · Crown 획득 · NFT 폭발 · Empire Tier 변동
- URL 토큰 인증으로 본인 데이터 표출

---

## Week 2 — 습관 형성 + AI

### 2.1 🆕 `<DailyBriefingCard />` (가장 중요)
"매일 돌아오게 만드는 이유". 09:00 KST 리셋, 5칸 카드.

| 칸 | 내용 |
|---|---|
| 오늘의 미션 | persona 기반 1개, 클릭 시 해당 페이지 |
| 오늘의 추천 | 최적 패키지/심볼 (V17 엔진 활용) |
| 오늘의 위험도 | 시장 변동성 + 본인 손실 한도 경고 |
| 오늘의 Crown 기회 | 이벤트/시즌/멀티플라이어 안내 |
| 오늘의 운세 | AI가 유저 데이터 기반 한 줄 (재미 요소) |

- 백엔드 RPC `get_daily_briefing()` (서버 캐시 24h, 사용자별)
- Edge Function `daily-briefing-build` cron 매일 00:05 KST
- Dashboard 최상단 마운트

### 2.2 PWA (manifest-only, 풀 SW 미사용)
- `public/manifest.webmanifest` + 아이콘만 → "홈 화면 추가" 가능
- 서비스 워커 X (Lovable preview iframe 충돌 방지 — 가드레일)
- `<InstallPromptCard />` — 첫 입금 후 1회

### 2.3 Push 구독
- `<NotificationPrefsCard />` UI 확장
- 기존 `send-push` 함수에 endpoint 저장 + 토큰 관리

### 2.4 Emperor AI Coach (`/coach`)
- 채팅 UI + Edge Function `emperor-coach` (Lovable AI Gateway, `google/gemini-2.5-flash` 기본)
- 컨텍스트: phon_balance / 최근 거래 / NFT / journey
- 손실 3연속 자동 인사이트 토스트

---

## Week 4 — 수익화 (마지막)

### 4.1 VIP Empire Pass (시각적 계급이 핵심)

**혜택보다 "신분 상승 연출"**
- 황금 닉네임 + 회전 코로나 (`<CrownAura />` 응용)
- 입장 이펙트 (페이지 전환 시 황금 스윕)
- VIP 전용 테두리 (전 컴포넌트의 avatar/card)
- VIP 전용 글로벌 채팅방
- 황제 전용 Crown 애니메이션 (3배 크기 폭발)
- VIP Empire Badge (전 사이트 노출)

**구조**
- Stripe seamless 연동 검토 (eligibility check 선행)
- `vip_subscriptions` 테이블, $19/$49/$99 3티어
- 혜택 (보조): 수수료 -50%, Crown ×2, NFT fusion -30%, 일일 PHON 보너스
- `<VipPassPanel />` + `/vip` 페이지

### 4.2 B2B Trading Sim API (`/developers`)
- Edge Function `public-sim-api` + API key 인증
- 외부 임베드 → 백링크 + 신규 수익원

### 4.3 세계 1위 시그널 강화
- Trust 페이지: 누적 출금 카운터 (count-up 24/7)
- "Featured on" 섹션 + 외부 리뷰 위젯

---

## 가드레일 (절대 위반 금지)

- 모든 신규 RPC → `function_permissions_baseline` 등록
- 모든 신규 테이블 → RLS + admin 전용 직접 SELECT
- 신규 cron → Self-Heal Console 메타 등록
- 토스트 = `@/lib/notify` 만 / 빈상태·로딩 = ui 프리미티브
- Realtime = `useRealtimeChannel` 단일
- 색상 = 디자인 토큰만
- AI = Lovable AI Gateway (별도 키 X)
- PWA = manifest-only (서비스 워커 금지 — preview iframe 충돌)

---

## Week 1 첫 산출물 (이번 빌드 범위)

```text
DB:
  + RPC get_world_domination_stats()
  + RPC get_live_activity_60s()
  + function_permissions_baseline 등록

프론트:
  + src/components/landing/WorldDominationWall.tsx
  + src/components/landing/LiveActivityFeed.tsx (자식)
  + src/components/landing/SessionHeadline.tsx (자식)
  + src/pages/Index.tsx — 최상단 마운트
  + react-helmet-async 도입
  + scripts/generate-sitemap.ts + predev/prebuild
  + Helmet을 주요 5개 페이지에 적용 (Index/Dashboard/Trust/Packages/Empire)
  + og-card-renderer 5 템플릿 + locale 파라미터
```

승인하시면 Week 1을 한 번에 구현하고, 끝나면 바로 Week 3로 넘어갑니다.
