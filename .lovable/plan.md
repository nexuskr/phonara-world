
# Phonara Viral Pack v3.3 — PR1 최종 LOCK

v3.2 → v3.3 변경: UX 문구 5%만 잠금. 구조는 동결.

---

## 0. v3.3 LOCK 수정 (2개)

### LOCK-1. RRM OFF 시 사용자 문구 (구조 외재화)

**문구 원칙**: "정책 때문에 막힘" 해석 차단 → "원래 구조적으로 포함되지 않음"

| 위치 | ❌ 폐기 | ✅ 채택 |
|------|--------|---------|
| `FinancialEventStatus` (RRM OFF) | "현재 정책에서는 M2 단계가 인센티브 대상이 아닙니다" | **"M2 단계는 현재 인센티브 프로그램에 포함되지 않습니다"** |
| 보조 표현 | — | "M2 단계는 인센티브 대상이 아닌 이벤트입니다" |
| 어드민 toggle 영향 안내 | "사용자에게 보류로 표시됨" | "사용자에게는 프로그램 비포함 이벤트로 표시됨" |

**공통 금지어** (사용자 표면 전체): 정책 때문에 / 막힘 / 보류 / 잠금 / 차단 / 미지급 / 지연 / 큐 / 대기 / 예약

i18n 등록 + `scripts/check-forbidden-phrases.mjs`에 위 단어 추가.

### LOCK-2. Activity Index 라벨 → "내 활동"

**Index/Score 어휘 전면 제거** (점수·평가·성과 해석 차단).

| 항목 | ❌ 폐기 | ✅ 채택 |
|------|--------|---------|
| 사용자 라벨 | "내 활동 지수 / Activity Index" | **"내 활동 (7일)"** 또는 **"최근 추천 활동"** |
| 컴포넌트명 (코드) | `ActivityIndexCard` | `RecentReferralActivityCard` |
| Edge function | `recompute-activity-index` | `recompute-recent-activity` |
| DB 컬럼/메트릭 키 | `activity_index` | `recent_activity_count_7d` |

표시는 단순 정수 (예: "최근 7일 활동 3건"). 진행률 바·등급·티어 결합 절대 금지.

---

## 1. 최종 스키마 (v3.3, 변경분만)

```text
viral_settings
├─ revenue_recognition_enabled  bool default true
├─ rrm_no_retroactive_payout    bool default true   [DB 잠금]
├─ rrm_disabled_reason          text
├─ rrm_last_toggled_at/by

viral_attribution_chain
├─ depth  smallint  CHECK (depth = 1)
├─ status text  ('clicked'|'signed_up'|'activated'|'paying'|'churned')
└─ window_expires_at  timestamptz (created_at + 90d)

viral_mission_catalog
├─ milestone_bonuses           jsonb
└─ lifetime_cap_per_invitee    bigint default 30000

viral_mission_submissions
├─ entitlement_status          text  ('not_eligible'|'eligible'|'paid')
├─ milestones_paid             jsonb
└─ total_bonus_paid            bigint default 0

viral_proof_dedupe              [proof_hash UNIQUE]
admin_attribution_internal      [admin-only CAC/LTV/Quality]
```

## 2. Edge Functions

```
attribute-click             공개, anon_id + depth=1 chain 생성
settle-milestone-bonus      M1·M4 항상; M2·M3 RRM=ON일 때만 entitlement
                            RRM=OFF 시 entitlement_status='not_eligible'로 기록만 (채무 X)
recompute-recent-activity   cron 1h, 사용자 노출 "최근 7일 활동" 카운트
recompute-economics         cron 1h, admin-only CAC/LTV/Quality
verify-viral-proof          플랫폼별 증빙
generate-viral-copy         Lovable AI Gateway + 금지문구 필터
toggle-rrm                  admin-only + audit log
```

## 3. 사용자 UX (`/viral`)

```
IncentiveSummary           누적 인센티브, 가입 인원
RecentReferralActivityCard "최근 7일 활동 N건"  (정수만, 등급·진행률 X)
─ 행동 기반 인센티브 ─
BehaviorMilestones         M1 (가입 활성화) · M4 (30일 유지)
─ 금융 이벤트 상태 ─
FinancialEventStatus       M2 / M3 — 상태 표시만, 금액 X
                           RRM ON:  "이 이벤트는 인센티브 프로그램에 포함됩니다"
                           RRM OFF: "M2 단계는 현재 인센티브 프로그램에 포함되지 않습니다"
PlatformGrid · MissionDeck · ProofUploader · ViralComposer
IncentiveDisclosure        1단계 한정 고지 (항시)
```

## 4. 어드민 UX (`/admin/viral`)

- `RRMToggle` (사유 필수, audit log)
- `EconomicsBoard` — CAC/LTV/Quality/funnel
- `AttributionInspector`
- `MLMShield` — depth>1 시도 로그
- `NoEntitlementLedger` — RRM OFF 동안 발생한 M2·M3 회계 기록 (지급 큐 아님, 소급 지급 버튼 없음)

## 5. PR 순서 (5개, 변경 없음)

1. **PR1 — Compliance Foundation**
   `viral_settings`(RRM 잠금), `viral_attribution_chain`(depth CHECK + 트리거),
   `viral_proof_dedupe`, RLS, `IncentiveDisclosure`, 금지어 사전 확장
2. **PR2 — Milestone Engine + RRM**
   catalog/submissions(`entitlement_status`), `attribute-click`,
   `settle-milestone-bonus`(소급 지급 금지), `toggle-rrm`, 40개 시드
3. **PR3 — Verification + AI**
   `verify-viral-proof`, `generate-viral-copy`(금지문구 필터)
4. **PR4 — User Surface**
   `IncentiveSummary` · `RecentReferralActivityCard` · `BehaviorMilestones` ·
   `FinancialEventStatus` · `PlatformGrid` · `MissionDeck` · `ProofUploader` ·
   `ViralComposer`, `recompute-recent-activity` cron
5. **PR5 — Admin Economics + MLM Shield**
   `RRMToggle` · `EconomicsBoard` · `AttributionInspector` · `MLMShield` ·
   `NoEntitlementLedger`, `recompute-economics` cron

## 6. 잠금 원칙 (4개)

1. **권리 미생성**: RRM OFF 시 entitlement *애초에 미생성*. 채무/보류/큐 어휘 금지.
2. **소급 금지**: `rrm_no_retroactive_payout=true` DB 잠금. 어드민 토글 불가.
3. **활동 카운트 한정**: 최근 7일 활동은 *정수 카운트*일 뿐. 점수/등급/경제 계산 결합 금지.
4. **이벤트 분리**: 금융 이벤트(M2·M3) UI는 상태 표시만. 보상 어휘·금액·진행률 노출 금지.

## 7. 본질 정의 (최종 LOCK)

> "조건 미충족 상태를 명시적으로 기록하는, 행동 기반 예산 고정 인센티브 엔진"

**상태**: ✅ 기술 안정 / ✅ 데이터 안정 / ✅ UX 분리 / ✅ 규제 표현 잠금 — PR1 진입 가능.

PR1부터 시작할까요?
