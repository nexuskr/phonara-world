## 목표
어드민을 "지구 끝판왕 1위 플랫폼" 수준의 실시간 제국 통제 콘솔로 격상. 8개 우선순위 기능 + 봇 콘솔 카드 + 사이드바 재배치를 3일 안에 출시.

## ⚠ 최종 확인 반영 사항 (필수 가드레일)
- **Day 1 마감 기준 (변경 불가)**: ① `admin_audit_log` + 자동 INSERT 트리거 ② `game_config` 단일행 테이블 ③ `<EmpireOverview/>` 골격 ④ Bot Console 5개 카드 — 이 4개가 Day 1 종료 시점에 머지/렌더링되어야 함.
- **Manual Crown Trigger 멱등성**: `idempotency_key = format('manual:%s:%s:%s', admin_uid, target_uid, extract(epoch from now())::bigint)` 으로 강제. `award_crown`의 기존 `idempotency_key UNIQUE` 충돌 시 안전 노옵.
- **민감 페이지 보호**: 신규 라우트 game/treasury/compliance/ops/audit/notify 전부 `<AdminAal2Gate>` 래핑 + 모든 admin_* RPC 본문 첫 줄에 `perform require_admin();` 강제 (없으면 raise).
- **Empire Overview 헤로 메트릭 (대형 노출)**:
  - **월 500억 달성률 프로그레스 바** (이번 달 누적 매출 / 50,000,000,000 KRW × 100%, 그라디언트·shimmer)
  - **오늘 Crown Explosion Total** (개수 + 합산 winnings, 60s realtime)

## 사이드바 IA 재배치 (`src/pages/admin/_nav.ts`)

```text
🎯 지휘본부 (Command)
  ├ Empire Overview (NEW, 최상단 메인)   /admin
  ├ 콕핏 (기존)                          /admin/cockpit
  ├ 퍼널 분석                            /admin/funnel
  └ 매출·코호트                          /admin/revenue

💰 자금 관리
  └ 출금 신청 → Withdrawal Queue + Bulk Approve 강화

🛡️ 컴플라이언스
  └ + Fraud / Risk Alert Center (NEW)   /admin/compliance/risk

⚙️ 운영
  ├ + Audit Log (NEW)                   /admin/ops/audit
  └ + Notification Center (NEW)         /admin/ops/notify

🚀 성장 랩
  ├ + Marketing Tools (NEW)             /admin/growth/marketing
  ├ A/B Test Console (강화)             /admin/growth/ab
  ├ + SIM→Real Conversion (NEW)         /admin/growth/conversion
  └ 봇 콘솔 (5개 카드 채움)

🎮 게임 컨피그 (NEW 섹션, aal2=true)
  ├ Demo Bias 슬라이더                  /admin/game/bias
  ├ Near-Miss 확률                      /admin/game/nearmiss
  ├ Crown 파티클 강도                   /admin/game/particles
  └ Manual Crown Trigger                /admin/game/crown-trigger

👥 프로덕트
  └ 회원 관리 → User Detail 360 강화
```

## 우선순위 8 기능 매핑

| # | 기능 | 라우트 / 컴포넌트 | 백엔드 |
|---|------|---|---|
| 1 | Realtime Empire Dashboard | `/admin` `<EmpireOverview/>` | `admin_get_empire_realtime()` + realtime on `live_positions`, `phon_balances`, `crown_events` |
| 2 | User Search & Detail 360 | `/admin/product/users/:id` | `admin_get_user_360(_uid)` (프로필+밸런스+입출금+near-miss+행동로그+demo bias 이력) |
| 3 | Manual Crown Trigger | `/admin/game/crown-trigger` | `admin_trigger_crown(_uid,_mult,_reason)` → `award_crown` 래핑 + idem key 강제 + audit |
| 4 | Withdrawal Queue + Bulk | 기존 강화 | `admin_bulk_approve_withdrawals(_ids[])`, `admin_bulk_reject_withdrawals(_ids[],_reason)` |
| 5 | SIM→Real Conversion | `/admin/growth/conversion` | `admin_get_sim_real_conversion(_days)` |
| 6 | A/B Test Console | `/admin/growth/ab` | `ab_experiments`/`ab_assignments`/`ab_events` + create/stop RPC |
| 7 | Fraud/Risk Alert Center | `/admin/compliance/risk` | `anomaly_events` 통합 뷰 + multi-acct/VPN/near-miss 룰 + `admin_resolve_anomaly` |
| 8 | AI Daily/Weekly Report | `/admin/ops/report` 확장 | 기존 cron + `<EmpireWeeklyReport/>` (월500억 달성률 포함) |

## 봇 콘솔 5 카드 (`/admin/growth/bots`, **Day 1 필수**)
1. `<LiveGhostEmpireStatus/>` — 실/봇 비율, 지역 분포 (`get_ghost_empire_stats()`)
2. `<TodaysCrownExplosionCard/>` — 오늘 횟수+winnings
3. `<HotUsersCard/>` — 1h 입금 Top 10
4. `<DemoBiasPerformanceCard/>` — 게임별 bias·전환율
5. `<TelegramBotStatusCard/>` — 채널 수·오늘 가입자·auto-approve 성공률

## 데이터베이스 마이그레이션

```sql
-- Day 1 ───────────────────────────────────────────────
create table admin_audit_log (
  id uuid pk default gen_random_uuid(),
  admin_id uuid not null,
  action text not null,
  target_type text, target_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
-- admin-only SELECT, INSERT only via SECURITY DEFINER RPC
-- 헬퍼: log_admin_action(_action,_ttype,_tid,_payload)
-- 모든 admin_* RPC 첫줄에 perform log_admin_action(...)

create table game_config (
  id int pk default 1 check (id=1),
  demo_bias jsonb default '{}'::jsonb,
  nearmiss_prob jsonb default '{}'::jsonb,
  crown_particle_intensity int default 50,
  updated_at timestamptz default now(),
  updated_by uuid
);
-- admin-only RW, public RPC `get_game_config_public()` (민감 키 제외)

create or replace function require_admin() returns void
  language plpgsql security definer set search_path=public as $$
  begin if not has_role(auth.uid(),'admin') then raise exception 'admin_required'; end if; end $$;

-- Day 2 ───────────────────────────────────────────────
create table ab_experiments (id, key text unique, name, status, variants jsonb, traffic_pct, started_at, ended_at);
create table ab_assignments (user_id, experiment_key, variant, assigned_at, primary key(user_id,experiment_key));
create table ab_events (id, experiment_key, variant, user_id, event, value numeric, created_at);

-- Day 3 ───────────────────────────────────────────────
create table admin_broadcasts (id, channel check (channel in ('push','telegram','inapp')),
  title, body, audience jsonb, scheduled_at, sent_at, sent_count, created_by);
create table marketing_campaigns (id, kind text, payload jsonb, status text, created_at);

-- RPC (전부 SECURITY DEFINER + perform require_admin() + log_admin_action())
admin_get_empire_realtime() returns jsonb
admin_get_user_360(_uid) returns jsonb
admin_trigger_crown(_uid,_mult,_reason) returns uuid  -- idem key 강제
admin_bulk_approve_withdrawals(_ids uuid[]) returns int
admin_bulk_reject_withdrawals(_ids uuid[],_reason) returns int
admin_get_sim_real_conversion(_days int) returns jsonb
admin_create_experiment(...), admin_stop_experiment(_key)
admin_resolve_anomaly(_id,_note)
admin_broadcast_send(_channel,_title,_body,_audience)
admin_update_game_config(_patch jsonb)
get_ghost_empire_stats() returns jsonb
admin_get_monthly_revenue_progress() returns jsonb  -- 월500억 달성률용
```

모든 신규 RPC는 `function_permissions_baseline`에 추가하고 `check_permission_drift()` 통과 필수.

## 프론트엔드 구조

```
src/components/admin/
  empire/
    EmpireOverview.tsx                 ← 월500억 progress + Today Crown Total 헤로
    MonthlyRevenueProgressBar.tsx
    TodayCrownExplosionHero.tsx
    LiveGhostEmpireStatus.tsx          ← Bot Console 카드
    TodaysCrownExplosionCard.tsx
    HotUsersCard.tsx
    DemoBiasPerformanceCard.tsx
    TelegramBotStatusCard.tsx
  users/UserDetail360.tsx
  game/
    ManualCrownTrigger.tsx             ← idem key UI에 노출
    GameConfigPanel.tsx
    NearMissProbPanel.tsx
    ParticleIntensityPanel.tsx
  treasury/WithdrawalQueueBulk.tsx
  growth/
    SimRealConversion.tsx
    AbConsole.tsx
    MarketingTools.tsx
  compliance/RiskCenter.tsx
  ops/
    EmpireWeeklyReport.tsx
    AuditLogTable.tsx
    NotificationCenter.tsx
```

공통 규칙:
- 빈상태 `@/components/ui/empty-state` / 로딩 `@/components/ui/loading-state` / 토스트 `@/lib/notify`
- realtime 채널 이름에 `Math.random().toString(36).slice(2)` suffix (StrictMode 안전)
- **모든 신규 라우트**: `<AdminAal2Gate>` 래핑 (game/treasury/compliance/ops/audit/notify)

## 구현 순서 (3일, 가드레일 명시)

**Day 1 — 무조건 완료 ✅**
1. 마이그레이션: `admin_audit_log` + `log_admin_action()` 트리거/헬퍼 + `game_config` + `require_admin()`
2. `_nav.ts` IA 재배치 (게임 섹션 신설 포함)
3. `<EmpireOverview/>` 골격 + **월500억 progress bar** + **Today Crown Total** 대형 노출
4. Bot Console 5 카드 (`get_ghost_empire_stats()` 등 보조 RPC 포함)

**Day 2**
- `admin_get_user_360` + `<UserDetail360/>`
- `admin_trigger_crown` (idem key 강제) + `<ManualCrownTrigger/>`
- Withdrawal Bulk (RPC + UI 다중선택/일괄 승인·반려)
- `<RiskCenter/>` (anomaly_events 뷰)
- Game Config 슬라이더 3종

**Day 3**
- A/B Console (테이블 + RPC + UI)
- SIM→Real Conversion 분석
- Marketing Tools / Notification Center
- Empire Weekly Report 카드 확장
- 라우팅/AAL2 게이트 최종 연결 + QA + 권한 baseline 등록

## 비고
- Ghost 식별 컬럼 미존재 시 `profiles.is_ghost boolean default false` 추가 + ghost seeder 마킹.
- `admin_trigger_crown`은 `award_crown` 기존 RPC를 래핑 — 본 RPC가 idem key 생성·로깅만 담당.
- 모든 어드민 행동은 `admin_audit_log` → `<AuditLogTable/>`에서 검색·필터.
- 보안 린터 0028/0029/0011: 신규 RPC 추가 시 `function_permissions_baseline` 갱신 필수.
