# Sprint 1 — Review, Polish & Final Verification

카카오 SDK는 이번 스프린트에서 제외하고, /earn 의 7카드/룰렛/VIP/공유 시트를 "5초 룰" 기준으로 검증·폴리싱한다.

## 1. Verification Checklist (수동 확인)

- /earn 첫 진입 5초 이내: `오늘 번 PHON` 카운트업 + FOMO 라인 + 7카드 렌더 (Streak, Missions, Roulette, Referral, Play-to-Earn, VIP Boost, Share)
- Roulette: 24h 1회 / framer-motion 휠 감속 / `spin_daily_roulette` 호출 후 잔액·today_earned 즉시 반영 / 이미 돌린 경우 버튼 비활성 + 결과 표시
- VIP Boost: 활성 시 ×1.5 + 남은 시간 카운트다운, 비활성 시 /vip CTA. `get_earn_hub_state` 모든 미션 금액에 ×1.5 반영 확인
- ShareChannelsSheet: 카카오 카드 숨김(이번 스프린트 제외). 나머지 6채널(카카오스토리, X, Threads, Facebook, Telegram, Instagram) 정상. 클릭 시 `claim_share_reward` → +200 PHON 토스트
- OG 이미지 URL: `earn-share-card` edge에서 1200×630 SVG 반환 (kind/amount/nick)
- 모든 신규 텍스트는 `G.*` (g()) 만 사용

## 2. Polish 변경 (코드 적용)

A. ShareChannelsSheet — 카카오 채널 제거
- `ORDER` 에서 `"kakao"` 제외, 6채널만 노출 (kakaostory가 카카오 자리 대체)
- 인스타 와이드 CTA 유지

B. FOMO 라인 강화 + 실시간 인원 모킹
- `Earn.tsx` 헤더 보조줄을 `g('earnFomoLive')` 로 교체: `지금 1,2xx명이 PHON 받는 중`
- 60초마다 1100~1450 사이로 살짝 흔드는 `useFakePlayerCount` 재사용
- glossary 키 추가: `earnFomoLive` (템플릿: `지금 {n}명이 오늘 PHON 받고 있어요`)

C. 50–70대 가독성
- 헤더 숫자 클래스 `text-5xl md:text-6xl` 유지하되 `font-black tabular-nums tracking-tight`
- 모든 주요 CTA `min-h-[52px] text-base font-black` 확인 (Streak/Mission/Roulette/Share/VIP)
- 카드 본문 보조 텍스트 `text-sm`(현재 text-xs) 로 +1단계 상향 — Streak/Mission/Referral/Play 카드의 sub 라인만

D. Roulette 폴리시
- 휠 컨테이너 `will-change-transform` 추가로 모바일 jank 제거
- 결과 표시 영역에 `key=result` AnimatePresence 페이드/스케일 진입
- `claim_share_reward` 와 동일하게 결과 토스트 컬러를 Warm Gold (`notify.success` 그대로 사용 — 디자인 토큰 기반이라 OK)

E. VIP Boost
- 비활성 카드 CTA 라벨 `g('earnVipBoostCta')` 유지, 보조 라인은 `모든 미션 ×1.5 · 룰렛/공유 포함` 으로 명확화 (glossary `earnVipBoostHint` 추가)

F. 에러 토스트 통일
- Roulette/Share 실패 메시지를 `describeError` 경유로 정리 (이미 use-earn-hub 패턴과 동일)

## 3. 검증 후 산출물

- "Sprint 1 완전 종료" 선언
- Sprint 2 준비 상태: Earn 엔진 안정 → 다음은 Wallet/Withdraw UX 또는 Slot/Trade 통합 흐름 중 택1 제안

## 기술 노트

변경 파일:
- `src/components/share/ShareChannelsSheet.tsx` — ORDER에서 kakao 제거
- `src/components/earn/RouletteCard.tsx` — will-change + 결과 페이드인
- `src/components/earn/VipBoostCard.tsx` — 보조 라인 문구
- `src/pages/Earn.tsx` — FOMO 라이브 인원 라인
- `src/lib/glossary.ts` — `earnFomoLive`, `earnVipBoostHint` 2키 추가

스키마/RPC 변경 없음. 카카오 SDK 연동은 Sprint 2+ 별도 처리.
