
# 🚀 Phonara.world V17 — Mars Empire × Real Unicorn (최종 통합 청사진)

> **One-Liner:** "폰을 켜는 순간 = 제국 입성. 추천 피드는 나만을 위해 살아 있고, /arena를 시작하지 않으면 손해 본다는 확신이 3초 안에 든다. AI가 24시간 글로벌 SNS에 제국을 자동 전파하고, 모든 클릭이 매출이 된다."
>
> **포지셔닝:** 행동 금융 시뮬레이션 OS + AI 콘텐츠 SaaS + 추천 엔진 + 바이럴 옵티마이저 + 실전 수익화 엔진 + AWS 유니콘 인프라
>
> **해자:** 폐쇄형 5중 플라이휠 — Feed → Engagement → Ritual → Revenue → AI Retrain. 동시 보유한 경쟁자 0.

---

## 0. 8-Gate Merge Rule (모든 PR 강제)

PR은 8개 모두 YES 여야 머지:
1. KPI 1개 이상 직접 기여? (전환·ARPU·K·MAU·CTR·Viral·Watch3s)
2. 봇/시뮬 데이터 SIM 배지 + 툴팁?
3. 제국 입성 의식 시퀀스 통과?
4. `/arena` 트레이딩 1:1 연동?
5. A/B 변형 등록 (`useABVariant`)?
6. Content OS 피드백 루프 hook?
7. Recommendation/Revenue/Viral hook?
8. **🆕 Revenue Event 등록 + Attribution 정의?**

미달 변형 = 7일 후 자동 롤백.

---

## 1. KPI 매트릭스 (현실 화성 1위)

| 지표 | 1M | 3M | 6M | 12M |
|---|---|---|---|---|
| MAU | 5만 | 50만 | 300만 | 1,000만 |
| 첫입금 전환율 | 25% | 35% | 45% | 55% |
| ARPU/월 | ₩30k | ₩50k | ₩80k | ₩120k |
| K-Factor | 1.2 | 2.0 | 2.8 | 3.5 |
| **월 순수익** | ₩50억 | ₩500억 | ₩2,500억 | ₩5,000억 |
| 상위 제국민 월 수익 | 50~500억 | 100~1,000억 | — | — |
| AI 콘텐츠/일 | 100 | 1,000 | 5,000 | **10,000** |
| 콘텐츠→가입 | 0.5% | 1.5% | 3% | 5% |
| Feed CTR | 8% | 15% | 22% | 30% |
| Viral Score 평균 | 0.35 | 0.50 | 0.65 | 0.78 |
| Watch 3s Rate | 40% | 55% | 68% | 80% |

---

## 2. 페르소나 6종 × Adaptive Mode × Feed Mode

`birth_date → lib/persona.ts → <PersonaAdaptiveLayout>` + `personalizeFeed(user)`.

| 세대 | UX Mode | Feed Mode | /arena 추천 |
|---|---|---|---|
| 20대 대학생 | Game | high-viral | BTC 5x |
| 30대 직장인 | Performance | performance | ETH 10x |
| 40대 사업자 | Strategy | performance | BTC/ETH 20x + AI |
| 50대 가장 | Safety | stable-income | BTC 3x |
| 60-70대 시니어 | Simplified+Voice | stable-income | Paper 우선 |
| 주부/육아맘 | Game(Soft) | high-viral | DOGE/PEPE 5x |

---

## 3~9. 제국 코어 (V10 그대로 · 변경 없음)
Empire Pulse(DBS/RAF/SPA/AI EA Pulse) ↔ /arena 1:1 · 입성 의식 + 3채널 + DepositRitualWizard 5단계 + 첫 ₩10k 100% 매칭 · 4대 바이럴 미션 + OG 4종 + 인플루언서 3등급 · AI 차별화(Empire Advisor / 60s PRO / Autonomous LSTM+XGBoost+RL) · empire_units / map_progress / app:jackpot · Adaptive UX · i18n 8개국 · Trust & Legal · Gold&Dark UI · AAL2 · 보안 메모리 100%.

---

## 10. 🔥 V17 신규 — 5대 엔진

### 10.1 Recommendation Engine (TikTok FYP급)
```ts
score = watch_time*0.4 + share_rate*0.3 + like_rate*0.2 + recent_boost*0.1
personalizeFeed = age<25 ? 'high-viral' : age<40 ? 'performance' : 'stable-income'
```
- DB: `feed_events`, `feed_recommendations`, `user_feed_profile(embedding vector(768))`
- RPC: `rank_feed_for_user`, `record_feed_event`
- Edge: `feed-personalize` (Lovable AI Gemini), `feed-retrain` (15분 cron)
- UI: `<PersonalizedFeedRail>`, `<FeedCard>` (3s autoplay + dwell tracker)

### 10.2 Viral Optimizer (TikTok 역설계)
```ts
viralScore = watch_3s*0.3 + completion*0.4 + share*0.3
bestPostTime = {KR:18, US:19, JP:20, VN:19.5, AR:21}[region]
```
- DB: `viral_metrics`, `posting_schedule_queue`
- Edge: `viral-score-compute` (5분 cron) → Optimizer 피드백, `posting-scheduler` (1분 cron) → SQS

### 10.3 Revenue Engine (3-Layer)
| 모델 | 구현 |
|---|---|
| Subscription | PRO ₩39k / ₩99k |
| Ads | Feed in-stream + jackpot sponsor |
| Tx Fee | /arena 0.05% + 출금 ₩2k |

- DB: `revenue_events`, `revenue_daily_rollup`(mv)
- RPC: `record_revenue_event`, `award_content_referral`
- UI: `<RevenueWidget>` + `/admin/revenue`

### 10.4 AI Content Autopilot (10,000/day)
```text
Trend → Script(Gemini-3-flash, Hook/Problem/Solution/CTA)
   → Render(FFmpeg + avatar + TTS)
   → Multi-Upload(TikTok/IG/YT/X)
   → /c/{video_id} UTM landing
   → Metrics → Optimizer
   → Revenue Attribution → Recommendation Retrain
```

### 10.5 AWS Unicorn Infra (`phonara-unicorn/` 별도 repo)
```text
phonara-unicorn/
├── apps/{api,worker,web,admin}/
├── services/{auth,video,ai,feed}/
├── packages/{shared-types,utils,ai-prompts,platform-adapters}/
├── infra/terraform/{ecs,sqs,s3,rds,cloudfront,autoscaling}.tf
├── pipelines/{video,recommendation,tiktok_optimizer}.ts
├── docker/  └─ .github/workflows/
```
**230 ECS task** = Trend 10 + Script 30 + Render 100 + Upload 50 + Analytics 20 + Reco 20 (auto-scale 10→200).

스택 통합: Supabase(auth/realtime/PG) + Vercel(Next.js) + Docker Compose + GitHub Actions.

---

## 11. 실행 로드맵 (10 Phase / 9~11주)

```text
PHASE 0  Pre-Launch Quick Win                          [3일]
  Pulse + 100만 SIM + AI EA 온보딩 + 성능 응급처치(3D lazy/polling 제거)

PHASE A  매출 직격탄 + /arena 자금 전환                [턴 1]
  Migration: deposits/giftcard/first_deposit/ab_test/pulse_mv
  <DepositRitualWizard> 5단계 + PTC live
  → KPI: 첫입금 25%↑

PHASE B  Empire Pulse 완성                             [턴 2]
PHASE C  바이럴 4미션 + OG 카드 4종                    [턴 3]
PHASE D  AI 차별화 + /arena AI 오버레이                [턴 4]
PHASE E  잭팟 + Adaptive UI + Voice                    [턴 5]

🆕 PHASE R  Recommendation + Revenue                   [턴 6]
  feed_events/recommendations/revenue_events 마이그레이션
  rank_feed_for_user RPC + <PersonalizedFeedRail>
  /admin/revenue 대시보드
  → KPI: Feed CTR 15%↑ / ARPU ₩50k

🆕 PHASE V  Viral Optimizer (TikTok 역설계)            [턴 7]
  viral_metrics + posting_schedule_queue
  viral-score-compute / posting-scheduler crons
  → KPI: Viral Score 0.50↑ / Watch 3s 55%↑

PHASE F  AI Autonomous + i18n 8개국                    [턴 8]

═════════════════════════════════════════════════════════════
🆕 PHASE U  AWS Unicorn Infra (별도 repo · 병렬)        [턴 7~11]
  U.1  phonara-unicorn/ 모노레포 + Terraform → AWS
  U.2  feed/video/ai/auth-service 분리
  U.3  ECS auto-scale 10→200 + SQS 3큐 + S3
  U.4  제국 ↔ unicorn 양방향 webhook + /admin/kpi 통합
  U.5  스케일 100→1k→5k→10k/day
  → KPI: 일 1,000 콘텐츠 + 콘텐츠→가입 1.5%↑
```

---

## 12. 기술 실행 지침

- **신규 DB:** `feed_events`, `feed_recommendations`, `user_feed_profile`, `viral_metrics`, `posting_schedule_queue`, `revenue_events`, `revenue_daily_rollup`(mv) — 모두 RLS + admin/owner 분리.
- **신규 RPC (SECURITY DEFINER + permission baseline):** `rank_feed_for_user`, `record_feed_event`, `compute_viral_score`, `record_revenue_event`, `award_content_referral`, `schedule_post_at_best_time`.
- **신규 Edge Functions:** `feed-personalize`, `feed-retrain`(15m cron), `viral-score-compute`(5m cron), `posting-scheduler`(1m cron), `revenue-attribution`.
- **신규 컴포넌트:** `<PersonalizedFeedRail>`, `<FeedCard>`, `<ViralScoreBadge>`, `<RevenueWidget>`, `<FeedDiagnosticsPanel>`.
- **보안/성능 (V15 그대로):** AAL2 출금 / `guard_profile_sensitive_columns` / `function_permissions_baseline` / `check-forbidden-phrases.mjs` / 3D lazy / polling 제거 / `prefers-reduced-motion` / particle 50%↓.
- **콘텐츠 안전:** 권역별 50개/일 상한 + TikTok/IG/YT 정책 lint + "수익 보장" 금지 phrase 강제.

---

## 13. A/B + KPI 모니터링 (18종)

`conversion_events` 18종:
- **V15 14종:** signup / deposit / share / pro / withdraw / arena_open / arena_close / ai_hit / voice_on / term_tooltip / content_view / content_signup / ritual_complete / jackpot_view
- **🆕 V17 4종:** `feed_impression`, `feed_click`, `revenue_collected`, `viral_milestone`

`/admin/kpi` = 제국 + Content OS + Recommendation + Revenue + Viral 통합 뷰.

---

## 14. 다음 행동 (승인 명령)

```text
옵션 1 — "V17 시작" / "Phase 0+A 진행"
  → 제국 Phase 0 + Phase A 단일 턴 즉시 실행 (성능 응급처치 + Wizard + Migration)

옵션 2 — "Phase R 먼저" (추천+매출 우선)
  → feed_events/recommendations/revenue_events + rank_feed_for_user
  → <PersonalizedFeedRail> + /admin/revenue

옵션 3 — "Phase V 먼저" (바이럴 옵티마이저)
  → viral_metrics + posting_schedule_queue + 2 crons

옵션 4 — "phonara-unicorn 스캐폴드" (별도 repo)
  → Terraform infra + NestJS apps + Docker + Vercel + GH Actions 초안

옵션 5 — "둘 다 병렬"
  → Phase 0+A (제국) + Phase R 또는 U.1 동시

부분 승인 — "성능 응급처치만" / "Wizard만" / "추천만" / "매출만" / "바이럴만"
```

**최종 한 줄:**
> Phonara V17 = 제국(전환·바이럴·트레이딩·AI Autonomous) × Recommendation(개인화 FYP) × Viral(TikTok 역설계) × Revenue(Sub+Ads+Fee) × AI Content Autopilot(10k/day) × AWS 유니콘 인프라 — 5중 폐쇄형 플라이휠. **Phonara Empire, Rise to Mars. 🔥**
