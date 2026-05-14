# Track 2 — Runtime & Lek Profile

> 측정 환경: Lovable preview 샌드박스 (Vite dev mode, no minify, no HTTP/2 push).
> 절대 수치는 prod 빌드보다 2~3× 비대 → **상대 비교 + 코드 레벨 누수 검출**에 사용.
> 인증 필요한 라우트(/dashboard, /wallet, /admin)는 secure-auth로 리다이렉트되어 정적 분석 위주로 점검.

## 0. Route-by-route runtime metrics (logged-out)

| 라우트 | Heap | DOM | Listeners | Layout count | Style recalc | Task duration |
|---|---|---|---|---|---|---|
| `/` (Index) | 9.6 MB | 149 | 183 | 5 | 27 (16 ms) | 519 ms |
| `/dashboard` → /secure-auth | 21.9 MB | 2660 | 513 | 90 (430 ms) | 216 (136 ms) | 4.15 s |
| `/lounge` (public) | 20.3 MB | 499 | 385 | 110 (525 ms) | 352 (200 ms) | 5.45 s |

핵심 신호:
- `/lounge` Style recalc **352회 (200 ms)** + Layout **110회 (525 ms)** — framer-motion 무한 애니메이션 누적 의심.
- `/dashboard` 리다이렉트만으로도 Heap 22 MB / DOM 2.6k — auth 경로가 무거움.
- `/` LCP 7.6 s (dev mode) — i18n.ts (120KB) + lucide-react (157KB) eager chunk가 비동기 import 경로에 끼어있음.

## 1. Critical (즉시 수정)

### 🔴 P1. GodModePanel — 채널 이중 구독 + 단일 진입점 위반
**파일**: `src/components/admin/GodModePanel.tsx:80-114`

```ts
useRealtimeChannel({ key: "admin:presence:godmode", bindings: [], onEvent: ()=>{} });  // 빈 구독 (낭비)
const ch = supabase.channel("admin-presence-godmode", {...});                          // 직접 호출 (룰 위반)
```

문제:
1. `useRealtimeChannel`이 bindings=[]로 마운트 → realtime WS 채널 1개 생성하고 어떤 이벤트도 구독 안 함 (낭비).
2. 같은 컴포넌트에서 `supabase.channel(...)` 직접 호출 → `mem://realtime/unified-channel` 룰 위반 + presence 채널 1개 추가.
3. **모든 admin 페이지에서 마운트** → admin이 탭 전환할 때마다 unmount/remount → presence flicker.

**패치**: 빈 useRealtimeChannel 제거, presence는 `useRealtimeChannel({ presence: ... })` 형태로 통합 또는 임시 허용으로 메모리에 화이트리스트 명시.

### 🔴 P2. AIBotCards — 직접 supabase.channel
**파일**: `src/components/AIBotCards.tsx:761`

```ts
const ch = supabase.channel(`ai_mini:${db.user.id}`)
  .on("postgres_changes", { ..., table: "ai_bot_runs", filter: `user_id=eq.${db.user.id}` }, load)
```

`useRealtimeChannel` 미사용 → core 메모리 룰 위반. ActiveBotsMini가 Dashboard MoreSection에서 lazy 마운트되므로 영향 범위 큼.
**패치**: `useRealtimeChannel({ key: "ai_mini", bindings: [{ table:"ai_bot_runs", filter:`user_id=eq.${uid}` }], onEvent: load })`.

## 2. High

### 🟠 P3. /lounge 무한 애니메이션 누적
Layout 525 ms + Recalc 200 ms in 9 s — `repeat: Infinity` 사용 컴포넌트 30+개 중 Lounge 화면에 동시에 떠 있는 후보:
- `LiveRankingMarquee`, `FomoNotificationStrip`, `WhaleStrikeRail`, `CrownAura` (Baron+ 회전 코로나)
**권장**: Lounge에서 `IntersectionObserver` 기반 일시정지 + `prefers-reduced-motion` 가드 표준화. CrownAura는 idle GPU 0% 유지가 가장 시급.

### 🟠 P4. 30개+ setInterval — visibilitychange 가드 누락
visibility 체크가 들어간 곳: `useJitter`, `use-now-tick`, `raf-scheduler` (모범).
**누락 (서버 호출 동반)**:
- `LiveStats.tsx:56` `tickOnline` 30 s — `get_bot_online_count` RPC 무한 호출
- `LiveRanking.tsx:91` 30 s safety — 데이터 RPC
- `Trust.tsx:46` — payouts 실시간
- `Cockpit.tsx:98` 5 s — admin snapshot
- `useImperialState:80` 30 s, `Empire.tsx:45` 60 s, `Whales.tsx:39` 60 s, `WarTradingArena:53` 60 s
- `admin/Cockpit:83`, `admin/Revenue:50`, `admin/Kpi:97`, `admin/CockpitV2:163` 모두 45~60 s

**위험**: 백그라운드 탭 100개 열면 분당 600+ RPC. Supabase 무료 한도 + 비용 직격.
**패치**: 공통 헬퍼 `setVisibleInterval(fn, ms)` 추가하여 `document.hidden` 시 skip.

### 🟠 P5. Dev 빌드 i18n.ts 120KB / lucide-react 157KB eager
prod 번들은 split되지만 `src/lib/i18n.ts` 자체가 한 파일 120KB → 모든 라우트 첫 진입에 동기 번들.
**패치**: 언어별 chunk split (`import('./locales/ko')`처럼 dynamic).

## 3. Medium

- **EmpireArmy3D 그림자 export**: 현재 2D 영구 대체이지만 lazy import 캐시 살아있음 — OK (단순 re-export).
- **Dashboard.tsx**: lazy 컴포넌트 22개 + LazyMount 6개 → 잘 됨. 단 `OnboardingV2`/`SixtySecondFlow`/`EarnedToast`/`LivePurchaseTicker`/`FirstDepositTopBanner` 모두 Suspense 1개 안에 묶여 있어 하나라도 서스펜드되면 모두 대기.
- **AdminLayout**: `lg:pr-[340px]` padding 적용했지만 GodModePanel은 우측 fixed가 아니라 SidebarInset 내부 — 빈 padding 공간이 생길 수 있음 (DOM 검사 필요).
- **TrustHistoryCharts**: IntersectionObserver lazy ✅ 모범 사례.
- **use-now-tick**: 싱글톤 + visibility-aware ✅ 모범 사례.

## 4. Low

- LCP 이미지 preload 미적용 (`/index.html`).
- `cdn.jsdelivr.net` Pretendard render-blocking — `media="print" onload` 트릭 권장.
- Largest chunk lucide-react 157KB — 트리쉐이킹 검증 필요 (named import만 사용 중인지).

---

## 즉시 적용 패치 (Critical만)

1. **GodModePanel** — 빈 useRealtimeChannel 제거 + 코드 주석에 presence 예외 명시.
2. **AIBotCards** — `useRealtimeChannel` 마이그레이션.

위 두 가지를 본 PR에 함께 반영. P3~P5는 별도 PR (Lounge 애니 가드 / setVisibleInterval 헬퍼 / i18n 분할) 권장.
