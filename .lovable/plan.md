
# Phase 4 — 3초 이해 · 3분 체험 · 1탭 입금 (실행 확정본)

이전 Phase 3.4(미션·게임 대청소)는 코드에 반영 완료. 본 Phase 4는 **(A) 누락 보완 + (B) Guide 7씬 FOMO + (C) 자문관·SIM 배지 마감**까지 단일 배포로 끝냅니다.

## A. 반영 검증 & 누락 보완

| 항목 | 조치 |
|------|------|
| `PaymentStickyCTA` | `/achievements`, `/arena/army` 하단에도 마운트 (`/missions`는 이미 적용) |
| `.senior-mode` 토큰 | `src/index.css` 본문 22px / 버튼 56px / 행간 1.6 강제 셀렉터 보강 |
| 페르소나·시니어 분기 회귀 | `src/test/missions-bucket.test.ts` 신규 — `missionBucket()` + 페르소나 강제 필터 단위 테스트 |
| HubTabs.earn 3개 | 이미 적용, 회귀 확인만 |

## B. Guide `?tab=starter` 7씬 FOMO 풀스크롤

```text
씬1 HERO     "지금 18,432명 입금 중" + SIM 실시간 카운터 + Magic Link 1버튼
씬2 PROBLEM  주식·전세사기·다단계 피해 통계 + 시니어 친화 카피
씬3 SOLUTION 60초 군대 배틀 1탭 데모 (framer-motion 모션 + 라이트 SVG)
씬4 PROOF    실시간 출금 티커 + LivePayoutSlaBadge + 운영자 무손실 인장
씬5 PERSONA  20대/40대/60대 아바타 카드
씬6 PACKAGE  EmpireMonarch + Recovery Bonus 강조 (PackageBoostPreview 재활용)
씬7 CTA      💎 50,000원 1탭 입금 → /wallet?intent=first-deposit&amount=50000
```

신규 파일:
- `src/components/guide/FomoScrollHero.tsx` — 씬1 (`framer-motion`, 기존 `EmpirePopulationPulse`/`LiveStats` 재사용)
- `src/components/guide/FomoScrollScenes.tsx` — 씬2~6, IntersectionObserver 페이드/슬라이드
- `src/components/guide/FomoFinalCTA.tsx` — 씬7 (`DepositCTA` 래핑)

수정:
- `src/pages/Guide.tsx` — `tab=starter` 시 위 3컴포넌트 풀스크롤 렌더, 기존 가이드 내용은 `tab=detail`로 보존 (URL 호환)

## C. 추가 업그레이드

1. **AI 황제 자문관 진입점** (`src/components/FloatingChat.tsx`)
   - 라벨 "AI 황제 자문관"으로 변경
   - 첫 진입 시 프리셋 버튼 3개: "내 등급은?" · "지금 뭐 해야 돼?" · "출금 언제 가능?"
   - 백엔드/RPC 변경 0

2. **SIM 배지 일괄 적용**
   - `src/components/LiveStats.tsx`, `LiveRanking.tsx`, `PayoutTicker.tsx`에 작은 "SIM" 칩(`border-border/60 text-muted-foreground`) 한 번만 표기
   - 법적·신뢰 리스크 차단

## D. 절대 불변

- 디자인 토큰(Gold & Dark Empire) 1픽셀 불변
- Magic Link 최우선, AdultGate, AAL2/OTP 출금 스텝업, 운영자 무손실
- 미션·패키지·출금 RPC, RLS, 트리거 0변경
- 게임 엔진 컴포넌트(Tap/Memory/Slot 등) 삭제 금지 — 회귀 0
- 백엔드 rate limiting 추가 금지 (인프라 미비)

## 파일 변경 요약

신규 (4)
- `src/components/guide/FomoScrollHero.tsx`
- `src/components/guide/FomoScrollScenes.tsx`
- `src/components/guide/FomoFinalCTA.tsx`
- `src/test/missions-bucket.test.ts`

수정 (6)
- `src/pages/Guide.tsx`
- `src/pages/Achievements.tsx`
- `src/pages/TradingArenaWithArmy.tsx`
- `src/index.css`
- `src/components/FloatingChat.tsx`
- `src/components/LiveStats.tsx` (+ `LiveRanking.tsx`, `PayoutTicker.tsx`에 SIM 칩)

## 검증 체크리스트

1. `/guide?tab=starter` → 7씬 풀스크롤 자연 스크롤, 씬7 CTA 클릭 → `/wallet?intent=first-deposit&amount=50000`
2. `/guide?tab=detail` → 기존 가이드 그대로 (구 링크 호환)
3. `/missions`, `/achievements`, `/arena/army` 하단 → 비결제(NORMAL + 잔액 0) 유저에게만 `PaymentStickyCTA` 노출
4. 시니어 모드 ON → 본문 22px / 버튼 56px / 행간 여유
5. 페르소나 60s/70s+ → `/missions`에서 senior 탭 강제 (단위 테스트 통과)
6. `LiveStats`/`LiveRanking`/`PayoutTicker`에 "SIM" 칩 노출
7. `FloatingChat` 라벨 = "AI 황제 자문관" + 프리셋 3버튼
8. Magic Link · AdultGate · 출금 AAL2/OTP · 운영자 무손실 회귀 0
9. HubTabs.earn = 3개 유지

## 한 줄

"미션 대청소"는 끝났고, 이제 **Guide 한 화면이 자동으로 손가락을 입금 버튼까지 끌고 가는** 마지막 한 방을 박는다.
