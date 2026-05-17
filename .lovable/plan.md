# 이탈 방지 강화 — 7일 스트릭 + 휴면 재활성화 + 미션 회복

## 목표
사용자가 매일 돌아오고, 끊겨도 빠르게 복귀하도록 3개 시스템을 강화한다. 기존 자산(`AttendanceCard`, `reactivation_campaigns`, `MissionsCard`, `ReactivationOfferDialog`)을 깨지 않고 확장한다.

## 절대 불변 (변경 0줄)
- money-flow 8경로 (`useDeposit/useWithdraw/request_withdrawal/verify_withdraw_otp/credit_crypto_deposit/admin approve/complete/cancel`)
- Operator Isolation / Bundle Budget / Realtime Partition / Active Governor
- `claim_daily_attendance` RPC 본문은 **수정하지 않음** — 스트릭 정정 로직은 별도 함수로 추가

---

## 1. 7일 연속 스트릭 강화

### DB (마이그레이션 1)
- `claim_daily_attendance` 를 **건드리지 않고** 새 RPC `claim_daily_attendance_v2(user_id)` 추가
  - 어제(`today - 1`) 출석이 아니면 `attendance_streak = 1` 로 리셋 후 +1 처리
  - 7의 배수 도달 시 weekly_bonus 가산하여 phon 입금 (기존 `attendance_streak` 컬럼만 사용)
  - 반환: `{ reward, new_streak, weekly_bonus, milestone_hit boolean }`
- 신규 테이블 `streak_milestones (user_id, streak_len, awarded_at)` — 7/14/30/100일 1회 보너스 디듀프
- 클라이언트는 `AttendanceCard.tsx` 의 RPC 이름만 v2 로 교체 (money-flow 무관)

### UI
- 신규 `src/components/streak/StreakFlame.tsx` — 🔥 + 일수 칩 (Tier별 색)
  - 상단바/프로필/`AttendanceCard` 헤더에 마운트
  - `attendance_streak >= 7` 시 펄스 애니메이션
- 스트릭 끊김 감지 훅 `src/hooks/use-streak-loss.ts`
  - `last_attendance < today - 1` 이고 `attendance_streak == 0` 으로 막 리셋된 경우 1회 한정 Warm King 토스트
  - "아쉽네요. 다시 쌓아볼까요? 첫날부터 함께 가겠습니다."
- 7일 달성 시 `notify.success("👑 7일 연속! +X PHON · Empire 경험치 +50 · 황제 배지 획득")`

---

## 2. 휴면 재활성화 캠페인 확장

### DB (마이그레이션 1)
- `reactivation_campaigns` 에 행 보강/업서트:
  - `comeback_7d`: phon_bonus 10000, body "7일 만에 돌아오시면 +10,000 PHON" (기존 500 → 10000 상향)
  - `comeback_14d`: phon_bonus 5000 + meta hint "Founding Seat 우선권" (UI에서 강조)
  - 신규 `comeback_30d`: dormant_days=30, phon_bonus 25000, title "당신의 Empire 레벨이 올라갔어요"
- `run_reactivation_campaigns` 가 이미 모든 active 캠페인을 순회 — 별도 cron 변경 불필요(기존 cron 유지)

### UI
- `ReactivationOfferDialog.tsx` 는 이미 `get_my_reactivation_offer` 를 사용 — **로직 변경 없음**, 30d 캠페인 자동 노출
- 신규 `src/components/reactivation/ChurnReactivationBanner.tsx` — Dashboard 상단 슬림 배너 (다이얼로그 닫혀도 보이는 상시 CTA)

---

## 3. 미션 실패 회복 시스템

### DB (마이그레이션 1)
- 신규 테이블 `mission_daily_status (user_id, day date, completed_count int, failed boolean, recovery_bonus_pct int default 0)` PK (user_id, day)
- 신규 RPC `record_mission_outcome(_completed_today int)` — 자정에 fail 판정 누적, 3일 연속 fail 시 다음날 row 에 `recovery_bonus_pct = 30` 세팅
- 신규 RPC `get_mission_recovery_state()` → `{ consecutive_fails int, recovery_pct int, easy_mode boolean }`
- 신규 RPC `claim_daily_quick_reward` 는 **수정하지 않음** — 클라이언트가 `recovery_pct` 만큼 가산 표시 (실지급은 별도 RPC `apply_recovery_bonus(_kind)` 가 추가 PHON 지급)

### UI
- `src/hooks/use-mission-recovery.ts` — state 폴링
- `MissionsCard.tsx` 상단에 회복 모드 배너: "포기하지 마세요. 오늘은 보상 +30%!"
- 미션 amount 표시에 `+30% 회복` 칩 (recovery 활성 시)

---

## 4. FOMO 강화

### DB (마이그레이션 1)
- 신규 RPC `get_today_mission_completion_stats()` → `{ overall_pct numeric, my_remaining int }` (전체 활성 유저 대비)
- public read OK (집계만)

### UI
- `MissionsCard.tsx` 헤더에 FOMO 라인: "오늘 미션 완료율 {pct}%. 당신은 아직 {n}개 남았어요"
- 미션 실패 시 토스트: "친구 {pct}% 가 오늘 미션을 끝냈어요. 내일은 함께 가요." (Warm King 톤)

---

## 5. Warm King 톤 / 네이밍
- 모든 메시지 `docs/conventions/naming.md` 톤 가이드 준수
- 신규 컴포넌트: `StreakFlame`, `ChurnReactivationBanner`, 신규 훅: `useStreakLoss`, `useMissionRecovery`
- 상수: `STREAK_MILESTONE_DAYS=[7,14,30,100]`, `RECOVERY_BONUS_PCT=30`, `RECOVERY_TRIGGER_FAIL_DAYS=3`

---

## 파일 변경 요약

신규 (8):
- `src/components/streak/StreakFlame.tsx`
- `src/components/reactivation/ChurnReactivationBanner.tsx`
- `src/hooks/use-streak-loss.ts`
- `src/hooks/use-mission-recovery.ts`
- 마이그레이션 1개 (streak v2 RPC + milestones 테이블 + 3개 캠페인 upsert + mission_daily_status + recovery RPC 3종 + completion stats RPC)

수정 (3):
- `src/components/AttendanceCard.tsx` — RPC `claim_daily_attendance` → `claim_daily_attendance_v2`, weekly_bonus/milestone 표시, `<StreakFlame />` 마운트
- `src/components/earn/MissionsCard.tsx` — FOMO 헤더 + 회복 배너 + recovery 칩
- `src/pages/Dashboard.tsx` — `<ChurnReactivationBanner />` 마운트 (기존 `ReactivationOfferDialog` 와 공존)

money-flow / Operator / Bundle / Realtime / Governor 파일 0건 변경.

---

## 검증
- `node scripts/check-money-flow-freeze.mjs` → diff 0
- `node scripts/check-operator-isolation.mjs` → PASS
- `npm run size:check` → 예산 내
- 신규 RPC 모두 `SECURITY DEFINER` + `auth.uid()` 가드
- `attendance_streak` 컬럼은 기존 `guard_profile_sensitive_columns` 트리거 보호 — v2 RPC 도 SECURITY DEFINER 이므로 통과
- `linter` 후 RLS 경고 0
