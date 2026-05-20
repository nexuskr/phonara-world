# 모바일 한손 조작 Bottom Nav 최적화 + ApexForge 노출

## 문제 진단

현재 PhonaraNav(`src/components/nav/PhonaraNav.tsx`)는 5탭(홈/거래/PHON FAB/게임/내정보) 구조에 탭 높이 58px·아이콘 20px·라벨 12px로, 50~70대 한손 조작 스펙(72px+ 터치, 17.5px 라벨)에 미달.
또한 Phase 5/6에서 만든 ApexForge 화면이 `/apex/*` 에 존재하지만 **메인 네비에 진입 링크가 0건** → 사용자 입장에서 "어디에도 안 보임".

## 목표

1. 어떤 모바일 기종(SE ~ Z Fold)에서도 엄지 한손으로 정확히 누를 수 있는 Bottom Nav
2. ApexForge를 가장 강한 강조로 메인 네비에 노출
3. 기존 5축 IA를 깨지 않기 위해 추가 메뉴는 "더보기" Bottom Sheet로 흡수
4. money-flow 8경로 git diff = 0 유지 (네비/시트만 손댐)

## 최종 탭 구성 (5개)

| # | 라벨 | 경로 | 강조 |
|---|------|------|------|
| 1 | 홈 | `/` (로그인 시 `/dashboard`) | normal |
| 2 | 에이펙스 | `/apex` | **GOLD 강조 + glow + scale 1.05** |
| 3 | 게임 | `/games` | normal |
| 4 | 출금 | `/wallet?tab=withdraw` | normal |
| 5 | 더보기 | (Bottom Sheet open) | normal |

PHON FAB(첫입금 +50% 펄스 원형)은 **에이펙스 탭 위 -top-6 floating**으로 이전 — 빈 자리 낭비 없이 강조 유지.

## 한손 조작 스펙 (강제)

- 탭 컨테이너 높이: **72px** + `env(safe-area-inset-bottom)`
- 각 탭 터치 영역: `min-h-[72px] min-w-[72px]`, 내부 hit-box `before:absolute before:inset-0`
- 아이콘: `w-[34px] h-[34px]` (strokeWidth 2.25, active 2.75)
- 라벨: **17.5px / font-black** (`text-[17.5px]`), `tracking-tight`, `leading-none`
- 탭 간격: `gap-3` (12px)
- Active: GOLD glow + `scale-[1.05]` transition 140ms cubic-bezier
- Pressed: `active:opacity-75 active:scale-95` 100ms
- `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`
- 에이펙스 탭은 항상 `bg-gradient-imperial/15` + `ring-1 ring-amber-300/50`, active 시 강한 glow
- 모든 NavLink는 `React.memo` 적용 (저사양 안드로이드 재렌더 방지)

## "더보기" Bottom Sheet (`<MoreSheet />`)

- 트리거: 5번째 탭
- 컴포넌트: 기존 `src/components/ui/bottom-sheet.tsx` 재사용 (Handle Bar 폭 확장: w-12 → w-16, h-1.5 → h-2)
- 항목 높이: **68px**, 좌우 패딩 20px, 항목 간 16px gap, 스크롤 없이 1뷰포트
- 항목 그리드 2열 (아이콘 28px + 라벨 16px Bold + sub 12px muted):
  - 트레이딩 `/trade`
  - 황실 `/empire`
  - 라이브 `/live`
  - 미션 `/missions`
  - 황제 컵 `/apex/events/cup`
  - 일일 금고 `/apex/vault`
  - 헬스 `/apex/health`
  - 내정보 `/profile`
- 닫기 버튼 우상단 **44px** + 시트 외부 탭 닫기

## Floating Action Button (한손 우하단)

- 기존 PHON 원형 FAB은 에이펙스 탭 위로 이동
- 새 우하단 FAB: **빠른 입금** (`/wallet?intent=first-deposit&tab=deposit`)
  - 위치: `fixed right-4 bottom-[calc(72px+env(safe-area-inset-bottom)+12px)]`
  - 크기: 64px 원형, 골드 glow
  - 라벨 sr-only "빠른 입금"
  - 이미 `<ImperialBetSlip>` 등 다른 FAB가 떠 있을 경우 z-index 충돌 회피: z-30 (Nav z-40보다 낮게)

## 데스크탑 (md+)

- 기존처럼 TopBar 아래 sticky로 유지
- 데스크탑에서는 5탭 높이 56px로 컴팩트, 라벨 15px (한손 스펙 강제 X)
- 더보기 Bottom Sheet는 모바일 전용; 데스크탑은 Popover/Menu

## 파일 변경 범위 (money-flow 무관)

```text
수정:
  src/components/nav/PhonaraNav.tsx     # 5탭 재구성 + 한손 스펙
  src/components/ui/bottom-sheet.tsx    # Handle 확대 (cosmetic)

신규:
  src/components/nav/MoreSheet.tsx      # 더보기 시트
  src/components/nav/QuickDepositFab.tsx# 우하단 빠른 입금 FAB
  src/components/nav/navTabs.ts         # TAB 메타 (테스트/Storybook 재사용)
```

App 루트(`src/App.tsx`)에 `<QuickDepositFab />` 한 줄 마운트 — 로그인 사용자만 노출, `/auth*`·`/legal*` 제외.

## 검증 체크리스트

- [ ] iPhone SE(375×667) / iPhone 16 Pro Max(430×932) / Galaxy S23 FE(360×780) / Galaxy Z Fold inner(344×882) 4기기에서
      엄지 한손 도달 영역(우하단 240° 반원) 내에 모든 5탭 + FAB 위치 확인
- [ ] 각 탭 hit-box 측정 ≥ 72×72px (Chrome devtools "computed")
- [ ] Active 상태 변경 latency ≤ 150ms
- [ ] 키보드/스크린리더: 탭 tabindex 순서 + aria-current 동작
- [ ] money-flow freeze: `node scripts/check-money-flow-freeze.mjs` PASS
- [ ] Layer 1 bundle 영향 ≤ +3KB gz (5탭 + 시트는 기존 컴포넌트 재사용)

## 변경하지 않는 것

- ApexShell 내부 라우팅·디자인
- 머니플로 RPC / 8경로 / House Edge §6
- 기존 페이지 코드 (Index/Dashboard/Wallet 등)
- 데스크탑 사이드바 IA (참고: 스크린샷에 보이는 좌측 사이드바는 `_AdminSidebar`로, /admin 영역 한정 — 메인 IA가 아님)

## 보고 형식 (구현 완료 후)

```
✅ 모바일 한손 조작 최적화 지구상 1개뿐인 최고사양 완료
- 터치 영역 스펙: 72×72px+, gap 12px, 라벨 17.5px Bold
- Bottom Nav 높이: 72px + safe-area
- 고령자/저사양 대응: React.memo, touch-action manipulation, 단순 그라디언트(필터 X), motion-reduce 존중
- ApexForge 노출: 2번 탭 GOLD 강조 + 더보기 시트 안 Cup/Vault/Health 진입
```
