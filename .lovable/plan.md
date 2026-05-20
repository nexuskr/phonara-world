# P1-C Final — Stake/Rollbit 압살 마무리

P0~P1-C에서 이미 처리된 항목(Layout hotfix, Hero 카피, CollectionHubTabs Crown 제거)을 기반으로, 남은 4개 영역만 마무리한다. 머니플로 8경로 / P0 엔진 / Crown 백엔드는 절대 손대지 않는다.

## 1. Mobile Bottom Nav 5탭 최종화

`src/components/nav/MobileBottomNav.tsx`(기존 컴포넌트)을 5탭 고정으로 통일.

- 홈 `/dashboard`
- 무료돈벌기 `/earn`
- 실시간대결 `/duel`
- 실시간예측 `/trade`
- 내PHON `/phon`

`env(safe-area-inset-bottom)` + `visualViewport` resize 리스너로 키보드 올라올 때 nav 숨김. active tab은 `imperial` glow variant.

## 2. Home 라이브 베팅 피드 (Tier S 카드 5번째)

신규 컴포넌트 `src/components/dashboard/v3/LiveBetFeed.tsx`:

- 공개 RPC `get_live_activity_60s` + `get_whale_strikes_24h` 머지 → 마스킹 닉/금액/win-loss
- 1.8s 간격으로 새 항목 unshift, 최대 12개 유지, framer-motion `AnimatePresence` slide-in
- 승=green token(`text-success`), 패=red token(`text-destructive`)
- 30s마다 RPC 재폴 + `useMarketChannel` realtime 보조
- `<DashboardHeroV3>` 직하단 + Tier S 그리드 우측 컬럼에 마운트

Tier S 카드 5개 점검: 무료돈벌기 / 실시간대결 / 실시간예측 / 내PHON / Whale Strike Rail — 기존 카드 그대로 두고 hover pulse + "지금 N명 참여중" 칩만 추가.

## 3. Crown UI Strict 0 sweep

`scripts/check-no-crown-ui.mjs` 실행 → 잔존 1건 확인 후 lucide `Crown` → `Sparkles`/`Gem`, "왕관"/"👑" 문자열 → "PHON 보상"/"✨"로 치환. 토스트 카피 포함. 단, 백엔드 RPC `award_crown` 등 이름/로직은 무변경.

## 4. P2 UX 마무리 (UI only)

- 친구추천: `/referral` 카드 1개로 통합, 중복 위젯 제거
- 배지: `<EmpireLevelBadge/>` 단일 출처, 다른 곳의 ad-hoc 뱃지 hide
- 슬롯 로비: `Casino.tsx` 그리드 spacing/aspect 정리 + 배당표 collapsible
- 패키지/잔액/등급: `<PowerHeader/>` 한 줄 통일
- Admin IA: `/admin` 좌측 그룹을 Ops / Money / Growth / System 4그룹으로 폴딩

## 5. 검증

- `check-no-crown-ui.mjs` = 0
- `check-money-flow-freeze.mjs` 8경로 PASS
- `check-operator-isolation.mjs` PASS
- PC 1440 / Mobile 375·390 sidebar 깜빡임 0 육안 확인
- Build error 0

## 기술 세부

- 신규 파일: `src/components/dashboard/v3/LiveBetFeed.tsx`
- 수정 파일(추정): `MobileBottomNav.tsx`, `DashboardV3.tsx`(피드 마운트), `Casino.tsx`, `/admin` 레이아웃, `Referral.tsx`, 잔여 Crown 사용처 1~3개
- DB/migration/edge function 변경 없음
- 머니플로 8경로(`award_crown`, Treasury, Founding Season, imperial_place_phon_bet, _settle, _apply_house_edge_split, withdrawal, deposit) git diff = 0 유지
