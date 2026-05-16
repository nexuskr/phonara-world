# PHONARA Ω — Mobile-First World OS (LOCKED v2.0)

> 핵심 원칙 1줄: **"무엇을 추가할까"보다 "무엇을 절대 안 넣을까"가 더 중요하다.**
>
> 지금 단계에서 가장 위험한 것 = 기능 부족 ❌ / 너무 많이 동시에 넣다가 무거워지는 것 ✅
>
> 그래서 다음 2주는 **신규 기능 금지**. 오직 외과수술.

---

## 0. 변하지 않는 5개 법칙 (LOCKED)

```text
1) Mobile 360px first — 데스크탑은 확장 화면일 뿐
2) Lightweight or die — 무게 증가하면 reject
3) Trust > Alive > Simple > Retention > Social > Monetize > Feature
4) Realtime = UX,  Polling = Truth
5) 손가락 3번 안에 핵심 완료
```

모든 PR 설명에 "이 변경이 위 5개 중 무엇을 강화하는가" 1줄 필수. 2개 미만이면 reject.

---

## 1. 3-Layer Architecture (LOCKED) — 가장 중요한 결정

지금까지 모든 화면이 한 평면에 쌓여 있어서 무겁다. 앞으로 **3층 분리** 강제:

```text
┌─────────────────────────────────────────────────────────────┐
│ Layer 1 — INSTANT LAYER  (절대 가벼움, 모바일 60fps 보장)    │
│   /home, /play, /wallet, BottomNav                          │
│   허용 요소: 잔액 · 입금 · 플레이 · 라이브 · 미션            │
│   금지: 3D, heavy chart, monster widget, 무한 애니           │
├─────────────────────────────────────────────────────────────┤
│ Layer 2 — IDENTITY LAYER  (lazy chunk, 진입 시 로드)         │
│   /me, /empire, /avatar, /nft, /vip                         │
│   허용: Crown · Empire · Avatar · NFT · 업적 · 프로필         │
├─────────────────────────────────────────────────────────────┤
│ Layer 3 — DEEP WORLD  (route-level lazy, 별도 chunk)         │
│   /predict, /arena, /guild, /3d, /live-studio               │
│   허용: 메타버스, 3D, 예측, 길드, 라이브 아레나              │
└─────────────────────────────────────────────────────────────┘
```

규칙:
- Layer 1 컴포넌트는 Layer 2/3 import 금지(역방향만 허용).
- Layer 1 첫 페인트에 들어가는 번들 < 180KB gzip (현재 추정 ~400KB).
- Layer 3는 반드시 `React.lazy` + 별도 chunk.
- ESLint 룰로 강제 (다음 detox 주차에 추가).

---

## 2. Week 1 — PERFORMANCE SURGERY (신규 기능 금지)

`audit/02-performance.md` 진단: /lounge recalc 352회/200ms, /dashboard 22MB heap, 30+ setInterval visibility 가드 누락. 아래 10개를 모두 끝내기 전엔 어떤 신규 기능도 만들지 않는다.

| # | 작업 | 산출 | KPI |
|---|------|------|-----|
| 1 | **Toast 70% 제거** — `notify.{critical,important,passive,silent}` 4-Tier 도입, 직접 `toast()` 호출 ESLint 금지 | `src/lib/notify.ts` 확장 | 평균 toast/세션 -70% |
| 2 | **Giant component 해체** — 500줄+ 강제 분리 (Dashboard·Lounge·Cockpit) | 모든 컴포넌트 < 500줄 | grep 0 |
| 3 | **Realtime 4-way partition** — wallet/game/chat/market 채널 분리, `supabase.channel` 직접 호출 화이트리스트 외 0건 | `@pkg/realtime` 신설 | WS 채널 < 4 |
| 4 | **List virtualization** — Whale rail · Leaderboard · LiveFeed · History · Chat | `react-virtuoso` 도입 | 1000행 60fps |
| 5 | **Route lazy split** — Layer 3 라우트 전부 lazy, `/predict`·`/empire/*`·`/arena`·`/admin/*` | vite chunk 분석 | 첫 chunk -50% |
| 6 | **Mobile skeleton system** — `<Skeleton variant>` 5종(line/card/list/avatar/hero), 모든 페이지 spinner 제거 | `@pkg/ui/feedback/Skeleton` | spinner 0개 |
| 7 | **Re-render profiling** — React DevTools profile → top 10 hot 컴포넌트 `React.memo` + selector 분리 | profile 리포트 | 평균 commit -50% |
| 8 | **Global state 축소** — `useDB` 의존 컴포넌트 50% 감축, 도메인별 zustand store 분리 | store 4개 분할 | useDB 호출 -50% |
| 9 | **Lazy fetch** — 3초 이상 안 보이는 데이터 IntersectionObserver gating, 30+ setInterval `setVisibleInterval` 통일 | `src/lib/util/visible-interval.ts` 적용 | 분당 RPC -70% |
| 10 | **360px 재설계** — Home·Wallet·Play·Bottom Nav 엄지존 기준, 56px+ 터치, 16px+ 텍스트, safe-area | 모바일 LCP < 2.5s / INP < 200ms | Lighthouse mobile ≥ 90 |

**완료 기준**: 위 10개 전부 done + 모바일 Lighthouse Performance ≥ 90 + `/dashboard` heap < 14MB.

## 3. Week 2 — Mobile Rebuild (Layer 1 완성)

**Home 새 구조** (스크롤 3번 안에 핵심 완료):
```text
[Top: 잔액 + 1-Tap 입금]   ← thumb zone 상단(가장 자주 보는 정보)
[Live Momentum Strip]      ← Baron 승급 / 대형 출금 ticker (이미 보유)
[4 Big Actions]            ← Play · Predict · Trade · Empire (56px+)
[Today Missions max 3]
[Live Clip Feed (가상화)]   ← TikTok 세로
[Whale / Avatar / Empire 진입 카드]
[Bottom Nav 5탭]           ← Home · Play · Predict · Wallet · Me
```

- `@pkg/ui/MobileShell` 1개로 통일(safe-area + bottom-nav).
- `@pkg/wallet/MobileWalletSheet` — 풀스크린 sheet 입금/출금.
- 데스크탑은 동일 컴포넌트 `max-w-md` 중앙 정렬, 별도 분기 X.

## 4. Week 3 — Trust Engine (돈 불확실성 = 0)

이미 보유한 deposit lifecycle/Oracle Fortress/Kernel 위에 마무리:
- **출금 영수증 PDF + hash 검증** — `settlement_receipts` 테이블 + `verify_settlement_receipt(hash)` RPC + 공개 `/r/<hash>`.
- **`/status` 공개 페이지 강화** — oracle quorum / kernel inflight / payout p50,p99 / 7d uptime.
- **`/api/public/metrics`** — TVL/24h volume/payouts CORS open.
- **Deposit heartbeat 펄스 강화** — 0.8s pulse + safe-checking copy 회전.
- **Fast-lane 입금 텔레메트리** — 진입~확인 5s/30s 목표 트래킹.

성공: 영수증 외부 검증 500+/d, `/status` PV 2,000+/d, CS "내 돈 어디" -70%.

## 5. Week 4 — Viral Engine (콘텐츠가 인프라)

- **`og-image-renderer` edge** — 라우트/프로필/예측 동적 1200×630.
- **Auto-clip** — `/live` 60s 대형 이벤트 자동 클립 → `live_clips` + `x-post-bot`(opt-in).
- **Share cards** — Crown 폭발/Baron/대형 출금 1탭 PNG + 단축 링크.
- **TikTok형 Clip Feed** — `@pkg/social/feed/ClipFeed` 가상화.

성공: 외부 referrer +50k/월, 자발 share 200+/d.

## 6. Week 5 — Identity Engine (Layer 2 외부화)

> "지갑 → 정체성 → 자랑 → 소셜 → 재방문" 루프 완성.

- **`/u/<nickname>` 공개 시민 페이지** — Empire/Crown/NFT/withdraw flex/prediction wins + 동적 OG.
- **임베드 위젯** `<iframe src="/embed/u/<nick>">`.
- **Avatar Showcase** + **Achievement Mint** (첫 Baron / 100 Crown / Vault 1M 한정 NFT).
- **Empire Tower 진입점** — Week 6 가짜 3D 입구.

## 7. Week 6 — Fake 3D Identity Space (NOT MMORPG)

원칙: **Roblox 로비 + TikTok 감성**, MMO 금지. 모바일 60fps 필수.

**3단계 점진 도입**(이번 6주차는 1단계만):
```text
1단계 (Week 6)  → Fake 3D: floating cards, parallax, WebGL hologram, animated avatar
2단계 (이후)    → Social: whale hall, crown arena, avatar flex, emotes
3단계 (먼 미래) → True world: district, guild, private room, live arena
```

- react-three-fiber + 인스턴싱, draw call < 80.
- Lazy chunk, 비-3D 사용자 영향 0.
- 모바일 60fps 미만이면 자동 fallback to 2.5D.

---

## 8. NEVER DO LIST (LOCKED)

플랫폼을 무겁게 만드는 모든 것. 위반 시 PR reject:

- ❌ 페이지 진입 즉시 모든 데이터 fetch (waterfall)
- ❌ 한 컴포넌트 500줄 초과
- ❌ realtime 전체 rerender (selector 미사용)
- ❌ 단일 websocket에 wallet+game+chat+market 다 묶기
- ❌ 동시 무한 애니메이션 > 3개 (Lounge 사례)
- ❌ visibility 가드 없는 setInterval
- ❌ giant global context (`useDB` 전역 의존 확산)
- ❌ 페이지 레벨 Suspense 하나에 6개+ lazy 묶기 (현 Dashboard 패턴)
- ❌ spinner 사용 (skeleton만 허용)
- ❌ Layer 1에 3D/heavy chart import
- ❌ 자체 토큰/체인 발행
- ❌ Unreal/풀 3D MMO
- ❌ Stripe/PG 자동 결제 (`mem://constraints/payment-routing`)
- ❌ 직접 `toast()` / `supabase.channel(` 호출 (단일 진입점만)

## 9. 알림 4-Tier (Week 1 즉시 도입)

```text
Critical  → 입출금/보안만, fullscreen 허용
Important → Baron 승급/Vault 만료/Prediction 종료, 1회 toast
Passive   → 자동 소멸 mini toast
Silent    → activity rail 안에만, 절대 popup 금지
```

`@/lib/notify`에 `critical/important/passive/silent` 4 API만 노출. ESLint custom rule로 `sonner` 직접 import 금지.

## 10. 패키지 구조 보강

```text
src/packages/
  core/ ✓   ui/ ✓   wallet/ ✓   live/ ✓   earn/ ✓
  game-engine/ ✓   trade/ ✓   avatar-nft/ ✓   referral/ ✓   analytics/ ✓
  realtime/    ✗ 신규 — wallet/game/chat/market 4채널 진입점
  prediction/  ✗ 신규 — Week 5
  social/      ✗ 신규 — Week 4 (feed/clips/comments)
  telemetry/   ✗ 신규 — funnel/tracing
  performance/ ✗ 신규 — lazy/virtualization/cache 헬퍼
```

## 11. 북극성 지표 (6주 후)

| 영역 | 지표 | 목표 |
|------|------|------|
| Mobile | LCP / INP / Lighthouse Perf | < 2.5s / < 200ms / ≥ 90 |
| Lightweight | 분당 백그라운드 RPC | -70% |
| Trust | 영수증 외부 검증 호출/d | 500+ |
| Alive | 홈 진입 8s 내 첫 클릭 | 70% |
| Viral | 외부 referrer / 월 | 50,000+ |
| Identity | 공개 프로필 임베드 | 1,000+ |
| 3D | 모바일 60fps 유지 세션 | 95%+ |

## 12. 지금 바로 1번 작업

**Week 1 항목 #1, #3, #9 병렬 착수:**
- Toast 4-Tier (`notify.critical/important/passive/silent`) + ESLint `no-direct-sonner` 룰
- `@pkg/realtime` 4채널 진입점 + GodModePanel·AIBotCards 마이그레이션
- `setVisibleInterval` 헬퍼로 30+ setInterval 일괄 교체

이 3개가 끝나야 #2/#4/#5… 로 진행. **Week 1 끝까지 신규 기능 금지.**
