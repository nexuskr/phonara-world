
# Phase D — "TRUMP × MUSK 모드" 재설계

## 두 인물의 운영 원칙을 코드/UX로 번역

| 원칙 | Trump | Musk | Phonara 적용 |
|---|---|---|---|
| 메시징 | "WE ARE #1, EVERYONE ELSE IS FAKE" | "Physics says it's possible" | 모든 카피를 **단언형 + 숫자**로 |
| 속도 | 매일 새 헤드라인 | 주간 deploy, 카오스 테스트 | 매일 자동 헤드라인 + 주간 라이브 이벤트 |
| 적 만들기 | 명확한 라이벌 호명 | "레거시 vs 미래" 프레이밍 | "vs CEX/은행" 비교 위젯 상시 노출 |
| 인물 중심 | 본인이 브랜드 | 본인 트윗이 시총 | **유저를 황제로 인격화** (이름/국기/금액이 헤드라인) |
| 연출 | MAGA 집회 | Starship live stream | **Crown War / 출금 라이브 스트림** 상시 |

---

## 재정렬된 4주 (속도 우선, 시각화 우선, 자기증식)

원래: Week1 Wall → Week3 Viral → Week2 AI/PWA → Week4 Monetization
**TRUMP×MUSK 버전**: 동일 순서 유지하되, **각 주차에 "쇼" 레이어 1개 + "엔지니어링" 레이어 1개** 강제 추가.

---

### Week 1 — "WE ARE WINNING" Wall (현재 진행중 → 확장)

**SHOW (Trump)**
- `WorldDominationWall`에 **실시간 비교 티커** 추가:
  `"Phonara 24h GMV: $X — Coinbase retail withdrawal avg: $Y — WE ARE Nx FASTER"` (공개 데이터 기반, 정직한 수치)
- **Top Emperor Hall of Fame**: 24h Crown 1위 유저를 **마스킹된 닉 + 국기 + 금액**으로 홈 최상단 고정. "EMPEROR OF THE DAY" 배너.
- **Daily Headline Generator** (cron 1h): Lovable AI Gateway(`gemini-2.5-flash`)가 24h 데이터로 **트럼프 톤 헤드라인 5종** 자동 생성 → `daily_headlines` 테이블 → Wall 회전.

**ENGINEERING (Musk)**
- **Public KPI API** (`/api/public/stats`): 외부 매체/봇이 직접 인용 가능하게 JSON 엔드포인트 + ETag 캐시. CoinMarketCap 스타일.
- **Sitemap × 4언어** + per-route Helmet (ko/en/ja/zh) — 검색 유입 자동화.
- **OG 이미지 엣지 함수** (`og-render`): satori → PNG, 5템플릿 × 4언어 = 20조합 캐시.

신규 RPC: `get_top_emperor_24h()`, `get_competitor_compare()`, `get_daily_headlines()`. 모두 baseline 등록.

---

### Week 3 — VIRAL: "1탭 = 100명에게" + Live Tournament

**SHOW (Trump)**
- **Crown War: WEEKLY PRIMETIME** — 매주 토요일 22:00 KST 고정 시간 토너먼트. 카운트다운이 **모든 페이지 상단 띠**로 강제 노출 (D-2 이내). `tournament_schedule` 테이블 + `<TournamentCountdownBar />`.
- **Live Battle Overlay** (`/live/:tournamentId`): OBS-ready, 1080p 16:9, 실시간 leaderboard + Crown 폭발 파티클. 우승자 인터뷰 카드 자동 생성.
- **"받았으면 자랑하라" 강제 공유 모먼트**: Crown ≥50/Baron 승급/출금 완료 시 풀스크린 모달 + **자동 생성 OG 이미지** + 1탭 X/카카오/Line/Telegram. dismiss는 작은 X. (UX 다크패턴 경계 — 강제 X, 기본 노출 O)

**ENGINEERING (Musk)**
- **Referral 2.0**: `referral_codes` 확장 — 인플루언서 전용 코드(고정 링크 + 클릭/가입/입금 트래킹 + RPE 분배). `<ReferralLeaderboard />` 공개.
- **Share Tracking**: `share_events(user_id, kind, channel, click_count)` — Branch.io 없이 자체 short-link (`/s/:code`).
- **Edge function `og-render-dynamic`**: Crown 금액/유저명/국기 동적 합성.

신규 테이블: `tournament_schedule`, `tournament_results`, `share_events`, `influencer_codes`. 모두 RLS.

---

### Week 2 — HABIT: AI Coach + PWA + Daily Briefing

**SHOW (Trump)**
- **Emperor AI Coach 페르소나**: "당신의 전속 트레이딩 자문". 톤은 Trump식 단언 + Musk식 데이터. 매일 09:00 KST `<DailyBriefingCard />`가 5장 카드로:
  1. **MISSION TODAY** (오늘의 단일 미션)
  2. **MARKET SIGNAL** (BTC/ETH 24h + 추천 사이드)
  3. **RISK CHECK** (어제 손실 > 임계 시 경고 + 손실보호 안내)
  4. **CROWN OPPORTUNITY** (오늘 ×2 이벤트/founding seat 잔여)
  5. **YOUR FORTUNE** (가벼운 운세 — 재미 요소)
- **Push 알림**: 09:00 브리핑 + Crown War 시작 30분 전 + 본인이 leaderboard 진입 시.

**ENGINEERING (Musk)**
- **PWA**: manifest-only (SW 없음 — 가드레일 준수). Add to Home + 아이콘 6사이즈 + 테마컬러.
- **AI Coach 엣지 함수** (`emperor-coach`): `gemini-2.5-flash` 기본, 복잡 질의는 `gpt-5-mini`. 시스템 프롬프트 = "데이터 기반 단언 + 손실 보호 의무 안내". 컨텍스트 = 유저 최근 30d 거래/잔고/Empire level.
- **Briefing Generator cron** (08:55 KST): 전일 데이터 → 카드 5장 미리 생성 → `daily_briefings(user_id, date, payload)` → 09:00 푸시.
- `/coach` 풀 채팅 페이지 + 잔여 토큰 카운터(VIP는 무제한).

---

### Week 4 — MONETIZE: VIP Empire Pass + B2B + "X 인수" 수준 시그널

**SHOW (Trump)**
- **VIP Empire Pass** ($29/mo or 30,000 PHON/mo):
  - 골드 닉네임 + Crown Aura 진화 + 입장 시 풀스크린 효과 (다른 유저 화면에도 1초 노출 = 사회적 증명)
  - VIP 전용 채팅방 + Crown 폭발 ×3 보너스 + 출금 우선순위 표식 + AI Coach 무제한
  - **"VIP만 보이는 시그널"** — Whale 입금/대형 출금 30초 선공개
- **세계 1위 시그널**:
  - 홈 푸터 "AS SEEN ON" (실제 유입 매체 로고 자동 수집 — UTM/referer 기반 `inbound_press` 테이블)
  - "최근 24시간 N개국에서 접속" 라이브 카운터
  - **CEO 트윗 컴포넌트** (트럼프식 단문 공지) — 관리자가 1탭으로 전체 유저 푸시 + 채팅 핀

**ENGINEERING (Musk)**
- **Stripe + 토스/PayPay 라우팅** (지역별): IP/locale 기반 자동 결제수단 선택. `subscription_plans`/`user_subscriptions`/`subscription_events`. cron 갱신.
- **B2B Trading Sim API**: 외부 개발자용 sandbox. `api_keys` 테이블 + rate limit (DB 카운터, 인프라 RL은 가드레일상 보류) + 대시보드 `/dev/console`.
- **Press Auto-Capture**: referer 도메인 → `og-fetch` 엣지 함수 → 로고 수집 → 관리자 승인 후 노출.

---

## 가드레일 (전 주차 공통, 위반 금지)

- 모든 신규 RPC → `function_permissions_baseline` 등록 + drift CI 통과
- 모든 신규 테이블 → RLS + `useRealtimeChannel` 단일 진입
- 토스트는 `@/lib/notify`만, 색상은 design tokens만
- AI는 Lovable AI Gateway만, 새 cron은 Self-Heal Console 등록
- PWA는 manifest-only (SW 미사용 — 기존 결정 유지)
- "강제 공유 모먼트"는 dismiss 가능해야 함 (다크패턴 금지선)
- 경쟁사 비교 수치는 **공개 데이터 출처 명시** (legal risk)

---

## 즉시 실행 권고 (이 플랜 승인 시 첫 배치)

**Week 1 확장분 먼저** — 이미 Wall이 살아있으므로 위에 얹기:
1. `daily_headlines` 테이블 + cron + AI 생성 (Trump 톤)
2. `<TopEmperorBanner />` Wall 상단
3. `<CompetitorCompareTicker />` Wall 우측
4. Public KPI JSON 엔드포인트 (`get_public_stats_json` RPC)
5. `og-render` 엣지 함수 + 5템플릿

이후 Week 3 → 2 → 4 순서대로.

---

## 한 줄 요약

> **"보이지 않는 시스템 밀도를, 보이는 제국으로 폭발시킨다."**
> Trump가 외치고, Musk가 배포하고, 유저가 자랑한다.

승인하면 Week 1 확장분부터 즉시 착수합니다. 다른 주차를 먼저 가져오라면 그렇게 합니다.
