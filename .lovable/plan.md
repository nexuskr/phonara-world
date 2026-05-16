# v14.0 Sprint 1 — Earn Engine Completion

"0원으로 가장 쉽게 돈 버는" 5초 룰을 완성한다. 이미 깔린 인프라 위에 빠진 3가지(룰렛 카드·VIP 부스트 카드·자동 공유 이미지 + 7채널) 만 정밀하게 얹어 Sprint 1 을 종결한다.

## 현재 상태 (재사용 가능)

이미 존재하므로 **새로 만들지 않는다**:

- 페이지: `/earn` (`src/pages/Earn.tsx`) + 5카드 (Streak·Missions·Referral·PlayToEarn·Share)
- 훅: `useEarnHub()` — 오늘 누적 PHON 카운트업 + 낙관적 업데이트 완비
- RPC: `get_earn_hub_state`, `claim_daily_attendance`, `claim_daily_quick_reward`, `claim_share_reward`, `spin_roulette`
- 테이블: `mission_templates`, `mission_history`, `referrals`, `referral_earnings`, `roulette_spins`, `crash_mission_claims`
- BigWin 공유 이벤트 버스: `src/lib/bigwinShare.ts` (`fireBigWinShare`)
- 채널 인텐트 매핑: `CHANNEL_INTENT` (x · line · naver, 카카오/IG/TT/YT 는 fallback)
- VIP 인프라: `vip_passes` 테이블 + `useVipPass()` 훅 + `subscribe_vip_pass_phon` RPC
- 글로사리: `@pkg/core/i18n/glossary` → `g()` (Sprint 0 완비)

## Sprint 1 에서 새로 추가 (Δ만)

### 1. Earn Hub 확장 — 카드 2개 추가 (총 7카드)

**A. RouletteCard** (`src/components/earn/RouletteCard.tsx`)
- 24h 1회 무료 스핀. 결과 50 / 100 / 200 / 500 / 1000 / 5000 PHON
- `spin_daily_roulette()` RPC (신규) — 서버 결정성 + idempotency_key=`roulette:{user}:{YYYYMMDD}`
- 가중치: `{50:35, 100:30, 200:18, 500:12, 1000:4, 5000:1}` (RTP ≈ 230 PHON/일, 명세 부합)
- 휠 회전 = framer-motion `rotate` (감속 cubic-bezier), 결과 칸 정중앙 정렬
- `get_earn_hub_state` 응답에 `roulette: { spun_today, last_amount, next_at }` 추가

**B. VipBoostCard** (`src/components/earn/VipBoostCard.tsx`)
- VIP 활성 시: "오늘 보상 ×1.5 적용중 · 남은 시간 23:14:02" 표시
- 비활성 시: "VIP 패스 30일 = +50% 모든 미션 보상 · 30,000 PHON" CTA → `/vip`
- `useVipPass()` 그대로 사용, 신규 RPC 없음
- `get_earn_hub_state` 가 VIP 활성 시 모든 mission `amount` 를 ×1.5 로 반환 (서버 가산)

### 2. DB — 추가 1테이블 + 1 RPC 만

```sql
-- earn_roulette_spins: 일일 룰렛 결정성 로그 (멱등키)
CREATE TABLE public.earn_roulette_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  spin_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Seoul')::date,
  amount integer NOT NULL CHECK (amount > 0),
  weight_bucket text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, spin_date)
);
ALTER TABLE public.earn_roulette_spins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_select" ON public.earn_roulette_spins
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- INSERT 는 SECURITY DEFINER RPC 만

-- spin_daily_roulette() RPC: 가중 랜덤 + PHON 가산 + VIP ×1.5
-- 응답: { ok, amount, multiplier, balance_after, already_spun }
```

`get_earn_hub_state` SECURITY DEFINER 함수에 `roulette` 필드 + `vip_boost`(active·multiplier·ends_at) 필드 추가.

### 3. Share Card Edge Function — `earn-share-card`

`supabase/functions/earn-share-card/index.ts`
- 입력: `?kind=mission|bigwin|streak|roulette&amount=…&nick=…&v=…`
- 출력: 1200×630 PNG (OG 규격). Satori + resvg-wasm 또는 Canvas API
- 디자인: Warm Gold (#E8B84A) → Hot Pink (#E84393) 대각선 그라디언트 + 마스킹 닉 + 금액 + "phonara.world" 워터마크
- 캐시 30일 (`Cache-Control: public, max-age=2592000, immutable`)
- 5070 가독성: 헤드라인 96px Pretendard Black, 금액 220px tabular-nums
- 호출처: `fireBigWinShare` 가 미리 `https://…/earn-share-card?...` URL 만 생성 → 채널별 share 인텐트에 `og_image` 로 직접 사용

### 4. 7 채널 공유 통합 — `src/lib/share/channels.ts` (신규)

| 채널 | 방식 |
|---|---|
| 카카오톡 | Kakao SDK `Kakao.Share.sendDefault({ feedTemplate })`, 키 = `VITE_KAKAO_JS_KEY` (publishable) |
| 카카오스토리 | `https://story.kakao.com/share?url=…` |
| X (Twitter) | `https://twitter.com/intent/tweet?text=…&url=…` (기존 재사용) |
| Threads | `https://www.threads.net/intent/post?text=…` |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=…` |
| Telegram | `https://t.me/share/url?url=…&text=…` |
| Instagram | OG 이미지 다운로드 + "스토리에 붙여넣기" 안내 모달 (IG 는 web intent 없음) |

- 각 채널 클릭 시 `claim_share_reward(_channel)` 자동 호출 + 보상 토스트
- 채널 6개 그리드 + IG 1개 풀폭 = 모바일 44px+ 정확히

### 5. 글로사리 확장 — `src/lib/glossary.ts`

Earn Hub 사용자 가시 텍스트 18개 키 추가 (예시):
```
earnTodayLabel: "오늘 번 PHON",
earnRouletteTitle: "데일리 무료 룰렛",
earnRouletteCta: "오늘의 룰렛 1회 무료",
earnVipBoostOn: "VIP 부스트 ×1.5 적용중",
earnVipBoostOff: "VIP 패스로 모든 보상 +50%",
earnShareReward: "공유하고 +200 PHON",
earnShareTitle: "친구한테 자랑하기",
earnFomoLine: "지금 {n}명이 오늘 PHON 받았어요",
…
```

모든 신규 컴포넌트는 `g('…')` 만 사용 (하드코딩 한국어 금지). 기존 5개 카드는 Sprint 1.5 에서 일괄 마이그레이션 (스코프 분리).

## 컴포넌트 트리

```text
Earn.tsx (기존)
└─ <SlimShell>
   └─ Header (오늘 PHON 카운트업 + FOMO 라인 신규)
   └─ Grid 3col md / 1col mobile
      ├─ StreakCard         (기존)
      ├─ MissionsCard       (기존, VIP×1.5 서버 반영)
      ├─ RouletteCard       ★ 신규
      ├─ ReferralCard       (기존)
      ├─ PlayToEarnCard     (기존)
      ├─ VipBoostCard       ★ 신규
      └─ ShareRewardCard    (기존 → ShareChannelsSheet 연결 ★)

신규 공용:
- src/components/share/ShareChannelsSheet.tsx (7채널 Sheet)
- src/lib/share/channels.ts (인텐트 + 카카오 SDK 로드)
- src/lib/share/shareCardUrl.ts (Edge URL 빌더)
```

## 상태 관리

- 단일 진입점 `useEarnHub()` 확장 (roulette, vip_boost 필드 추가)
- 룰렛 결과: 낙관적 업데이트 → 실패 시 롤백 (기존 패턴 그대로)
- VIP 부스트: `useVipPass()` 결합, 카운트다운은 `useNowTick(60_000)`
- 공유 카운트: 채널 클릭 즉시 `claim_share_reward` → optimistic 상태 + 토스트 (기존 훅 재사용)

## 보안 / 메모 준수

- 신규 테이블 `earn_roulette_spins`: RLS SELECT own / INSERT 차단 (SECURITY DEFINER RPC만)
- `spin_daily_roulette` 는 `auth.uid()` 가드 + `UNIQUE(user_id, spin_date)` 로 서버측 1일 1회 강제
- 신규 함수는 `function_permissions_baseline` 에 등록 (CI permission drift 통과)
- `get_earn_hub_state` 시그니처 변경: `mem://features/rpc-drift-fix-2026-05-16` 패턴대로 컬럼셋 메모 추가
- 카카오 JS Key 는 publishable → 코드 직접 포함 OK. Edge Function 은 secret 불필요
- 결제 라우팅·출금 스텝업·rate limit 정책 전부 불변

## 작업 순서

1. **DB 마이그레이션 1회** — `earn_roulette_spins` 테이블 + `spin_daily_roulette()` + `get_earn_hub_state` 확장 + baseline 등록
2. **Edge Function** — `earn-share-card` 1개 신규 배포
3. **공용 모듈** — `src/lib/share/{channels,shareCardUrl}.ts` + `ShareChannelsSheet.tsx`
4. **신규 카드 2개** — `RouletteCard.tsx`, `VipBoostCard.tsx`
5. **Earn.tsx 그리드 7카드로 확장 + ShareRewardCard 가 Sheet 연결**
6. **글로사리 18키 추가** + 신규 컴포넌트 `g()` 100% 적용
7. **메모 업데이트** — `mem://features/v14-sprint-1-earn-engine` 신규 + index 1줄
8. **검증** — `/earn` 진입 → 5초 안에 "오늘 얼마 벌었는지" + 7카드 + 공유 sheet 가 모두 보이는지

## 비-목표 (Sprint 2 이후로)

- 기존 5카드의 글로사리 재배선 (스코프 분리)
- 친구 N명 달성 단계 보너스 (referrals milestone) → Sprint 2 (Viral Loop)
- 룰렛 시즌제 / 콜렉티블 → Phase D 잭팟 연계
- 카카오 SDK 정식 비즈 채널 인증 (개발용 JS Key 로 일단 동작)

## 출구 조건

- `/earn` 진입 시: 헤더 카운트업 + 7카드 + FOMO 라인 모두 보임
- 룰렛 1회 정확히 돌아가고 결과가 잔액 + `today_earned` 에 반영
- 공유 시트의 7채널 모두 클릭 가능 + 각 채널당 +200 PHON 1회 적립
- VIP 가입자는 모든 카드 보상이 ×1.5 로 표시되고 실제 가산도 ×1.5
- 모든 신규 텍스트가 `g()` 진입점 사용
- CI 권한 drift / RLS 테스트 통과
