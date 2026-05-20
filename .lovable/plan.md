# 모바일 중복 탭 제거 + PC 사이드바 부활 + 대관전 노출 (Stake/Rollbit급 IA)

## 진단 (현재 무엇이 잘못됐나)

1. **모바일 탭 중복**
   `SlimShell` 이 모든 페이지에 `PhonaraNav`(fixed bottom-0)를 깔고 있는데, 이번에 추가한 `MobileShell → MobileBottomNav` 도 fixed bottom-0 으로 마운트됨 → **하단 두 줄 겹침**.
2. **PC 메뉴 빈약**
   `PhonaraNav` 가 데스크탑에서는 sticky 5탭(홈/거래/PHON/게임/내정보) 띠 하나뿐. **사이드바도, 대관전 진입도, ApexForge 진입도 없음** (대관전은 TopBar 오른쪽 작은 칩 1개에만 존재).
3. **대관전(/duel) 메뉴 부재**
   모바일·PC 양쪽 primary nav 에 `/duel` 없음. PhonaraNav 중앙 PHON 버튼을 **600ms 길게 눌러야** 갈 수 있는 숨겨진 동선.
4. **Stake/Rollbit 압살 부족**
   왼쪽 영구 사이드바(카지노/스포츠/대관전/프로모션/VIP/지갑) 부재. 정보 위계가 평평함.

## 목표

- 모바일: **하나의 하단 탭(MobileBottomNav)** 만 노출, 대관전 1급 진입.
- PC: **영구 좌측 사이드바(StakeStyleSidebar)** + 상단 TopBar 유지, 모든 주요 도메인 1클릭.
- 양쪽 다 대관전(/duel) 1급 노출, ApexForge gold 강조 유지.
- money-flow 8경로 git diff = 0, Layer 1 gz +5KB 이내.

## 1. 모바일 중복 제거

`PhonaraNav` 는 더이상 모바일에서 렌더링하지 않는다.

- `PhonaraNav.tsx` 루트 `<nav>` 에 `hidden md:block` 추가 → 모바일 완전 숨김. 데스크탑에서는 사이드바가 메인이 되므로 PhonaraNav 자체를 `SlimShell` 에서 제거할지 옵션 (B안 채택, 아래 §2).
- `SlimShell` 은 `PhonaraNav` 마운트 제거. 모바일 탭은 `MobileShell`(이미 App 루트에 마운트), 데스크탑 IA 는 새 `StakeStyleSidebar` 가 담당.
- `--bottom-nav-h` CSS 변수는 모바일에서만 72px, 데스크탑은 0 으로 강제 (이미 부분 적용됨, 확인 후 보강).

## 2. 모바일 탭 재배치 (대관전 1급)

기존 5탭 → **6탭 안 채택 X, 5탭 유지 + 라벨/타겟 교체**.

| # | 라벨 | 경로 | 강조 |
|---|------|------|------|
| 1 | 홈 | `/` (로그인 → `/dashboard`) | normal |
| 2 | **에이펙스** | `/apex` | Gold (유지) |
| 3 | **대관전** | `/duel` | **Crimson glow + ⚔️** |
| 4 | 게임 | `/games` | normal |
| 5 | 더보기 | sheet | normal |

- 기존 "출금" 은 `MoreSheet` 와 TopBar 충전 버튼으로 이동 (충전·출금 둘 다 TopBar `/wallet` 에서 처리).
- `MoreSheet` 상단 섹션에 출금 (`/wallet?tab=withdraw`) 추가.

## 3. PC 좌측 영구 사이드바 (`StakeStyleSidebar.tsx` 신규)

- 위치: `fixed left-0 top-14 bottom-0 w-[232px]`, `hidden md:flex`, z-30.
- 본문은 `md:pl-[232px]` 로 밀어줌 (SlimShell `<main>` 에 반응형 패딩).
- 섹션 구조 (Stake/Rollbit 패턴):

```text
[PRIMARY]
  홈          /
  ⚔️ 대관전   /duel        (Crimson)
  ✨ 에이펙스 /apex        (Gold)
  카지노      /games
  슬롯        /casino
  거래        /trade
  라이브      /live

[황실]
  황실 홈     /empire
  랭킹        /empire?tab=rank
  VIP Pass    /vip

[내 자산]
  지갑·충전·출금  /wallet
  미션          /missions
  내 프로필     /profile

[푸터 칩]
  보안/설정 · 페어니스 · 고객지원
```

- 활성 라우트: `bg-card/60 border-l-2 border-[hsl(var(--gold))]`.
- 대관전 항목: 항상 ring-1 ring-rose-400/40 + 작은 "LIVE" 칩.
- 에이펙스 항목: gold gradient text.
- 사이드바는 60대 가독성 위해 라벨 14.5px, 항목 높이 44px.

## 4. PhonaraNav / TopBar 정리

- `PhonaraNav`: SlimShell 에서 제거. 파일은 보존하되 사용처 없는 상태(추후 정리).
- `PhonaraTopBar`:
  - 모바일에서 TopBar 좌측 햄버거 1개 추가 → `MobileBottomNav` "더보기" 와 동일 sheet open.
  - 데스크탑 "대관전" 칩은 사이드바와 중복이므로 삭제.

## 5. SlimShell 수정

```tsx
<div className="min-h-screen bg-background text-foreground">
  <PhonaraTopBar />
  <div className="md:pl-[232px]">
    <StakeStyleSidebar />
    <main className="pb-[calc(var(--bottom-nav-h,0px)+env(safe-area-inset-bottom))] md:pb-0">
      {children}
    </main>
  </div>
</div>
```

`--bottom-nav-h` 는 모바일에서만 72px (이미 `index.css` 에 mobile media query 로 적용됨).

## 6. 가드레일

- money-flow 8경로 무변경 (`scripts/check-money-flow-freeze.mjs` PASS).
- Layer 1 gz +5KB 이내 (StakeStyleSidebar 는 lucide 아이콘만, framer-motion 미사용).
- `prefers-reduced-motion` 존중, transform/opacity 만.
- `/apex/*`, `/auth*`, `/admin*`, `/legal*` 에서는 사이드바/하단탭 자동 숨김 (각자 자체 셸).

## 파일 변경 범위

```text
신규:
  src/components/nav/StakeStyleSidebar.tsx
  src/components/nav/sidebarItems.ts

수정:
  src/components/nav/MobileBottomNav.tsx        # 5탭 라벨/경로 교체 (출금 → 대관전)
  src/components/nav/MoreSheet.tsx              # 출금 항목 추가
  src/components/nav/PhonaraNav.tsx             # hidden md:block 가드 (안전망)
  src/components/nav/PhonaraTopBar.tsx          # 데스크탑 대관전 칩 제거, 모바일 햄버거 추가
  src/components/layout/SlimShell.tsx           # PhonaraNav 제거, Sidebar 마운트, md:pl-232
  src/index.css                                 # --bottom-nav-h md:0px 확정
```

## 변경하지 않는 것

- money-flow RPC, 비즈니스 로직, ApexShell 내부.
- 페이지 컴포넌트 (Index.tsx 등) 본문.

## 검증

- [ ] 모바일 376/360/344 viewport — 하단 탭 1줄만 표시.
- [ ] PC 1280/1440 — 좌측 232px 사이드바 노출, 본문 안 잘림.
- [ ] 대관전 항목 모바일·PC 모두 1탭/1클릭 진입.
- [ ] `scripts/check-money-flow-freeze.mjs` PASS.
- [ ] size-limit Layer 1 ≤ 180KB gz.
