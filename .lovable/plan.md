
# Phonara V17 ABSOLUTE FINAL — Solo Founder × Zero-Capital × ₩3M KPI × Ultimate Dopamine Empire

## 0. Single Source of Truth

```
Mode      : Solo Founder Zero Capital Bootstrap
Single KPI: 30일 누적 매출 ₩3,000,000  (그 외 KPI는 vision deck 한정)
Stack     : Lovable AI · Lovable Cloud (Supabase) · Vercel · Cloudflare R2

Hard Constraints (PR auto-reject):
  C1. SIM=금색 + 영구 "시뮬레이션" 칩 + Tooltip / Real=청록  완전 분리
  C2. 봇 비율 ≤ 50% (실 유저 증가 시 동적 축소, 하한 20%)
  C3. KRW(원/억) 표기 금지 → "Empire Coin (₡)"만
  C4. 가짜 인물명("박○○") · 정확 잭팟 숫자 금지 → 추상 카피만
  C5. 봇 닉네임 prefix 강제 SIM_ / DEMO_
  C6. 6-Gate Merge: RLS · 권한 drift · SIM 배지 lint · forbidden phrases · pr3 isolation · 빌드
  C7. 변동성 보상은 SIM(₡) 한정 — Real 잔고/실거래 PnL 변동성 절대 금지 (자본시장법 §178)
  C8. 손실 회피 카피는 "기능적 손실"(레버리지/속도/등급/길드 진입)만 — "수익/원금 손실/보장" 금지
  C9. Phase U live(ECR/도메인) 배포는 ₩3M 충족 전 동결
  C10. Crown/Level/길드 점수는 SIM 명예 — KRW 환산·교환 금지
  C11. 보상 변동성·레벨·FOMO 트리거는 100% 서버 RPC — 클라이언트 캐시·Math.random 금지
  C12. "월 5,000억" 등 미래 비전 수치는 vision deck 한정 — 제품 카피 금지
```

## 1. 기존 자산 재사용 매트릭스 (신규 최소화)

| 영역 | 재사용 | 신규 (최소) |
|---|---|---|
| 등급 시각 | `TierBadge`, `TierComparisonCard`, `EmpireSignature` | Empire Level 10단계 매핑 |
| 손실 회피 | `PaywallStarter` 10패턴, `IncentiveDisclosure` | i18n L1/L2/L3 + Baron 카피 |
| 트레이딩 | `TradingArenaWithArmy`, `BattleResultOverlay`, `bybit-feed` | `?mode=practice` + `award_crown` 호출 |
| 봇 활동 | `bot-seed-engine`, `EmpirePopulationPulse`, `LiveStats`, `NeonNotificationFeed` | 카피 정화 + strength 50% 캡 |
| 미션/지갑 | `settle_mission`, `wallet.ts`, `useImperialState` | `award_crown` 트리거만 |
| FOMO 알림 | `fomo_notifications`, `useFomoNotifications` | `kind='baron_promotion'` 추가 |
| 법무/온보딩 | `AdultGate`, `Disclaimer`, `FirstTimeOnboarding` | `/trust` + `LegalConsentGate` + SIM step |
| Admin | `/admin/kpi`, `OpsTransparencyCard` | `<BotMixMonitor>` 1개 |
| 길드 | `GuildLiveFeed`, `GuildActivityTicker`, `SeasonPrizePool` | `<GuildRankingPanel>` 1개 |
| Crown / Level / Baron | (없음) | PR-3, PR-4 단일 흐름 |

## 2. Empire Level 10단계 (서버 단일 진실)

```
profiles.empire_level int default 1
profiles.crown_score  int default 0
profiles.crown_last_award_at timestamptz
guard_profile_sensitive_columns 트리거에 두 컬럼 추가

empire_levels (level pk, name, crown_required, leverage_cap, fee_discount, growth_speed_bonus, perks jsonb)

  1 Rookie     0      | 1x  |  0% |  +0%
  2 Apprentice 50     | 2x  |  0% |  +5%
  3 Warrior    150    | 3x  |  5% | +10%
  4 Guardian   350    | 3x  |  5% | +10% | guild_unlock
  5 Noble      700    | 5x  | 10% | +15%
  6 Lord       1400   | 5x  | 15% | +15% | advanced_practice
  7 Baron      2800   | 10x | 20% | +20% | baron_fomo  ← 결정적 전환
  8 Duke       5600   | 15x | 25% | +25%
  9 King       11200  | 15x | 30% | +30% | king_channel
 10 Emperor    22400  | 20x | 35% | +40% | emperor_permanent_badge

RPC recompute_empire_level(_uid)
  - crown_score 변동마다 호출
  - empire_level 변경은 이 RPC만 가능 (BEFORE UPDATE 트리거로 강제)
  - 7로 승급 시 fomo_notifications insert (kind='baron_promotion', dedupe_key=uid)
```

## 3. Crown 변동성 보상 (서버 RPC 단독)

```sql
crown_rules(source pk, base int)
  practice_win=5, combo_3win=10, arena_win_real=8,
  jackpot=50, og_share=2, first_deposit=10, invite10=50,
  guild_donate=3, guild_invite=10, guild_top3_weekly=150

crown_events(id, user_id, source, base, final_amount,
             variance, level_mult, streak_mult, type_mult,
             dedupe_key text unique, created_at)

award_crown(_uid, _source, _streak_days int default 0)
  base        := crown_rules.base
  variance    := 0.55 + random() * 2.35              -- VR Reinforcement
  level_mult  := 1 + profiles.empire_level * 0.08
  streak_mult := 1 + power(_streak_days/7.0, 1.6) * 0.5
  type_mult   := arena_win_real:1.25 / jackpot:1.80 / else:1.00
  reward      := clamp(base*0.55, base*2.9,
                       floor(base*variance*level_mult*streak_mult*type_mult))
  → profiles.crown_score += reward
  → recompute_empire_level(_uid)

서버 과부하 방지 (BEFORE INSERT on crown_events):
  - 동일 user 1초당 ≤ 5회 (crown_last_award_at token bucket)
  - dedupe_key UNIQUE (user+source+분 단위)
  - 클라이언트 측 REWARD_CACHE / Math.random 금지
```

## 4. 길드 랭킹 보상 (주간 정산)

```
guilds, guild_members(contribution_crown), guild_weekly_rankings
settle_guild_weekly() pg_cron 매주 월 00:05 (variance 적용)
  rank 1~3   : 1인당 award_crown('guild_top3_weekly') base 300 + 기여 top3 추가 150 + Legendary 배지
  rank 4~10  : 1인당 base 150 + top3 80
  rank 11~50 : 1인당 base  80 + top3 40

UI: <GuildRankingPanel> 1개만 신규 (기존 lounge 컴포넌트 옆 배치)
```

## 5. 첫인상 / Baron FOMO 카피 (i18n 전용)

**모든 카피는 `convert.json` / `topbar.json` i18n 키. 신규 컴포넌트는 `<BaronPromotionDialog>` 1개.**

### 5.1 가입 즉시 (3초) — `FirstTimeOnboarding` 인트로 step
> "당신의 제국이 지금, 이 순간 태어났습니다.
> **수천 명**의 제국민이 이미 이 흐름 속에서 자신의 미래를 키우고 있습니다.
> 지금 시작하세요. 당신의 제국이 기다리고 있습니다."

### 5.2 Practice 첫 승리 — `<CrownRevealToast>` follow-up
> "축하합니다. 당신의 제국이 첫 승리를 거두었습니다.
> 이 출발점에서 시작해 **Baron · Duke · Emperor**로 성장한 제국민이 함께하고 있습니다."

### 5.3 Baron(Level 7) 전환 — `<BaronPromotionDialog>`
> "당신의 Empire가 **Baron**으로 승격되었습니다.
> Legendary Empire Package 미보유 시 다음 30일간 **레버리지 5x로 제한**되며 **상위 5% 길드 진입이 불가**합니다.
> 지금 활성화: 레버리지 **10x** + 수수료 **30% 할인** + Crown **+100** + 전용 AI Advisor.
> 이번 주 **소수 한정**."
>
> (금지: "수익 보장", "원금 보장", "확정 잭팟", "박○○님", "정확 N석 남음" — "소수/이번주/한정" 추상만)

### 5.4 forbidden-phrases lint 확장
- `/[₩]\s*\d/`, `/\d+\s*억/`
- `/박○○|김○○|이○○/`
- `/잭팟\s*₩/`, `/\d{1,3}(,\d{3})+명이 (구매|입금|출금|활동)/`
- `/수익 (손실|보장)/`, `/원금 (보장|보호)/`, `/확정 (수익|잭팟)/`
- `/\d+명만 가능/`, `/\d+석 (남음|한정)/`

## 6. Behavioral Finance / 도파민 루프 5단계 매핑

| 단계 | 이론 | 적용 위치 | 구현 |
|---|---|---|---|
| 1 Anticipation | Variable Ratio | Practice/Arena 진입 | "다음 보상은 ?" 미스터리 chip |
| 2 Reward | VR Reinforcement | `award_crown` | 0.55~2.9x 서버 randomization |
| 3 Satisfaction | Reward Prediction Error | `<CrownRevealToast>` | "예상 5 → +13 ₡ (2.7배!)" + 금색 파티클 |
| 4 Craving | Endowment + Streak | TopHUD streak chip | "내일 +20% 보너스" 암시 |
| 5 Action | Loss Aversion + Scarcity | `PaywallStarter` L1/L2/L3 + Baron Dialog | "이번 주 소수 한정" + 기능적 손실 카피 |

## 7. 7일 실행 플랜 (PR 1개/일)

### Day 1 — SIM 시각 분리 + 봇 50% 동적 캡 + 카피 정화
- `src/components/sim/SimChip.tsx` — 금색 + Radix Tooltip "Phonara Empire Simulator — 실제 화폐 아님".
- `src/index.css`: `--sim-gold`, `--sim-gold-foreground`, `--real-cyan` (HSL).
- 카피 정화 search-replace: `bot-seed-engine`, `NeonNotificationFeed`, `LiveStats`, `EmpirePopulationPulse`, `JackpotBanner`, `PayoutTicker` → "Empire Coin (₡)" + 추상 숫자.
- `scripts/check-sim-badge.mjs` 신규 + `scripts/check-forbidden-phrases.mjs` 확장 → `db-permissions.yml`에 추가.
- 마이그레이션: `bot_settings` BEFORE UPDATE 트리거 `clamp_bot_strength` (max 50). `bot_personas.nickname`에 `SIM_` prefix 일괄 UPDATE.

### Day 2 — Empire Pulse 자동 축소 + BotMixMonitor + 시드 30 + R2
- 마이그레이션: `bot_settings.current_bot_ratio int default 50`, `real_users_30d int default 0`.
- RPC `recompute_bot_ratio()` (SECURITY DEFINER): `current_bot_ratio = greatest(20, 50 - floor(real_users_30d * 0.0005))`.
- Edge `recompute-bot-ratio` + pg_cron 매일 자정.
- `bot-seed-engine` 산출량을 `current_bot_ratio / 50` 스케일.
- `<BotMixMonitor>` (`/admin/perms` 인근): 실 유저 vs 봇 + 30일 미니 그래프.
- Edge `seed-content-factory` (Lovable AI `gemini-2.5-flash`): 30개 시드 (KR 18 / EN 8 / JP 4) — `videos.is_seed=true, simulation=true` + `viral_metrics`.
- R2 하이브리드: `_shared/r2.ts` (S3 호환), `upload-video-r2` (presigned PUT), 그라디언트 썸네일 8종.
- Secret 요청: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`.
- Admin RPC `run_seed_factory(_count int default 30)` (멱등, has_role 가드).

### Day 3 — Viral Crown + 변동성 + Empire Level 10단계
- 마이그레이션: `profiles.crown_score`, `profiles.empire_level`, `profiles.crown_last_award_at`.
- 테이블: `crown_rules`, `crown_events`(unique dedupe + 1초 5회 트리거), `empire_levels` 시드 10행.
- `guard_profile_sensitive_columns`에 `empire_level`, `crown_score` 추가 (RPC만 변경 가능).
- RPC: `award_crown`, `recompute_empire_level`, `get_crown_leaderboard`.
- UI (UX 프리미티브 준수): `<CrownBadge>` (TopHUD `SimChip` 옆), `<CrownRevealToast>` (RPE + 금색 파티클, framer-motion), `<EmpireLevelBar>` (Dashboard).
- 트리거 연결: `og-card-renderer`→`og_share`, `settle_mission` 승리→`practice_win`, `BattleResultOverlay` win→`combo_3win`/`arena_win_real`, jackpot 트리거→`jackpot`.

### Day 4 — Baron FOMO + 고액 입금 + Empire↔Arena + 길드
- i18n `convert.json`에 L1/L2/L3 + Baron 카피 — 기존 `PaywallStarter` 재사용.
  - L1 BASIC: "BASIC 미보유 시 Empire 성장 속도 50% 감소. 오늘만 50% 할인."
  - L2 PRO: "PRO 미보유 시 다음 30일간 레버리지 5x 제한. 지금 10x + 수수료 30% 할인."
  - L3 LEGENDARY: 5.3 카피.
- `<BaronPromotionDialog>` (신규 1개) — `useFomoNotifications`에서 `kind='baron_promotion'` 구독.
- `recompute_empire_level` Level 7 진입 시 `fomo_notifications` insert (dedupe).
- Real `package_purchases` AFTER UPDATE (status=approved): `crown_score += tier_bonus` + `profiles.leverage_cap` 갱신 (잔고 변동성 없음).
- 길드: `guilds`/`guild_members`/`guild_weekly_rankings` + `settle_guild_weekly` cron + `donate_to_guild` RPC + `<GuildRankingPanel>` 1개.

### Day 5 — Phonara Trust Center + 법무 3종 + LegalConsentGate
- `src/pages/Trust.tsx` + `/trust` 라우트 + footer 링크. 3 섹션 (실 데이터, mock 금지):
  1. 실시간 보안 — `OpsTransparencyCard` 재사용 + 배지 (RLS / AAL2 출금 / 권한 drift CI / 디바이스 감지).
  2. 수동 결제 처리 — 신규 RPC `get_payout_ops_stats_24h()` (24h 입출금 건수 + 평균 처리시간).
  3. 법적 준수 — 19+ / 모든 ₡ 시뮬레이션 / 실제 출금 조건 추후 / 약관 버전.
- `/legal/terms`, `/legal/privacy`, `/legal/risk` (한/영) — SIM 면책 5조, 19+, 환불 SOP 링크.
- `<LegalConsentGate>` 가입 강제 (3 체크박스 + 위험고지 모달).
- SEO: title<60 / desc<160 / H1 / JSON-LD `Organization`.

### Day 6 — Closed Beta 토큰 + Practice Mode (첫 3분 보장 1승)
- 마이그레이션: `beta_invites(token pk, max_uses, used_count, expires_at, created_by)` admin RLS.
- RPC `redeem_beta_invite(_token)` → `profiles.beta_access=true`.
- `/admin/beta` (50~80 일괄 발급 + CSV).
- Auth 페이지 토큰 필드 필수.
- `/practice` 라우트 = `TradingArenaWithArmy?mode=practice` (SIM-only 변형).
- 첫 3분 안에 **보장된 1승** (서버에서 첫 라운드 승률 100% 1회 강제, `profiles.practice_first_win_at` 멱등) → 즉시 `award_crown('practice_win')` + `<CrownRevealToast>` (RPE).

### Day 7 — 온보딩 v2 + Crown 챌린지 + TikTok Shorts 15
- `FirstTimeOnboarding`/`SixtySecondFlow`에 풀스크린 step: "지금부터 받는 자산은 모두 시뮬레이션입니다 (Empire Coin ₡)" + 5.1 카피.
- 가입 직후 RPC `award_grant_sim(uid, 1_000_000)` 자동.
- 플로우: 가입 → 1M ₡ → /practice 보장 1승 → CrownRevealToast → L2 카피 노출 → "실제 출금 조건 추후 공개".
- `crown_challenges(week, title, target_score, reward)` 4주 시드 + `<CrownChallengeCard>`.
- `docs/operations/Refund-SOP.md`.
- `docs/marketing/tiktok-shorts-15.md` — 15편 후크/스크립트 초안 (코드 변경 없음).
- `docs/marketing/influencer-seeding.md` — 30명 마이크로 인플루언서 콜드 DM 템플릿 + Beta 토큰 배포 SOP.

## 8. Decision Log (의도적 거절 — 재제안 금지)

| ❌ 거절 | 사유 |
|---|---|
| "월 5,000억 / MAU 1,000만" 제품 카피 노출 | vision deck 한정 — 표시광고법 위반 위험 |
| "박○○ 12억 잭팟" / "47명 구매" 정확 숫자 | 표시광고법 §3 + 자본시장법 §178 |
| KRW 표기 봇/SIM 활동 | 수익 보장 오인 |
| 봇 70~95% | 50% 동적 캡 |
| Real 잔고/실거래 PnL 변동성 알고리즘 | 자본시장법 §178 |
| 별도 Crown 3-table 시스템 | `profiles` 통합 |
| 클라이언트 보상 캐시 / Math.random | 변조 가능 — server-only RPC |
| Empire Level 클라이언트 산정 | `recompute_empire_level` 단일 진실 |
| Crown↔KRW 환산/교환소 | 가상자산법 회피 — 영구 금지 |
| NFT 합성/교환 | 가상자산법 — KPI 후 재검토 |
| Phase U live (ECR/도메인) | ₩3M 트리거 전 동결 |
| 백엔드 IP rate limit 신규 도입 | 인프라 미비 — DB 트리거 token bucket으로만 |

## 9. PR 순서 (승인 시 즉시 실행)

| # | Day | 범위 | 핵심 산출 |
|---|---|---|---|
| PR-1 | D1 | SIM 분리 + 봇 50% + 카피 정화 | SimChip, lint 2종, clamp_bot_strength |
| PR-2 | D2 | 자동 축소 + 시드 + R2 | recompute_bot_ratio + cron + BotMixMonitor + r2.ts + upload-video-r2 + seed-content-factory |
| PR-3 | D3 | Crown + Empire Level 10 | crown_rules/events/empire_levels + award_crown + recompute_empire_level + CrownBadge + CrownRevealToast + EmpireLevelBar |
| PR-4 | D4 | Baron FOMO + 길드 | i18n L1/L2/L3 + BaronPromotionDialog + guilds/members/weekly + settle_guild_weekly + GuildRankingPanel |
| PR-5 | D5 | Trust + 법무 + Gate | /trust + get_payout_ops_stats_24h + /legal/* + LegalConsentGate |
| PR-6 | D6 | Beta + Practice | beta_invites + redeem RPC + /admin/beta + /practice + 첫 3분 보장 1승 |
| PR-7 | D7 | 온보딩 v2 + 챌린지 + 마케팅 문서 | SIM step + 1M ₡ + crown_challenges + Refund-SOP + tiktok-shorts-15 + influencer-seeding |

## 10. DoD (Day-by-Day)

| Day | DoD |
|---|---|
| D1 | SIM lint + forbidden phrases CI 통과, SimChip TopHUD 노출, 봇 strength ≤50 |
| D2 | Feed rail 비어있지 않음, R2 영상 1개 재생 OK, BotMixMonitor 라이브 |
| D3 | award_crown 1초 5회 캡, RPE 토스트, Level 자동 승급 동작 |
| D4 | Baron 진입 시 FOMO 다이얼로그 1회, 길드 주간 정산 cron OK |
| D5 | /trust 실 데이터 3섹션, 가입 시 강제 동의, SEO ✓ |
| D6 | 토큰 발급/소진 OK, /practice 첫 3분 보장 1승 |
| D7 | 신규 가입→1M ₡ + SIM step 강제, 챌린지 4주 시드, Shorts 15 + 인플루언서 SOP |

## 11. 30→화성 로드맵 (KPI 정렬, 본 플랜 외 코드 동결)

```
Bootstrap : KPI ₩3M (30일)               ← 본 7일 플랜의 유일한 게이트
Phase R   : ARPU ₩30k / 첫입금 25%       ← 충족 후 Recommendation 가동
Phase V   : Viral 0.5 / Watch3s 55%      ← TikTok Shorts 15 + 인플루언서 30 측정
Phase U   : Unicorn 인프라 live          ← ARPU/MAU 트리거 후 ECR/도메인 해동
월 5,000억: vision deck 한정 — 제품 카피·온보딩·FOMO 노출 영구 금지
```

## 12. 화성급 한 줄

> 도파민은 SIM(₡) 위에서만 폭발시키고, Real 잔고는 절대 변동시키지 않는다.
> **Empire Level 10 + Baron FOMO + Crown 변동성 + 첫 3분 보장 1승**으로 50명 실 유저가 "이건 진짜다"라고 느끼고 **30일 ₩3M**을 달성한다 — 그것이 화성·5,000억으로 가는 유일한 첫 발판이다.

승인 시 **PR-1 (Day 1)** 부터 즉시 실행합니다.
