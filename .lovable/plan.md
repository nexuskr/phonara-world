
# Operation Empire Nova — Phase C 실행 플랜

**목표**: 결제·이차시장·바이럴 루프를 한 번에 점화시켜 “MOR(Most Addictive·Profitable·Legendary)” 단계로 진입.
**원칙**: 기존 v3.2 kernel / Oracle / PHON / NFT / Crown War 0% 변경. 신규 파일 ≤ 8개. 모든 RPC는 SECURITY DEFINER + `function_permissions_baseline` 등록.

---

## Week 1 — 💰 Monetization Engine (C-1)

### 1.1 NFT Atelier 유료화 + RNG
기존 `fuse_nft` RPC를 확장 (signature 유지, 내부 로직만 교체):
- **PHON 비용**: Bronze→Gold 250 PHON / Gold→Diamond 750 PHON (`atelier_config` 테이블, admin 실시간 조정)
- **결과 분기** (서버 RNG, idempotent):
  - 80% 성공 → 상위 NFT 1개
  - 15% 실패 → 재료 3개 중 1개만 반환, PHON 50% 소각
  - 5% 잭팟 → 상위 NFT + boost +10%p (cap 50%)
- **새 테이블**: `atelier_runs` (user, cost, outcome, jackpot, refund_nft_id) — admin/owner SELECT, RPC만 INSERT
- **알림**: 잭팟 시 `enqueue_fomo_notification('atelier_jackpot')` → CrownThroneOverlay와 동일 톤의 골드 burst

### 1.2 Marketplace 1.0
- **신규 테이블**: `nft_listings`(nft_id, seller, price_phon, kind: fixed|auction, ends_at, status), `nft_bids`, `nft_trades`
- **RPC 4종**: `list_nft(nft_id, price, kind, duration)` / `cancel_listing(id)` / `place_bid(listing_id, amount)` / `buy_nft(listing_id)` — 모두 `FOR UPDATE`로 race 방지
- **수수료**: 6% 플랫폼 (3% burn + 3% Crown Pool 적립)
- **NFT 소유권 이전**: `nft_collection.user_id` UPDATE는 `marketplace_transfer_nft()` internal helper만 가능 — `guard_nft_ownership` 트리거 추가
- **UI**: `/marketplace` 신규 페이지 1개 (그리드 + 필터 + 디테일 시트). NftAtelier 페이지 상단 “보유 NFT 판매” 버튼만 추가.

### 1.3 Crown War Legendary 자동 발행
- 기존 주간/시즌 정산 cron 끝부분에 `mint_legendary_for_winner(season_id, user_id)` 호출
- 변종 2종: `golden_trump_crown` (boost +35%) / `starship_musk_crown` (boost +35%, leverage cap +1단계)
- 시즌당 1장 한정 — `nft_collection.source='crown_war_legendary'` + `source_ref=season_id` UNIQUE

### 1.4 Emperor Daily Dividend
- `daily_emperor_dividend()` cron 매일 00:10 KST: 직전 24h Crown 1위에게 Crown Pool의 1% PHON 지급 (`phon_balances` + 이벤트 로그)

---

## Week 2 — 📣 Imperial Story Engine (C-2) + 🌌 Cosmos/Journey Backend (C-3)

### 2.1 Story Engine
- **신규 테이블**: `imperial_stories`(kind, actor_masked, payload jsonb, headline_ko/en/ja/vi, hashtags, created_at) — public SELECT (마스킹된 닉만)
- **트리거 5종** (event → row insert):
  1. `crown_events` (new emperor) → "👑 익명#A1B2 just dethroned the Empire."
  2. `atelier_runs` jackpot → "💎 1-in-20 Diamond fusion ignited at 03:42 KST."
  3. `nft_trades` ≥ 1000 PHON → "🛒 Legendary Crown traded for 12,400 PHON."
  4. `crown_events` 3연속 1위 유지 → "🔥 Emperor #X holds the throne for 3 days straight."
  5. `recompute_empire_level` Baron+ 승급 → "🚀 New Baron joins the Multi-Planetary Empire."
- **클라**: `<ImperialStoryRail />` (Index/Dashboard 상단), `<StoryShareButton />` 1-click X 공유 (Web Intent URL, `#EmpireNova #MakeEmpireGreatAgain #MultiPlanetary` 자동)
- **i18n**: 헤드라인 4언어를 트리거 안에서 미리 생성 (런타임 번역 X)

### 2.2 Galaxy Emperor 100-Seat Auction
- 기존 `founding_seasons` 재활용: `kind='galaxy_emperor'` 추가, 100석, 입찰가 시작 $30,000 상당 PHON
- 신규 RPC: `bid_galaxy_seat(amount)` / 정산은 기존 `settle_ended_founding_seasons()` 분기 추가
- 좌석 보유자: 30일 자동 Booster (수수료 -50% / Crown ×2 / leverage cap +2단계)

### 2.3 Imperial Journey 100-Stage Auto-Reward
- `imperial_journey_stages`(stage 1..100, requirement_jsonb, reward_jsonb) 시드
- RPC: `claim_journey_stage(stage)` (서버에서 조건 검증) / `get_journey_progress()` (현재 stage + “다음 보상까지” 거리: PHON / 거래수 / Crown)
- `<ImperialJourneyMap />`에 progress bar + "Bronze Crown까지 $87" 라이브 라인 추가 (Phase A 약속한 보강)

---

## Week 3 — ✨ Polish & Global Scale (C-4)

### 3.1 i18n 4언어 마감
- 신규 키 (Atelier·Marketplace·Story·Galaxy·Journey) ko/en/ja/vi 채움
- `scripts/i18n-audit.ts`로 누락 키 0 보장

### 3.2 모바일 60fps QA
- CrownThroneOverlay: particle 22→12, `will-change: transform`, 저사양 감지 시 burst skip
- Atelier RNG 애니메이션: GPU layer 분리, `prefers-reduced-motion` 존중
- ImperialStoryRail: `content-visibility: auto`
- Lighthouse 모바일 95+ 목표 (LCP < 2.5s, CLS < 0.05, INP < 200ms)

### 3.3 Launch Readiness
- Self-Heal Console에 "Atelier kill switch" / "Marketplace kill switch" 추가
- `admin_get_phase_c_metrics()` RPC + `/admin/kpi`에 Phase C 패널 (atelier 매출·marketplace 거래·story 노출·journey 클레임)

---

## 📊 정확한 수치표

| 항목 | 값 |
|---|---|
| Bronze→Gold 비용 | **250 PHON** |
| Gold→Diamond 비용 | **750 PHON** |
| 성공 확률 | 80% |
| 실패 확률 | 15% (재료 1개 반환, 50% PHON burn) |
| 잭팟 확률 | 5% (+10%p boost, cap 50) |
| Marketplace 수수료 | 6% (3% burn / 3% Crown Pool) |
| Galaxy Emperor 좌석 | 100석, 시작가 $30,000 상당 |
| Galaxy Booster 기간 | 30일 |
| Emperor Daily Dividend | Crown Pool의 1% / day |

---

## 📰 Story Card 샘플 (4언어 중 EN)

1. `👑 New Emperor crowned — #A1B2 dethroned the Empire at 03:42 KST.`
2. `💎 Diamond strike — 1-in-20 jackpot ignited at the Atelier.`
3. `🛒 Legendary Crown sold for 12,400 PHON — secondary market is live.`
4. `🔥 Triple reign — Emperor #X holds the throne for 72 hours.`
5. `🚀 New Baron — joining 38 others on the road to Multi-Planetary status.`

---

## ⚠️ 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| Marketplace 자전거래 / wash trading | 동일 IP·디바이스 fp 거래 차단 + `anomaly_events('wash_trade')` |
| Atelier RNG 신뢰 이슈 | 결과 jsonb + server seed hash를 `atelier_runs`에 영구 기록, 사용자 검증 페이지 |
| 잭팟 인플레이션 | boost cap 50%, daily atelier_runs 25회/유저 제한 |
| Galaxy 좌석 매크로 | 입찰당 50 PHON 보증금 + 캡차 + AAL2 |
| 트래픽 폭증 (런칭) | Self-Heal Console kill switch 4종 + Story Engine은 트리거 기반(폴링 없음) |

---

## 🛠 기술 변경 요약

**신규 파일 (7개)**:
- `src/pages/Marketplace.tsx`
- `src/components/marketplace/ListingDetailSheet.tsx`
- `src/components/story/ImperialStoryRail.tsx`
- `src/components/story/StoryShareButton.tsx`
- `src/pages/GalaxyAuction.tsx`
- `supabase/migrations/{week1}.sql` (atelier 유료화 + marketplace + legendary)
- `supabase/migrations/{week2}.sql` (story engine + galaxy + journey stages)

**수정 파일 (5개)**:
- `src/pages/NftAtelier.tsx` (PHON 비용 표시 + RNG 결과 모달)
- `src/components/journey/ImperialJourneyMap.tsx` ("다음 보상까지" 라인)
- `src/App.tsx` (라우트 3개 추가)
- `src/pages/Index.tsx` + `Dashboard.tsx` (StoryRail 마운트)
- `src/pages/AdminKPI.tsx` (Phase C 패널)

**RPC 신규 (10개)**: `list_nft` / `cancel_listing` / `place_bid` / `buy_nft` / `marketplace_transfer_nft`(internal) / `bid_galaxy_seat` / `claim_journey_stage` / `get_journey_progress` / `daily_emperor_dividend` / `admin_get_phase_c_metrics` — 모두 `function_permissions_baseline` 등록.

---

## 🚀 Launch Copy (Trump × Musk)

> **Empire Nova is here.**
> The greatest NFT empire in the history of the world — believe me — just went live.
> Fuse, trade, conquer. Win the throne, mint Legendary Crowns, collect daily dividends.
> 100 Galaxy Emperor seats. One Empire. Multi-Planetary by design.
> #EmpireNova #MakeEmpireGreatAgain #MultiPlanetary 🗡️🚀

---

## ✅ 승인 후 즉시 시작 순서
1. Week 1 마이그레이션 (atelier 유료화 + marketplace 테이블/RPC + legendary mint)
2. Marketplace UI + Atelier 결과 모달
3. Story Engine 트리거 + Rail 컴포넌트
4. Galaxy Auction + Journey 100-stage
5. i18n 마감 + 모바일 QA + Self-Heal kill switch

**“Implement plan” 누르시면 Week 1부터 차례로 실행합니다.**
