# PHONARA Ω — Mobile-First Financial Entertainment OS (LOCKED v3.0)

> **Target feeling:** Stake 단순함 · Rollbit 모멘텀 · Bloomberg 신뢰 · TikTok 리텐션 · Apple 부드러움 · Roblox 로비 정체성 · Exchange 투명성 — 단, **더 가볍게, 더 조용하게, 더 빠르게, 더 모바일 네이티브하게.**
>
> **다음 2주 절대 규칙: 신규 기능 0. 오직 Performance Surgery + Architecture Detox.**
>
> 모든 PR description에 **"Which 2+ core laws does this improve?"** + **"Budget Impact"**(animations / CPU / memory / INP) 필수. 2개 미만이거나 예산 초과 시 reject.
>
> 핵심 원칙: "무엇을 추가할까"보다 **"무엇을 절대 안 넣을까"**가 더 중요하다. 가장 큰 리스크는 기능 부족이 아니라 비대·소음·렉·분열·심리적 피로다.
>
> **최종 합격 기준:** ① 조용한데 살아있다 ② 가벼운데 깊다 ③ 내부는 복잡, 사용은 단순 ④ 사용은 게임처럼 ⑤ 신뢰는 거래소처럼.

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

## 12. Ω-Core 5 Additions (LOCKED — 마지막 퍼즐)

### 12-1. Interaction Budget System
모든 UI는 예산 안에서만 산다. 초과하면 PR reject.

```text
Layer 1 (Instant)
  - 동시 애니메이션 ≤ 3
  - CPU 사용 ≤ 20% idle
  - GPU long frame > 16ms 금지

Mobile 전역
  - 첫 입력 응답 < 100ms
  - 화면 전환 < 150ms
  - JS main thread block > 1s 금지
```

새 UI/모션 PR은 description에 **"Budget Impact"** 줄 필수 (예: `+1 anim, +2% CPU, INP+0ms`). `web-vitals` + PerformanceObserver 텔레메트리로 자동 측정 → `/admin/kpi`에 budget-violations 패널.

### 12-2. Death Cleanup Day (매주 금요일 강제)
추가만 하면 결국 무거워진다. 매주 1회 삭제 전용 PR:

```text
- 안 쓰는 state / hook / dep 제거
- dead websocket 채널 제거
- duplicate fetch 통합
- stale cache 만료
- unused export / 500줄+ 컴포넌트 분해
- depcheck + ts-prune + unimported 자동 리포트
```

CI에 `scripts/death-cleanup-report.ts` 추가 → 매주 PR로 자동 리포트. 1주 이상 미정리 시 빨간불.

### 12-3. Emotion Timing System (조용함 90% · 폭발 10%)
항상 흥분 상태 = 피로 = 이탈. 평소는 무채색·정보 중심, 이벤트 순간만 폭발.

```text
PEACEFUL (default 90%)
  - 무채색 · 정적 · 정보 중심
  - 무한 애니/glow 금지
  - typography·spacing으로 hierarchy

EXPLOSIVE (event 10%, ≤ 2.5s burst)
  - Crown explosion · Baron 승급 · 대형 출금 · 예측 적중
  - 전체화면 가능, 그 외엔 금지
  - 끝나면 즉시 PEACEFUL로 회귀
```

`@pkg/ui/EmotionMode` provider — 상태 = `peaceful | explosive(reason, ttl)`. 이벤트 RPC가 broadcast하면 자동 burst → ttl 후 peaceful 복귀. 컴포넌트는 `mode` 구독해 스타일 토글.

### 12-4. Fail-Soft Architecture (Critical Path Isolation)
하나 죽어도 돈 흐름은 살아야 한다.

```text
critical = [auth, wallet, deposit, withdraw, oracle, kernel]
optional = [chat, clip, avatar, feed, prediction, 3d, social]

규칙:
  - optional ❌ ⇒ critical에 영향 0
  - optional 컴포넌트는 모두 ErrorBoundary로 격리
  - optional 데이터는 throw 대신 graceful fallback (빈 카드 + 재시도)
  - optional realtime 채널 실패는 critical 채널과 무관
```

`@pkg/ui/SoftBoundary` — 자식 throw 시 작은 빈 카드 + 자동 5s 재시도 + `telemetry.softFail(name)`. 모든 optional 마운트 지점은 SoftBoundary 필수.

### 12-5. Silent Billionaire Rule (고래 친화 UI 모드)
진짜 돈 쓰는 사람 = Bloomberg + Apple + 조용한 카지노 감성을 선호.

```text
유저 설정: theme.density = "loud" | "quiet" (default 자동)
자동 전환: Baron(7+) 또는 누적 입금 1k USDT+ ⇒ "quiet" 기본값

quiet 모드:
  - glow / gradient / shimmer 비활성
  - 채도 -30%, 폰트 weight -100
  - 마키/티커 → 정적 카드
  - explosive burst는 유지 (희소성 보존)
  - 숫자 typography Bloomberg-grade (탭ular nums + 우측 정렬)
```

설정은 `profiles.ui_density` 컬럼 + `useUIDensity()` 훅. quiet 사용자는 자동 telemetry로 분리 코호트 추적 — 이탈/체류 비교.

---

## 13. Ω-FINAL 3 Additions (LOCKED — OS 마감)

### 13-1. Runtime Priority System
모바일에서 모든 걸 동시에 실행하면 죽는다. 4단계 우선순위 강제.

```text
A — Critical Runtime    ⇒ 즉시 (auth · wallet · deposit · withdraw · kernel · oracle)
B — Interactive Runtime ⇒ first paint 직후 (play · live-strip · missions · ticker)
C — Deferred Runtime    ⇒ 첫 user interaction 이후 (chat · feed · leaderboard · avatar)
D — Cosmetic Runtime    ⇒ 조건부 device.profile 게이팅 (particles · glow · 3D · hologram)
```

신규 헬퍼 `@pkg/performance/runtime`:
```ts
runWhenIdle(fn, { timeout })       // requestIdleCallback + fallback
runIfVisible(ref, fn)              // IntersectionObserver
runIfHighEndDevice(fn)             // 13-2 device.profile === "high"
runAfterFirstInteraction(fn)       // pointerdown/keydown 1회
```

규칙: A에 lazy import 금지. B/C는 위 헬퍼 경유. D는 항상 device 게이팅. Layer 1 진입 시 동시 task ≤ 4.

### 13-2. Device Intelligence Layer
저가 안드폰과 iPhone Pro에 같은 UI = 죽음. 전세계 단말 자동 적응.

```text
device.profile = "low" | "mid" | "high"

판정 입력:
  - navigator.deviceMemory       (< 4 ⇒ low)
  - hardwareConcurrency          (< 4 ⇒ low)
  - GPU tier (detect-gpu)        (tier 1 ⇒ low)
  - effectiveConnectionType      (2g/3g/saveData ⇒ low)
  - 첫 5초 fps drops > 10        ⇒ 자동 downgrade
```

| 항목 | low | mid | high |
|------|-----|-----|------|
| blur / backdrop | off | reduced | full |
| shadows | flat | reduced | full |
| realtime poll freq | 60s | 20s | 5s |
| animation | reduced | normal | full |
| video autoplay | off | on | on |
| 3D 라우트 | disabled | 2.5D fallback | full |
| particles | off | reduced | full |

구현: `@pkg/performance/device` — `useDeviceProfile()` + `<body data-device="...">`. Tailwind plugin으로 `low:hidden mid:opacity-50 high:animate-pulse` 변형. 모든 cosmetic 효과는 데이터 셀렉터 기반.

### 13-3. Operator Mode Separation (운영자 앱 분리)
운영자 코드가 user 번들에 섞이면 → 번들 비대 + 보안 리스크 + 상태 꼬임.

```text
/apps
  /web       → user PWA  (instant)
  /operator  → admin · kpi · moderation · payout · kernel · oracle
  /studio    → live · clips · promotion · OBS overlay
```

강제 규칙:
- `src/pages/admin/*`, `src/pages/Cockpit*`, `src/pages/security/*` → `src/packages/operator/*` 로 이전.
- 별도 Vite build target `vite.operator.config.ts` → 별도 entry, 별도 chunk.
- 별도 도메인: user `phonara.world` · operator `ops.phonara.world` · studio `studio.phonara.world`.
- 별도 auth scope: operator 진입 시 **AAL2 강제** + admin JWT claim 검증.
- 별도 realtime 채널: operator = `admin:*` only. user = `user:* / wallet:* / game:* / chat:* / market:*` only.
- 별도 deploy 파이프라인: operator 배포가 user 트래픽 영향 0.
- ESLint 룰: `src/packages/operator/*` 는 user app에서 import 금지(역방향만 허용).

점진 마이그레이션:
1. **Now**     — `src/packages/operator` 폴더 신설, admin 컴포넌트 이전(route 유지).
2. **Week 2**  — `vite.operator.config.ts` + 별도 build script + chunk 검증.
3. **Week 3**  — `ops.phonara.world` 서브도메인 라우팅 + AAL2 게이트.
4. **Week 4**  — user 번들에서 operator 코드 제거 검증(`source-map-explorer`).

---

## 14. Ω-LOCK 5 Safety Pins (마지막 추가 · 실패 방지 안전핀)

새 기능이 아니라 **"기술적으로 무너질 수 없게 만드는" 5개 안전핀.** 이걸로 사실상 LOCK.

### 14-1. Hard Performance CI Gate
"목표"가 아니라 **merge 불가능**하게 강제.

```text
PR 자동 reject:
  - Layer 1 entry gzip > 180KB         (bundle-check)
  - Lighthouse mobile perf < 90        (lighthouse-ci)
  - INP > 200ms (lab) / LCP > 2.5s     (lighthouse-ci)
  - unused deps 증가                    (depcheck)
  - Layer 1 → Layer 2/3 import 발견    (eslint custom)
  - animation budget 초과 (>3 동시)     (eslint custom 13-1)
```

신규: `.github/workflows/perf-gate.yml` + `scripts/bundle-check.ts` + `lighthouserc.json` (mobile preset). PR comment bot이 budget diff 표를 자동 게시.

### 14-2. Money Path Isolation (물리적 격리)
Fail-Soft는 런타임 보호 — 여기에 **빌드타임 import 차단**을 더한다.

```text
src/packages/critical/  ⇒ auth · wallet · deposit · withdraw · oracle · kernel
  forbidden import 대상:
    @pkg/social/*  @pkg/avatar-nft/*  @pkg/live/*  @pkg/3d/*
    @pkg/clip/*    framer-motion(critical 전용 사용 외)
    optional realtime 채널 (chat/clip/feed)
```

ESLint `no-restricted-imports` + dependency-cruiser 룰. 위반 시 빌드 실패. 결과: "채팅 버그 때문에 출금 UI 죽음" 사태 원천 차단.

### 14-3. Telemetry Sampling Rule
텔레메트리가 성능을 죽이지 않게 채널별 샘플링 차등.

```text
HIGH-FREQUENCY (sample 5~10%, client-side bucket)
  - scroll · hover · pointermove · animation frame · fps tick
  - route change · component mount

CRITICAL FINANCIAL (sample 100%, 영구 보존)
  - deposit · withdraw · receipt verify · oracle drift
  - kill-switch toggle · permission change · anomaly events
  - crown award · package purchase · refund
```

`@pkg/telemetry/sampling.ts` — `track(name, payload, { tier: "high" | "critical" })`. high tier는 클라이언트에서 hash bucket으로 컷, critical은 무조건 flush + retry.

### 14-4. Anti-FOMO Fatigue Rule (정량 규칙화)
Emotion Timing(12-3)을 **숫자로** 강제.

```text
화면당 동시 attention source ≤ 2
  attention source = { ticker, marquee, pulse, glow, autoplay video,
                       toast, confetti, shake, count-up, shimmer }

위반 예시:
  ❌ Whale ticker + Live card glow + Mission shimmer + Toast popup (4)
  ✅ Whale ticker + Live card glow (2)
```

`@pkg/ui/AttentionRegistry` — 컴포넌트가 mount 시 `claimAttention(kind)` 호출, 2개 초과 시 dev에서 warn + 가장 낮은 우선순위 자동 mute. `/admin/kpi`에 attention overflow 빈도 패널.

### 14-5. Emergency Degrade Mode (`SYSTEM_DEGRADE`)
트래픽 폭주 / WS 장애 / 저사양 단말에서 **죽지 않는 모드**.

```text
trigger:
  - 수동: platform_kill_switches.degrade_mode = true (admin)
  - 자동: client fps < 30 5초 연속 OR WS reconnect > 3회/min
          OR navigator.connection.saveData OR memory <2GB

degrade 동작:
  - 모든 animation off (prefers-reduced-motion 강제)
  - clip/video autoplay off
  - realtime poll 5s → 30s
  - shadow/blur/backdrop off
  - feed limit 50 → 10
  - 3D 라우트 disable → 2.5D fallback
  - market freeze 시 last-known price + "FROZEN" 칩
```

신규: `platform_kill_switches.degrade_mode` 컬럼 + `useDegradeMode()` 훅 + `<body data-degrade="1">`. Tailwind `degrade:hidden`/`degrade:opacity-100` 변형. 자동 트리거는 13-2 device 신호 + WS health 합산.

---

## 15. 최종 느낌 (체크리스트)

플랫폼이 아래 5개 다 충족하면 출시 합격:
- [ ] 조용한데 살아있다 (Emotion Timing)
- [ ] 가벼운데 깊다 (3-Layer)
- [ ] 복잡한데 사용은 단순하다 (Layer 1 instant)
- [ ] 돈 플랫폼인데 게임처럼 쉽다 (Trust + Identity)
- [ ] 게임인데 돈은 거래소처럼 신뢰된다 (Receipts + Status + Oracle)

---

## 16. 지금 바로 1번 작업

**Week 1 detox + Ω-Core/Ω-FINAL 토대 병렬 착수:**
- Toast 4-Tier (`notify.critical/important/passive/silent`) + ESLint `no-direct-sonner` 룰
- `@pkg/realtime` 4채널 진입점 + GodModePanel·AIBotCards 마이그레이션
- `setVisibleInterval` 헬퍼로 30+ setInterval 일괄 교체
- `@pkg/ui/SoftBoundary` 도입 + optional 마운트 지점 1차 적용
- `web-vitals` + budget telemetry 수집 (`/admin/kpi` 패널 후속)
- `@pkg/performance/runtime` (runWhenIdle/runIfVisible/runAfterFirstInteraction) + `@pkg/performance/device` (useDeviceProfile) 토대
- `src/packages/operator` 폴더 신설 + admin 컴포넌트 점진 이전 시작 (route 유지)

이게 끝나야 Week 1 #2/#4/#5… 진행. **Week 1 끝까지 신규 기능 금지. 매주 금요일 Death Cleanup Day 시작.**
