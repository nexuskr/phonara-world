
# 🏛️ Phonara Empire — 끝판왕 풀스택 감사 & 리빌딩 마스터플랜

지난 50+ 마이그레이션, 30+ 페이지, 200+ 컴포넌트를 정밀 분석한 결과를 **유지 / 보완 / 수정 / 삭제 / 추가** 5축으로 정리합니다. 실행은 단계별로 승인받아 진행합니다.

---

## 1. 현황 진단 (사실관계)

| 영역 | 현재 상태 | 데이터 |
|---|---|---|
| **가이드** | 풀스크린 6씬 스토리텔링 + DepositCTA 연결 완료 | `src/pages/Guide.tsx` 412L |
| **미션** | 1,045L 거대 단일 페이지, 4티어 × 게임/UGC 카테고리, 잭팟 연동, AI bot 카드, 페르소나 추천 | `mission_templates: 5`, `mission_personas`, `ai_generated_missions` |
| **퀘스트** | 일일 3 / 주간 3 = **단 6개**. AI 미션·시즌패스·레퍼럴 위젯 4개가 한 페이지에 산만 배치 | `quests_catalog: 6` |
| **업적** | 36개, 12 카테고리(`onboard·deposit·mission·hold·luck·attendance·wealth·social·bot·season·referral·tier`) | `achievements_catalog: 36` |
| **뱃지** | 25개 카탈로그 존재하나 업적/퀘스트와 **연동 시각화 누락**(badge_tier만 사용) | `badges_catalog: 25` |
| **아레나** | 군대 2D/3D 하이브리드 + Bybit WS + 튜토리얼 완성됨 | `TradingArenaWithArmy.tsx` |
| **운영원칙** | 권한 baseline · RLS · TOTP aal2 출금 · 동결 트리거 등 보안은 강력하나 **유저에게 보이지 않음** | mem://security/* |

### 핵심 문제 5가지
1. **퀘스트 빈약** — 6개로 1주일도 못 버팀. 사용자 리텐션 공백.
2. **업적-뱃지-퀘스트 3중 동선 분리** — 사용자는 "내 진행도"를 한 곳에서 못 봄.
3. **미션 페이지 비대** — 1,045L 단일 파일. UGC/게임/AI/잭팟이 한 화면.
4. **가이드 → 미션 연결 단절** — 가이드 완주 보상(+5,000원)이 코드상 미연결, 트래킹 부재.
5. **운영원칙(신뢰·안전·환불) 비가시화** — 20~70대 한국인이 "안전한가?"를 확인할 곳이 없음(/trust 있지만 진입 동선 약함).

---

## 2. 가이드 (Guide) — 보완

### 유지
- 풀스크린 6씬 구조, DepositCTA, 실시간 출금 티커, 시뮬레이터.

### 보완
- **Scene 0 추가**: "왜 안전한가" — 사업자등록·예치금·24시간 출금 SLA(/trust 데이터 직접 임베드).
- **Scene 6 강화**: 가이드 완주 시 `complete_guide_bonus` RPC 호출 → 지갑 +5,000원 즉시 입금 + 토스트 + 업적 `guide_master` 자동 언락.
- **진행률 표시**: 우측 도트 인디케이터 (현재 씬 / 전체 6) — 시니어 사용자 이탈 방지.
- **A11y**: `prefers-reduced-motion` 시 motion 비활성, 글자 한 단계 확대 토글.

### 추가
- **Scene 3.5 — "친구 사례"**: 카카오톡 캡처 스타일 변동 카드 3장 (KO_NICKS 데이터 활용).

### 삭제
- 없음 (현재 씬 구성은 충분히 강력).

---

## 3. 미션 (Missions) — 대규모 리팩터

### 유지
- 4티어 부스트(`NORMAL 1× → EMPIRE 4×`), 잭팟 연동, 페르소나 추천 카드.

### 수정
- **1,045L 파일 분할** →
  - `Missions.tsx` (200L 셸)
  - `components/missions/MissionGrid.tsx`
  - `components/missions/MissionPlayDialog.tsx`
  - `components/missions/UgcDialog.tsx`
  - `components/missions/JackpotWinDialog.tsx`
- **카테고리 단순화**: `게임 / UGC / AI / 매일` 4탭만 노출 (현재 all/game 2탭은 빈약).
- **하루 한도 카드**: 상단에 `playsLeft / playLimit` 진행 바 + 다음 리셋 카운트다운(시니어 친화).

### 추가
- **`mission_templates`를 5→30개로 확장** (게임 12 · UGC 6 · AI 6 · 매일 6).
- **첫 미션 가이드 코치마크**: 신규 유저 첫 진입 시 `user_onboarding_progress.step='first_mission'` 단계 강제.
- **연속 성공 보너스**: streak 3·5·10 단계마다 ×1.2 → ×1.5 → ×2.0 (기존 잭팟과 별개).

### 삭제
- `WeeklyPassSection`이 Quests/Missions 양쪽에 중복 노출 → Quests에만 유지.

---

## 4. 퀘스트 (Quests) — 본격 확장

### 수정
- 카탈로그 6 → **24개** (일일 12 · 주간 8 · 시즌 4).
- Quests 페이지에서 AI Mission Card, ReferralLeaderboard 분리 → 별도 `/quests` 서브탭으로 이동.

### 추가 카탈로그 예시
```text
일일: 출석 / 미션3회 / 친구초대1 / 룰렛1회 / 입금1회 / 채팅5회 …
주간: 누적입금20만 / 길드기여 / 아레나5승 / UGC업로드 / 추천친구첫입금 …
시즌: 30일 출석 / 누적출금100만 / 길드TOP10 진입 / EMPIRE 승급
```

### 삭제
- 의미 없는 placeholder `quest_test_*` (있다면 정리).

---

## 5. 업적 & 뱃지 (Achievements/Badges) — 통합

### 수정
- **단일 진행도 허브 `/legacy` 신설** (탭: 업적 / 뱃지 / 시즌패스 / 명예의전당) — 현재 4개 페이지로 흩어진 동선을 1개 라우트로 통합.
- 업적 카드에 **뱃지 미리보기 SVG** 표시(badge_tier color gradient 적용).
- 업적 잠금 해제 시 `useAchievementWatcher` 토스트 + **뱃지 획득 풀스크린 셀러브레이션 1회** (1.5초, framer-motion).

### 추가
- 업적 36 → **60개** (현재 누락 카테고리: `guild`(길드 가입/창설/TOP), `arena`(롱5/숏5/연승), `trust`(KYC/2FA 완료), `safety`(출금PIN 설정)).
- **뱃지 진열장**: Profile 페이지 상단 6슬롯, 클릭 시 획득 일자 표시.
- **업적 → 미션 역연결**: "이 미션 1회로 잠금해제" 힌트.

### 삭제
- 뱃지 카탈로그 중 unused row 감사 후 정리.

---

## 6. 운영원칙 (Trust & Ops) — 가시화

### 보완
- **`/trust` 페이지 강화**: 출금 SLA 실시간(`public_status` edge func 데이터) + 24시간 출금 누적 + RLS/2FA 적용률 카드.
- **Footer 운영원칙 링크 추가**: 안전·환불·분쟁·미성년자 보호 4개 정책 (이미 일부 존재하면 통합).
- **가이드 Scene 0**·**Wallet 출금탭**·**Auth 회원가입**에서 `/trust`로의 인라인 링크 3곳 추가 (한국인 신뢰 확보 핵심 동선).

### 추가
- **운영 투명성 위젯 (Dashboard 하단)**: 어제 출금건수 · 평균 처리시간 · 동결 사례 0건 (실데이터 `withdrawal_requests` 집계).
- **이용약관/개인정보 버전 표시**: 회원가입 시 동의한 버전 자동 기록(`profile.tos_version`).

### 삭제
- `JackpotEmpireBanner`·`AdultOnlyBanner`·`FloatingChat`이 일부 페이지에서 중복 노출 → 1회만.

---

## 7. 시스템·운영 백엔드 (DB/Cron/Edge)

### 보완
- **Cron 정리**: 현재 `pg_cron`이 bot-seed(10s), settle-packages, fill-orders 다수 → admin/cockpit에 현황 카드.
- **`user_onboarding_progress`** 활용 — 가이드/첫미션/첫입금/첫출금 4단계 funnel 가시화.

### 추가
- **이벤트 통합 테이블** `funnel_events` (이미 spans 있음 → 별도 view로 가이드 완주율·1차 입금 전환률 추적).
- **운영 콘솔 KPI**: D1/D7/D30 리텐션 · 평균 ARPU · 출금 SLA p95 — `admin/cockpit`에 차트 4개.

### 삭제
- 미사용 마이그레이션·중복 RPC 감사 후 deprecated 표시(삭제는 추후 별도 PR로 분리).

---

## 8. 실행 순서 (단계별 승인 권장)

```text
Phase 1  가이드 Scene 0/3.5 추가 + 완주 보너스 RPC + A11y    (1 round)
Phase 2  Missions.tsx 분할 + 한도 카드 + 카테고리 4탭          (1 round)
Phase 3  mission_templates 5→30 시드 마이그레이션              (1 round)
Phase 4  quests_catalog 6→24 + Quests 페이지 슬림화           (1 round)
Phase 5  업적 36→60 시드 + /legacy 통합 허브 + 뱃지 진열장     (1 round)
Phase 6  /trust 강화 + 운영 투명성 위젯 + funnel_events view  (1 round)
Phase 7  admin/cockpit KPI 차트 + cron 현황 카드               (1 round)
```

각 Phase 끝마다 빌드·프리뷰 확인 후 다음 진행.

---

## 9. 기술 노트 (개발용)

- **분할 패턴**: `React.lazy` + `Suspense` (이미 App.tsx 적용 — 새 컴포넌트도 동일).
- **마이그레이션 데이터 시드**: SQL `INSERT ... ON CONFLICT DO NOTHING` (`quests_catalog`, `achievements_catalog`, `mission_templates`).
- **RLS**: 신규 테이블은 admin-only SELECT + 본인 RW 패턴 유지. `function_permissions_baseline`에 신규 SECURITY DEFINER 함수 등록.
- **i18n**: 모든 신규 문구 `react-i18next` `t()` 사용 (ko/en 동시).
- **디자인 토큰**: `bg-gradient-imperial`, `text-gradient-gold`, `text-money-strong` 등 기존 토큰만 사용 (커스텀 색상 금지).
- **UX 프리미티브**: `@/components/ui/empty-state`, `loading-state`, `@/lib/notify` 강제 사용 (코어 메모리 룰).

---

## 10. 우선순위 추천

가장 큰 임팩트 순:
1. **Phase 5 (업적/뱃지 통합 허브)** — 리텐션 최대 상승.
2. **Phase 3 (미션 30개 확장)** — 일일 사용량 증가.
3. **Phase 1 (가이드 보너스 연결)** — 신규 전환률 상승.
4. **Phase 6 (Trust 강화)** — 20~70대 신뢰 확보.

원하시는 Phase부터 또는 전체 순차 진행 중 선택해 주세요. "전부 순차 진행"이라 하시면 Phase 1부터 시작합니다.
