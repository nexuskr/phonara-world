# PHONARA Ω — Mobile-First World Domination (6주 실행 플랜)

> 한 줄: **"엄청 복잡한 시스템을 손가락 1개로 단순하게 느끼게 만든다."**
> 새 기능 추가가 아니라 **detox → mobile rebuild → trust → viral → identity → 3D** 순서로 잠금.

## 0. 변하지 않는 5개 법칙

```text
1) Mobile 360px first — 데스크탑은 확장 화면
2) Lightweight or die — 무게가 늘면 거절
3) Trust > Alive > Simple > Retention > Social > Monetize > Feature
4) Realtime = UX,  Polling = Truth
5) 한 화면에서 손가락 3번 안에 핵심 완료
```

모든 PR 설명에 "이 변경이 위 5개 중 무엇을 강화하는가" 1줄 필수. 2개 미만이면 reject.

---

## 1. Week 1 — Platform Detox (새 기능 금지 · 외과수술 주간)

현 상태 진단(`audit/02-performance.md` 기반): /lounge Style recalc 352회/200ms, /dashboard 22MB heap, GodModePanel 채널 이중 구독, 30+개 setInterval 중 다수가 visibility 가드 누락.

| 작업 | 산출 | 통과 게이트 |
|------|------|------------|
| 토스트 통일 — `@/lib/notify`만 사용, sonner 직접 호출 0건 | grep 0 | simple |
| `setVisibleInterval(fn, ms)` 헬퍼 + 8개 페이지 마이그레이션 | `src/lib/util/visible-interval.ts` 적용 | lightweight |
| `useRealtimeChannel` 단일 진입점 강제 (GodModePanel·AIBotCards 잔존 직접 호출 제거) | `supabase.channel(` 직접 호출 화이트리스트 외 0건 | trust |
| 큰 컴포넌트 분해 — 500줄+ 컴포넌트 강제 분리(Dashboard/Lounge/Cockpit) | 모든 컴포넌트 < 500줄 | simple |
| Lounge 무한 애니 IntersectionObserver 일시정지 + `prefers-reduced-motion` 표준화 | recalc 50% 감소 | lightweight |
| i18n.ts 120KB 언어별 lazy chunk 분할 | 첫 라우트 동기번들 -90KB | lightweight |
| Toast Tier 4단계 분리 (Critical/Important/Passive/Silent feed) — alert spam 제거 | `notify.critical/important/passive` API | alive |

성공 지표: `/dashboard` heap < 14MB, `/lounge` recalc < 150ms, 분당 백그라운드 RPC -70%.

## 2. Week 2 — Mobile Rebuild (홈/지갑/하단 네비)

엄지존 기준으로 처음부터 다시 그린다. 데스크탑은 동일 컴포넌트 max-width 확장.

**Home 새 구조** (스크롤 3번 안에 끝):
```text
[Top Wallet bar  +  1-Tap Deposit CTA]   ← thumb zone top
[Live Momentum Strip]                     ← Baron 승급/대형 출금 ticker
[4 Big Actions: Play · Predict · Trade · Empire]
[Today Missions (max 3)]
[Live Clip Feed — TikTok 세로]
[Whale / Avatar / Empire 카드]
```

작업:
- `@pkg/ui/MobileShell` — safe-area + 56px 터치 + bottom-nav 5탭(Home/Play/Predict/Wallet/Me).
- `@pkg/wallet/MobileWalletSheet` — 풀스크린 sheet, 1탭 입금.
- `@pkg/ui/Skeleton` 시스템 통일(현재 `<Skeleton />` 1종 → variant 5종).
- 모든 핵심 CTA 56px+, 16px+ 텍스트, thumb zone(하단 40%) 내 배치.
- LCP 이미지 preload + Pretendard async.

성공: 모바일 LCP < 2.5s, INP < 200ms, 첫 입금 진입 평균 2탭 이내.

## 3. Week 3 — Trust Engine (돈에 대한 불확실성 = 0)

이미 보유한 deposit lifecycle/Oracle Fortress/Kernel 위에 마무리:
- **출금 영수증 PDF + hash 검증** — `settlement_receipts` 테이블 + `verify_settlement_receipt(hash)` RPC + 공개 `/r/<hash>` 페이지(누구나 검증).
- **`/status` 공개 페이지 강화** — oracle quorum / kernel inflight / payout p50,p99 / 7d uptime(이미 페이지 골격 존재).
- **`/api/public/metrics`** — TVL/24h volume/payouts CORS open → 외부 트래커 백링크 자동.
- **deposit heartbeat 펄스 강화** — "확인중" 단계 0.8s pulse + safe-checking copy 회전.
- **fast-lane 입금** — 진입~확인까지 5초·30초 목표 텔레메트리.

성공: 출금 후 영수증 외부 검증 호출 500+/d, `/status` PV 2,000+/d, CS "내 돈 어디" -70%.

## 4. Week 4 — Viral Engine (콘텐츠가 인프라)

- **`og-image-renderer` edge** — 라우트/프로필/예측마다 동적 1200×630.
- **Auto-clip from `/live`** — 60s 대형 이벤트 자동 클립 → `live_clips` + `x-post-bot`(opt-in)로 X 자동 게시.
- **Share cards** — Crown 폭발/Baron/대형 출금 1탭 PNG + 단축 링크.
- **TikTok형 세로 Clip Feed** — `@pkg/social/feed/ClipFeed` 가상화 리스트.
- **Cross-poster (opt-in)** — X/Threads OAuth 1회.

성공: 외부 referrer +50k/월, 자발적 share 200+/d, 외부 임베드 1k+.

## 5. Week 5 — Identity Engine (정체성을 외부로)

- **`/u/<nickname>` 공개 시민 페이지** — Empire/Crown/NFT/withdrawal flex/prediction wins + 동적 OG.
- **임베드 위젯** `<iframe src="/embed/u/<nick>">` 1줄.
- **Avatar Showcase 카드** — 홈/프로필.
- **Achievement Mint** — 첫 Baron / 100 Crown / Vault 1M 한정 NFT 자동.
- **Empire Tower 진입점** — 6주차 3D의 입구.

성공: 공개 프로필 외부 referrer 5만+/월, 자발 share 200+/d.

## 6. Week 6 — Lightweight 3D Identity Space

원칙: **Roblox 로비 + TikTok 감성**, MMO 금지. 모바일 60fps 필수.
- **Fake 3D Lobby** — react-three-fiber + 인스턴싱, draw call < 80.
- **Floating NFT Hall** — 본인 NFT가 떠 있음, 회전.
- **Empire Tower** — 티어별 외관 변화.
- **Whale Hall** — 24h 대형 출금자 동상.
- **Prediction Arena 입구** — Week 4 마켓과 연결.
- 진입은 lazy chunk, 비-3D 사용자는 영향 0.

성공: 3D 라우트 모바일 60fps, 첫 진입 < 3s, GPU idle 안전.

---

## 7. 패키지 구조 (이미 일부 존재 → 보강)

```text
src/packages/
  core/           ✓ alias 존재
  ui/             ✓  → primitives/feedback/overlays/navigation/typography 폴더 분리
  wallet/         ✓  → mobile sheet 추가
  live/           ✓  → auto-clips/highlights 추가
  earn/           ✓
  game-engine/    ✓
  trade/          ✓
  avatar-nft/     ✓  → showcase/inventory 분리
  referral/       ✓
  analytics/      ✓
  prediction/     ✗  신규
  social/         ✗  신규 (feed/clips/comments)
  telemetry/      ✗  신규 (events/tracing)
  performance/    ✗  신규 (lazy/virtualization/cache)
  security/       ✗  신규 (permissions/verification)
  realtime/       ✗  신규 (단일 ws 분할: wallet/game/chat/market 4채널)
```

## 8. 기술 노트

- 신규 테이블: `settlement_receipts`, `live_clips`, `prediction_markets`, `market_orders`, `achievement_mints`, `public_profile_views`.
- 신규 edge: `og-image-renderer`, `x-post-bot`, `receipt-pdf`, `auto-clip-live`, `resolve-market`.
- 신규 RPC: `verify_settlement_receipt`, `get_public_metrics`, `get_status_page_snapshot`, `get_public_profile(nick)`.
- 신규 admin RPC는 전부 `AdminAal2Gate` + `function_permissions_baseline` 등록.
- Realtime 4-way partition: wallet / game / chat / market 별도 채널. 단일 websocket 폭주 금지.
- AI: `google/gemini-2.5-flash` (마켓 해설/헤드라인), 영수증 서명 키는 edge secret.
- 신규 코드는 전부 `@pkg/*`. UI 텍스트는 `G`/`g()`.

## 9. 명시적 비대상 (Out of scope)

- 자체 토큰/체인 발행 — 규제 리스크.
- Unreal/풀 3D MMO — §6 위반(모바일 60fps 불가).
- 풀스택 네이티브 앱 — PWA 우선.
- Stripe/PG 자동 결제 — `mem://constraints/payment-routing` 위반.
- 라이브 딜러 카지노 — ROI 비합리.

## 10. 알림 4-Tier (Week 1에 즉시 도입)

```text
Critical  → 입출금/보안, fullscreen 허용
Important → Baron 승급/Vault 만료/Prediction 종료, 1회 toast
Passive   → 자동 소멸 mini toast
Silent    → activity rail 안에만 — 절대 popup 금지
```

`@/lib/notify` 에 `critical/important/passive/silent` 4 API 강제. 직접 `toast()` 호출 금지(ESLint 룰 추가).

## 11. 북극성 지표 (6주 후)

| 영역 | 지표 | 목표 |
|------|------|------|
| Mobile | LCP / INP | < 2.5s / < 200ms |
| Lightweight | 분당 백그라운드 RPC | -70% |
| Trust | 영수증 외부 검증 호출/d | 500+ |
| Alive | 홈 진입 8s 내 첫 클릭 | 70% |
| Viral | 외부 referrer / 월 | 50,000+ |
| Identity | 공개 프로필 임베드 | 1,000+ |
| 3D | 모바일 60fps 유지 | 95%+ 세션 |

## 12. 지금 바로 시작할 1번 작업

**Week 1 Detox — Toast 4-Tier + setVisibleInterval 마이그레이션 + 단일 realtime 진입점 강제.**
이 3개가 끝나야 다음 주차로 넘어간다. 새 기능은 1주차 끝까지 금지.
