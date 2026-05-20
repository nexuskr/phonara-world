# 모바일 한손 조작 + ApexForge 강력 노출 — 전체 반응형 최적화

## 문제 진단

- Phase 5/6 ApexForge 화면(`/apex/*`)이 메인 네비에 진입 링크 0건 → 사용자에게 안 보임
- 현재 `PhonaraNav`: 탭 높이 58px, 아이콘 20px, 라벨 12px → 50~70대 한손 스펙 미달
- 홈 Hero 카드는 데스크탑 우선 설계라 모바일에서 강렬함 부족

## 목표

1. iPhone SE(375) ~ Galaxy Z Fold inner(344) 모든 기종에서 엄지 한손 조작 가능
2. ApexForge를 가장 강력하게 노출 (Bottom Nav 2번 탭 + 홈 대형 카드)
3. money-flow 8경로 git diff = 0, House Edge §6 0 터치, Layer 1 gz +5KB 이내

## 1. Bottom Navigation (`MobileBottomNav.tsx` 신규)

| # | 라벨 | 경로 | 강조 |
|---|------|------|------|
| 1 | 홈 | `/` (로그인 → `/dashboard`) | normal |
| 2 | **에이펙스** | `/apex` | **Gold gradient + glow + scale 1.05** |
| 3 | 게임 | `/games` | normal |
| 4 | 출금 | `/wallet?tab=withdraw` | normal |
| 5 | 더보기 | sheet open | normal |

### 한손 스펙 (강제)

- 컨테이너 높이: `72px + env(safe-area-inset-bottom)`
- 탭 hit-box: `min-h-[72px] min-w-[72px]`, `before:absolute before:inset-0`로 hit 확장
- 아이콘: 34px (`w-[34px] h-[34px]`, strokeWidth 2.25 / active 2.75)
- 라벨: **17.5px font-black** (`text-[17.5px]`), tracking-tight, leading-none
- 탭 간격: gap 12px
- Active: scale-[1.05] + gold glow, transition 140ms
- Pressed: `active:opacity-75 active:scale-95` 100ms
- `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`
- 에이펙스 탭: 항상 `bg-gradient-imperial/15 ring-1 ring-amber-300/50`, active 시 강한 glow + "PHASE 6 LIVE" 마이크로칩
- `React.memo` + `useCallback`으로 저사양 안드로이드 재렌더 차단

기존 `PhonaraNav`는 데스크탑 sticky 전용으로 유지 (md+), 모바일은 `MobileBottomNav`로 분기.

## 2. 더보기 Bottom Sheet (`MoreSheet.tsx` 신규)

- 기존 `src/components/ui/bottom-sheet.tsx` 재사용
- Handle Bar: **w-16, h-2** (확대)
- 좌우 padding 24px, 항목 gap 16px, 2열 그리드, 1뷰포트 안에서 스크롤 없이 노출
- 항목 높이 **72px**, 아이콘 28px + 라벨 16.5px Bold + sub 12px muted
- 닫기 버튼 우상단 44px

### 항목 (Apex Gold 상단 → 일반)

상단 (Apex Gold accent):
- 황제 컵 `/apex/events/cup`
- 일일 금고 `/apex/vault`
- 윈 릴스 `/apex/winreels`
- 헬스 `/apex/health`

하단 (일반):
- 트레이딩 `/trade`
- 황실 `/empire`
- 라이브 `/live`
- 미션 `/missions`
- 내정보 `/profile`
- 보안 `/security`

## 3. 모바일 레이아웃 셸 (`MobileLayout.tsx` 신규)

- 모바일에서만 사용 (`md:hidden` 컨테이너)
- 본문 영역: `pb-[calc(72px+env(safe-area-inset-bottom)+12px)]`
- Safe Area: `pt-[env(safe-area-inset-top)]`, `pl/pr-[env(safe-area-inset-left/right)]`
- 본문 max-w 제거 (full-width), 좌우 padding 16px 고정
- 모든 인터랙티브 요소 강제 `min-h-[56px]` (Tailwind plugin 없이 CSS 클래스 `.mobile-touch`)

## 4. Quick Deposit FAB (`QuickDepositFab.tsx` 신규)

- 위치: `fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))]`
- 크기: 64px 원형, 골드 glow, `aria-label="빠른 입금"`
- 경로: `/wallet?intent=first-deposit&tab=deposit&amount=50000`
- z-30 (Nav z-40 아래)
- 미로그인 / `/auth*` / `/legal*` / `/apex/cashout*` 제외

## 5. Apex Entry Card (`ApexEntryCardMobile.tsx` 신규)

- 위치: `src/pages/Index.tsx` Hero 직후, 모바일 전용 (`md:hidden`)
- 폰트: 제목 22px Black, 부제 16.5px
- 버튼 높이 64px, full width, Gold→Neon Red 그라디언트
- "🔥 무료 돈벌기 — Daily Vault + WinReels" → `/apex`
- 미니 KPI 3개 (오늘 잭팟 / Cup 진행률 / 활성 황제 수) — 공개 RPC 1개로 fetch, 5초 캐시

## 6. 성능 가드

- transform / opacity 애니메이션만 (filter, backdrop-blur 모바일 최소화)
- `prefers-reduced-motion` 존중
- `will-change`는 active 탭에만 잠시 부여
- 모든 신규 컴포넌트 `React.memo`
- Layer 1 bundle +5KB gz 이내 (size-limit 통과)

## 파일 변경 범위

```text
신규:
  src/components/nav/MobileBottomNav.tsx
  src/components/nav/MoreSheet.tsx
  src/components/nav/QuickDepositFab.tsx
  src/components/nav/navTabs.ts            # 탭 메타
  src/components/layout/MobileLayout.tsx
  src/components/landing/ApexEntryCardMobile.tsx

수정:
  src/components/nav/PhonaraNav.tsx        # md+ 전용으로 정리 (md:flex hidden)
  src/components/ui/bottom-sheet.tsx       # Handle bar 확대 (cosmetic only)
  src/pages/Index.tsx                      # Hero 직후 ApexEntryCardMobile 마운트
  src/App.tsx                              # MobileBottomNav + QuickDepositFab 루트 마운트
```

## 변경하지 않는 것

- money-flow RPC, 8경로, House Edge §6
- ApexShell 내부 라우팅·디자인
- 데스크탑 IA (PhonaraNav md+ sticky 유지)
- 기존 페이지의 비즈니스 로직

## 검증

- [ ] iPhone SE 375 / iPhone 16 Pro Max 430 / Galaxy S23 FE 360 / Z Fold inner 344 4기기 viewport 확인
- [ ] 5탭 + FAB 모두 우하단 240° 엄지 반경 내
- [ ] 각 탭 hit-box ≥ 72×72px (devtools computed)
- [ ] Active 변경 latency ≤ 150ms
- [ ] `scripts/check-money-flow-freeze.mjs` PASS
- [ ] size-limit Layer 1 ≤ 180KB gz 유지
- [ ] `prefers-reduced-motion` ON 시 애니메이션 제거 동작

## 최종 보고 형식

```
✅ 모바일 한손 조작 + ApexForge 강력 노출 지구상 1개뿐인 최고사양 완료
- Bottom Nav: 72px + safe-area, 아이콘 34px, 라벨 17.5px Bold
- 에이펙스 탭: Gold gradient + glow + PHASE 6 LIVE 칩
- 더보기 Sheet: 72px 항목, Apex 4종 Gold 상단 배치
- Quick Deposit FAB: 우하단 64px, thumb zone
- 홈: ApexEntryCardMobile (22px 제목 + 64px CTA)
- money-flow 8/8 PASS, Layer 1 +X KB gz
```
