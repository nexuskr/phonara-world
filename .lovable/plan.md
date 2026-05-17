# Phase A — 게임화 Pass 2 (레벨업 폭죽 + 업적 트리 + 30개 업적)

Pass 2 Final Lock은 이미 완료 (cron jobid=64, mem 등재, 검증 PASS).
이제 Phase A를 먼저 단독 실행한다. B/C는 A 완료 후 별도 plan으로 진행.

## 목표
1. 레벨업 / 업적 달성 순간을 **압도적으로 짜릿하게** (canvas-confetti + framer-motion)
2. 30개 업적을 4개 카테고리 트리로 시각화, 진행도 실시간
3. 모든 트리거는 기존 이벤트(베팅 정산, 입금, 스테이킹, Crown, 출석)에 **non-invasive** 후크 — money-flow 8경로 0줄

## DB
신규 마이그레이션 1개:

```text
achievements (정적 카탈로그, seed 30개)
  id text PK, category text, tier int(1-3), title text, description text,
  icon text, requirement jsonb, reward_phon int, parent_id text NULL, sort int

user_achievements
  user_id uuid, achievement_id text, unlocked_at timestamptz,
  progress numeric default 0, claimed_at timestamptz NULL
  PK (user_id, achievement_id)
  RLS: self SELECT, internal INSERT/UPDATE only

achievement_events (감사)
  id, user_id, achievement_id, kind(unlocked|progress|claimed), meta jsonb, created_at
```

### RPC (모두 SECURITY DEFINER)
- `get_my_achievements()` → 30개 카탈로그 + 내 진행도/언락 상태 조인 반환
- `claim_achievement(_id text)` → unlocked & not claimed 시 reward_phon 지급 (phon_transactions kind='achievement_reward', idempotent)
- `record_achievement_progress(_uid, _id, _delta, _meta)` — internal, 100% 도달 시 자동 unlock + `fomo_notifications`(kind='achievement_unlocked') + realtime
- `recompute_achievement_for(_uid, _event_kind, _payload)` — internal dispatcher

### 트리거 (기존 테이블 read-only 관찰)
- AFTER INSERT on `crown_events` → `recompute_achievement_for(uid,'crown',...)`
- AFTER UPDATE on `live_positions` (status→closed) → `recompute_achievement_for(uid,'trade_closed',...)`
- AFTER INSERT on `phon_stakes` → `recompute_achievement_for(uid,'stake_open',...)`
- AFTER INSERT on `phon_stake_yields` → 누적 배당 업적
- AFTER UPDATE on `profiles.attendance_streak` → 출석 업적

money-flow 8경로 파일은 건드리지 않음 — 트리거는 별도 SQL 객체로만 부착.

### 30개 업적 카탈로그 (요약)
- **Trade (8)**: 첫 거래 / 10·100·1000회 / PHON 베팅 첫승 / 100k PHON 누적 수익 / 10x·50x·100x 레버리지 승리
- **Stake (6)**: 첫 스테이크 / 1k·10k·100k·1M PHON 스테이크 / 30일 누적 배당
- **Empire (8)**: Lord(3)·Baron(7)·Emperor(10) 도달 / Crown 10·100·1000회 / Founding Seat / VIP 30일
- **Social (4)**: 첫 친구 초대 / 친구 10명 / 첫 길드 / 길드 주간 1위
- **Daily (4)**: 출석 7·30·100일 / 30일 일일 베팅

## Edge Functions
없음. 모든 로직은 DB 트리거 + RPC.

## Frontend (모두 lazy + v3 폴더 규칙)
```text
src/components/achievements/v3/
  AchievementTree.tsx        # 4 카테고리 탭 + 트리 그리드, framer-motion 카드
  AchievementCard.tsx        # 잠금/진행/언락/수령 4상태, 진행 bar
  AchievementClaimDialog.tsx # 수령 시 confetti + reward 표시
  LevelUpFireworks.tsx       # 풀스크린 canvas-confetti 폭죽 (3.5s 후 자동 닫힘)

src/hooks/
  use-my-achievements.ts     # get_my_achievements() + realtime on user_achievements
  use-claim-achievement.ts
  use-achievement-fireworks.ts  # zustand store: fire(achievementId)

src/pages/
  Achievements.tsx           # /achievements 라우트, AchievementTree 마운트

src/App.tsx
  + <AchievementUnlockListener /> (realtime user_achievements INSERT → fireworks.fire)
```

기존 `<EmpireLevelBadge />` 승급 이벤트도 동일 fireworks 스토어 재사용.

### 의존성
- `canvas-confetti` 신규 추가 (~6KB gz, lazy import via `import("canvas-confetti")`)
- framer-motion 기존 사용

## 디자인 (Warm King)
- 카드 잠금: 골드 톤 + 자물쇠, 잠금해제 조건 한 줄
- 진행: 호박색 그라디언트 bar + "거의 다 왔어요 N/M"
- 언락: 펄스 골드 링 + "수령하기" CTA
- 수령: confetti + "🏆 새 업적: {title} — {reward_phon} PHON"

토스트는 `@/lib/notify` 만 사용. 색상은 디자인 토큰.

## 절대 불변
- money-flow 8경로 git diff = 0
- Operator Isolation / Bundle Budget / Realtime Partition 무손상
- 모든 신규 컴포넌트 React.lazy
- realtime은 `@pkg/realtime` `useWalletChannel` 래퍼로만 구독 (key prefix 자동)

## 검증
1. `node scripts/check-money-flow-freeze.mjs` PASS
2. `node scripts/check-operator-isolation.mjs` PASS
3. `npm run size:check` PASS (index 청크 변화 없음)
4. supabase linter PASS
5. E2E: 베팅 1회 → 진행도 1/10 → 수동 INSERT로 trigger 검증 → /achievements 트리에 잠금해제 카드 + fireworks

## 실행 순서
1. 마이그레이션 (테이블 + RLS + 30개 seed + 트리거 + RPC) — migration tool로 한 번에
2. canvas-confetti 추가
3. 훅 + 컴포넌트 작성 (5개 파일 병렬)
4. /achievements 라우트 + App.tsx에 listener 마운트
5. 검증 3종 + linter
6. 보고 후 Phase B plan 작성

승인 시 1번(migration) 먼저 호출하고 사용자 confirm 받음.
