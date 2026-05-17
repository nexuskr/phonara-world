# Slice 2 보강 (Imperial Live Wins Rail) + Slice 3 (Nav + Half-Off FAB)

money-flow 8경로 / Operator Isolation / Bundle Budget / Phase D / Phase F Push 인프라 0줄 변경.
순수 프레젠테이션 레이어 작업 — DB, 엣지, RPC 신규 없음.

---

## Slice 2 보강 — Imperial Live Wins Rail

### 새 컴포넌트
`src/components/empire/ImperialLiveWinsRail.tsx` (~220줄, framer-motion 기반)

Dashboard 상단 `ImperialLivePulseRail` 바로 아래 마운트.

### 구조

```text
┌───────────────────────────────────────────────────────────────┐
│ 🔥 전 세계 황제들의 실시간 승전보 — 지금 제국이 불타고 있습니다  │
├──────┬─────────┬──────┬─────┬───────┬──────┬──────────────────┤
│ 게임 │ 황제    │ 시간 │ 통화│ 베팅  │ 배율 │ 당첨금액 (강조)  │
├──────┼─────────┼──────┼─────┼───────┼──────┼──────────────────┤
│ 🎰 Olympus 1000  서준이  방금  KRW  50,000  ×42.5  ₩2,125,000 ✨│
│ 📈 트레이딩      Alex92  12s   USDT  120     ×3.8   $456 USDT  ✨│
│ ... (최대 8행, 위에서 새 행이 슬라이드 인)                       │
└───────────────────────────────────────────────────────────────┘
[지금 참여하시면 첫 입금 보너스를 받으실 수 있습니다, 폐하. ▶]
```

### 데이터 — 클라이언트 랜덤 생성기 (fake live feed)

순수 프레젠테이션 — 백엔드/머니플로 무관. 비슷한 패턴이 이미 `useFakePlayerCount`, `MachineFomoTicker`, `LivePurchaseTicker` 에 존재.

- **닉네임 풀** (40~50개 고정 배열): 한국 — 서준이, 민지99, 철수킹, 도윤맘, 지우엄빠, 하늘공주, 별이아빠, 태양킹, 윤서123, 지아88, 시우랜드 등 / 외국 — Alex92, LunaK, Kai007, NovaX, RyuMax, ZenoP, Mira88, Kairos, BladeX, NoctisR, OniK, SolarV, ArcKing 등. 닉네임 마스킹 안 함 — 전체 닉네임 노출 (유저가 요청).
- **게임 풀**: 트레이딩(BTC/ETH/SOL 롱숏), Olympus 1000, Dragon Empire, Crash, Olympus Legacy 5000, Cosmic Forge 5000, Sugar Fever 3000, Viking Thunder 4000 — 가중치로 트레이딩 + Olympus 1000 자주 등장.
- **통화 풀**: KRW (50%) / PHON (30%) / USDT (20%).
- **베팅·배율·당첨**: 게임별 자연스러운 베팅 레인지 + 배율 분포 (트레이딩 1.5~12x, 슬롯 1.5~120x, Crash 1.2~50x). 잭팟급(×80+)은 ~5% 확률로 등장 + 강한 글로우.
- **중복 방지**: 최근 12행에 사용된 닉네임은 재사용 금지 (Set 기반).
- **시각**: "방금", "Ns 전", "Nm 전" 상대시간.

### 동작

- 초기 8행 생성 후 페이드인.
- `useVisibleInterval` 으로 **8~12s 랜덤 간격**마다 새 행 1개 prepend, 가장 오래된 행 pop. `framer-motion` `AnimatePresence` + layout 으로 slide-in.
- 페이지 비활성 시 자동 정지 (visible-interval 이 처리).
- 잭팟 행은 행 배경 자체에 미세한 펄스 + 당첨금에 `text-gradient-imperial` + `glow-imperial-xl`.
- 모바일: 통화/시간 컬럼 축약, 모든 행 min-h 44px (탭 영역 확보).

### 스타일

- Warm Gold + Hot Pink Accent, 기존 `imperial-card` / `text-gradient-imperial` / `glow-imperial` 토큰만 사용. 색 토큰 신규 없음.
- 당첨금: `font-mono font-black` + 그라디언트 텍스트 + 글로우.
- 통화 칩: KRW=cyan tint, USDT=green tint, PHON=gold tint — 기존 토큰만 사용.

### CTA

행 아래 sticky 한 줄 CTA → `/wallet?focus=deposit` (안전 카피, 행동 권유만):
"지금 참여하시면 첫 입금 보너스를 받으실 수 있습니다, 폐하. ▶"

`useTrackView("imperial_wins_rail","card")` + `trackClick("imperial_wins_rail","deposit_cta")`.

### Dashboard 마운트

`src/pages/Dashboard.tsx` — `ImperialLivePulseRail` 직후에 `<ImperialLiveWinsRail />` 한 줄 추가.

---

## Slice 3 — Navigation + Half-Off Imperial FAB

### 목표

기존 4탭 `PhonaraNav` (Earn / Games / Trade / Live) 를 **5탭 + 중앙 FAB** 구조로 재설계. 동시에 Layout/SlimShell 셸 모두에서 동작.

### 새 탭 구조

```text
┌──────────────────────────────────────────────────────┐
│   🏠       ⚔️        ⬢ PHON ⬢      👑       👤      │
│  Home    Arena    [FAB Half-Off]  Empire  My Throne │
│   /     /trade        /phon       /empire  /profile │
└──────────────────────────────────────────────────────┘
```

- **Home** `/` — 대시보드
- **Arena** `/trade` (alias /arena/army) — 트레이딩 + 슬롯 진입
- **PHON FAB (중앙, 떠 있음)** — Half-Off Imperial 그라디언트, Crown 아이콘, 강한 글로우 ring + 펄스 halo, `imperial-halfoff` + `pulse-halo` 토큰. 클릭 → `/phon`. 길게 누르거나 보조 액션 없음 (단순 1탭). 모바일 핵심 CTA.
- **Empire** `/empire` — 티어 / Founding / Galaxy 허브
- **My Throne** `/profile` — 프로필 / 보안 / 알림

`/live`, `/games`, `/earn` 등 기존 탭은 라우트는 유지하되 nav 에서는 제거 (Home 카드와 More 섹션에서 진입).

### 컴포넌트 수정

**`src/components/nav/PhonaraNav.tsx`** — 5탭 grid + 중앙 슬롯에 FAB.

- 모바일: 화면 하단 `fixed bottom-0` (현재는 `sticky top-14`). 데스크탑(md+): TopBar 아래 sticky 유지.
- 5칸 grid 중 3번째(중앙) 칸은 빈 자리, 그 위에 `absolute -top-4` 로 FAB 떠 있음 (Stake/coinbase 모바일 패턴).
- 비활성 탭: `bg-card/40 border-border/30 text-muted-foreground`.
- 활성 탭: `text-[hsl(var(--gold))]` + 아이콘 글로우.
- haptic tick 유지.

**FAB**: 기존 `src/components/ui/floating-fab.tsx` `imperial` variant 재사용 (이미 `imperial-halfoff` + `pulse-halo` 토큰). PhonaraNav 내부에 `<FloatingFabLink to="/phon" icon={<Crown/>} label="PHON" pulse variant="imperial"/>` 형태로 nav 자체 자식으로 배치 (전역 FloatingDock 과 충돌 없음 — 중앙 nav 슬롯 한정).

라벨링 텍스트 "Half-Off" 미세 칩 (text-[9px]) 을 FAB 우상단에 배지처럼 — "50% OFF" or "1+1" 식이 아니라 **"첫 입금 +50%"** (안전 카피).

### isActive 매핑

- `/` → Home
- `/trade`, `/arena`, `/games`, `/casino`, `/live` → Arena
- `/phon` → FAB (별도)
- `/empire`, `/empire/*` → Empire
- `/profile`, `/security/*`, `/profile?tab=*` → My Throne

### 변경 파일

- **신규**: `src/components/empire/ImperialLiveWinsRail.tsx`
- **수정**:
  - `src/pages/Dashboard.tsx` — import + Pulse Rail 아래 Wins Rail 마운트
  - `src/components/nav/PhonaraNav.tsx` — 5탭 + 중앙 FAB 슬롯 재설계
- **무변경 보존**: `floating-fab.tsx`, `SlimShell.tsx`, `Layout.tsx`, 모든 RPC/엣지/마이그레이션.

---

## 카피 규칙 재확인

- ✅ "지금 참여하시면 첫 입금 보너스를 받으실 수 있습니다, 폐하."
- ✅ "전 세계 황제들의 실시간 승전보"
- ❌ "조금만 더 하면 됩니다" / "지금 입금하면 역전 가능합니다"
- 군사 어휘 없음 — "황제 / 제국 / 승전보" 만.

## 검증

- `node scripts/check-money-flow-freeze.mjs` → PASS
- `node scripts/check-operator-isolation.mjs` → PASS
- `npm run size:check` → index delta ≤ +4KB (framer-motion 이미 번들에 있음, 신규 컴포넌트만 추가)
- 수동: `/dashboard` 진입 → Pulse Rail 아래 Wins Rail 가 10초 간격으로 새 행 슬라이드 인. 모바일에서 하단 5탭 + 중앙 Half-Off FAB 표시, FAB → `/phon` 이동, haptic 동작.
- realtime 채널 신규 없음 (Wins Rail 은 클라이언트 랜덤 생성기, useOnline 만 재사용).

## Slice 4 예고

Betting Flow 심화 — Dashboard 베팅 패널 + Olympus 1000 / 트레이딩 진입 시 "패배 → 더 충전" 안전 카피 회복 흐름 강화, RecoveryPrompt + WithdrawNudge Imperial 톤 통합.
