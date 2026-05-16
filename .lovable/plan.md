# Sprint 1 Week 3 — Earn Hub MVP + Viral Foundation

5장의 살아있는 카드로 구성된 /earn 허브와, 빅윈 자동 공유 다이얼로그를 만들어 "매일 무료로 돈 버는 곳 → 헤어나갈 수 없는 곳" 루프의 핵심 엔진을 완성합니다.

## 사용자 입장에서 보이는 것

- /earn 페이지 헤더에 "오늘 얼마 벌었나요?" + 오늘 누적 PHON 큰 숫자 카운터
- 5개의 따뜻한 카드 (모바일 1열 / md 2열 / lg 3열)
  1. 출석체크 D1~D7 — 한 번에 클레임
  2. 오늘의 미션 3종 (게임 1판, 친구 초대, 첫 입금) — 즉시 보상
  3. 친구 초대 코드 + 한 번에 카카오/문자/링크 공유
  4. "오늘 한 게임 = +80 PHON" 자동 보상 카드
  5. 공유하고 받기 — 1080×1350 이미지 자동 생성 다이얼로그
- 슬롯·트레이딩·출금 큰 승리 시 자동으로 "공유 다이얼로그" 팝업 → 8개 채널 (인스타/틱톡/유튜브/X/네이버/카카오/라인/저장)
- 모든 버튼 44px+, 큰 숫자, 따뜻한 카피, 디자인 토큰만 사용

## 백엔드 (단일 마이그레이션)

신규 테이블

- `daily_quick_claims (user_id, kind, day, amount)` — UNIQUE(user_id, kind, day), RLS 본인 SELECT/INSERT

신규 RPC (모두 SECURITY DEFINER + `set search_path = public`)

- `claim_daily_quick_reward(_kind text)` — 화이트리스트 보상 (mission_play=100, mission_invite=150, mission_deposit=300, play_today=80). INSERT … ON CONFLICT DO NOTHING. 성공 시 `phon_balances` +amount, `mission_history` 로깅. 이미 클레임 시 멱등 반환.
- `claim_share_reward(_channel text)` — 채널 화이트리스트(instagram/tiktok/youtube/x/naver/kakao/line/copy). 일일 1회 +200 PHON. 내부에서 `log_share_event` 호출.
- `get_earn_hub_state()` — 단일 호출로 5카드 상태 반환: streak(streak일수, 오늘 클레임 여부, 다음 보상), missions(3종 클레임 여부+보상), play_today(클레임 여부), share_today(클레임 채널 목록), referral(코드/누적 초대/누적 보상), todayEarned(오늘 총 PHON).

기존 RPC 재활용: `claim_daily_attendance`, `log_share_event`, `process_referral_deposit`, referrals/profiles/phon_balances.

## 프런트엔드

신규 훅 — `src/hooks/use-earn-hub.ts`

- 단일 `get_earn_hub_state` 호출로 모든 카드 상태 로드
- `claim(kind)`, `claimShare(channel)`, `claimAttendance()` 메서드에 optimistic update + 실패 시 롤백
- realtime: `phon_balances` 변경 시 todayEarned 재계산

신규 컴포넌트 (모두 디자인 토큰 — gold/pink/card/text/muted)

- `src/components/earn/StreakCard.tsx` — D1~D7 도트, 오늘 클레임 CTA, 큰 +PHON
- `src/components/earn/MissionsCard.tsx` — 3미션 체크리스트 + 각 클레임 버튼
- `src/components/earn/ReferralCard.tsx` — 코드/링크/카카오/문자/링크 공유 + 누적 통계
- `src/components/earn/PlayToEarnCard.tsx` — "오늘 한 게임 +80 PHON" + /games 이동
- `src/components/earn/ShareRewardCard.tsx` — 빅윈 공유 다이얼로그 트리거
- `src/components/share/BigWinShareDialog.tsx` — 1080×1350 캔버스(닉/금액/심볼/날짜/QR-style brand), 8 채널 그리드, 클릭 시 `navigator.share` 또는 채널별 인텐트 + `claim_share_reward(channel)`
- `src/components/share/BigWinShareHost.tsx` — 전역 `window` 이벤트 `phonara:bigwin` 리스너 → 다이얼로그 자동 오픈

수정

- `src/pages/Earn.tsx` — 완전 재작성, SlimShell + 헤더 카운터 + 5카드 그리드 + framer-motion 0.2~0.3s
- `src/App.tsx` — `<BigWinShareHost />` 전역 마운트

## 빅윈 트리거 (회귀 없음, 부가 디스패치만)

기존 BigWin 발생 지점에서 한 줄만 추가:
```ts
window.dispatchEvent(new CustomEvent("phonara:bigwin", { detail: { amount, symbol } }));
```
- 슬롯/룰렛 BigWinModal 마운트 시
- Wallet 출금 완료 토스트 시
- Trading PnL +임계치 이상 청산 시

## 성공 기준

- /earn 5카드 모두 실제 RPC와 연결, 클릭 한 번에 PHON 즉시 적립
- 빅윈 발생 → 자동 공유 다이얼로그 → 채널 클릭 → +200 PHON
- 친구 코드 카카오 한 번에 공유 가능
- 50~70대도 한눈에 이해, 디자인 토큰만, 회귀 0
