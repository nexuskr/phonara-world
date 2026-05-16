# PHONARA — Single-Planet Monopoly Execution Plan

> 시스템 프롬프트의 14개 법칙을 6주 실행 로드맵으로 압축. 
> 한 줄: **"앱이 아니라 살아 있는 디지털 국가"** 를 만든다.

## 0. 5대 적합성 게이트 (모든 작업의 통과 기준)

```text
Feels alive ─ trustworthy ─ instant ─ socially valuable ─ dangerous to leave
                        ≥ 2개 만족 못 하면 빌드 금지
```

현 상태 진단(이미 보유한 자산):
- Trust 해자: Oracle Fortress + Kernel + Trust v2 + 영수증 토대 ✅
- Speed 해자: deposit lifecycle + realtime/polling 분리 ✅
- Identity 해자: Empire 10-Tier + Crown + NFT + Founding Seat ✅
- Buzz 해자: Whale Rail + Trump×Musk briefing + AS SEEN ON ✅
- **부족한 것**: ① 글로벌 진입점 ② 정체성의 외부화 ③ "도시처럼 보이는 홈" ④ 자동 콘텐츠 ⑤ 살아있는 느낌의 ambient layer

---

## 1. Sprint Ω-1 — Living Capital (Week 1)
**목표: 홈이 "대시보드"가 아니라 "수도(capital city)"처럼 보이게.**

| 작업 | 산출물 | 통과 게이트 |
|------|--------|------------|
| `WorldCanvas` — 2.5D 살아있는 도시 배경 | `@pkg/live/world/WorldCanvas.tsx` (CSS+SVG layer, GPU friendly) | alive, instant |
| `AmbientPulse` — 무이벤트 dead zone 제거 | 1.5초마다 micro event 1개 floating (rank-up·Crown·withdraw) | alive, social |
| `LiveCityHUD` — 우측 상단 미니 지구본 + 동접 + 24h volume | `get_world_domination_stats` 60s | trustworthy, alive |
| `/home` 재구성: Hero → AmbientPulse → 4탭 → LiveTicker | `src/pages/Home.tsx` 교체 | alive, instant |

성공 지표: 홈 진입 후 3초 내 "뭔가 움직인다" 인지 100%, 평균 첫 클릭 시간 < 8s.

## 2. Sprint Ω-2 — Trust Receipts & Status Page (Week 1~2)
**목표: 돈에 대한 불확실성을 0으로.**

- **출금 영수증 PDF + hash 검증** (`settlement_receipts` + `verify_settlement_receipt(hash)` RPC).
  공개 페이지 `/r/<hash>` — 누구나 검증 가능. Stake가 못 따라옴.
- **`/status` 공개 페이지** — oracle quorum / kernel inflight / payout p50,p99 / 7d uptime. 거래소급 투명성.
- **`/api/public/metrics`** — TVL, 24h volume, payouts (CORS open) → 외부 트래커 백링크 자동 수집.
- **deposit heartbeat 강화**: `useDepositRealtime` "확인중" 단계에 0.8s pulse + safe-checking copy 회전.

성공 지표: 출금 후 영수증 외부 공유 일 100+, /status 일 PV 2,000+, CS "내 돈 어디" 티켓 -70%.

## 3. Sprint Ω-3 — Identity Externalization (Week 2~3)
**목표: 프로필이 SNS 자랑거리가 되게.**

- **`/u/<nickname>` 공개 시민 페이지** — Empire/Crown/NFT/withdrawal flex/prediction wins. 동적 OG 1200×630 (`og-image-renderer` edge).
- **임베드 위젯** `<iframe src="/embed/u/<nick>">` 1줄 — 디스코드/노션/블로그 부착.
- **자동 share card**: Crown 폭발/Baron 승급/대형 출금 시 1-tap "공유" → 카드 PNG + 단축 링크.
- **Cross-poster (opt-in)**: X/Threads OAuth 1회 → 마일스톤 자동 게시.
- **Achievement Mint**: 첫 Baron / 100 Crown / Vault 1M 달성 시 한정 NFT 자동 발급.

성공 지표: 공개 프로필 외부 referrer/월 5만+, 자발적 share/일 200+, 임베드 1,000개+.

## 4. Sprint Ω-4 — Compounding Money Loop (Week 3)
**목표: 수익이 수익을 부르는 자동화.**

- **Empire Vault**: PHON lock → 24h 황제 배당 + Crown 가중치 자동 재투자. `vault_positions` + cron `settle_vault_daily`.
- **2-Tier Referral**: 5% / 2% + `/r/<code>` 단축 + 동적 OG.
- **Sponsored Whale Slot**: Whale Rail 광고 슬롯 24h $50 PHON 자동 입찰 (자기 광고 = 자기 수익화).
- **VIP Auto-renew Dialog**: 만료 24h 전 1-click 갱신.

성공 지표: Vault TVL 100M PHON, 2-tier 신규 MoM +30%, sponsored 점유 70%+.

## 5. Sprint Ω-5 — Headline & Prediction Engine (Week 4)
**목표: 매일 헤드라인이 트래픽을 만든다.**

- **/predict 공개 마켓** — 기존 `daily_briefings` AI 위에 prediction_markets + market_orders. resolves_at 도달 시 `resolve_market(market_id,outcome)` + oracle quorum 인용.
- **Live Auto-Clip**: `/live` 영상에서 60s Crown 폭발/Baron/대형 출금 자동 클립 → `live_clips` + `x-post-bot` edge로 X 자동 게시.
- **/press 페이지 + 홈 마키 강화** — `inbound_press_hits` 자동 큐레이션.

성공 지표: 예측 일거래 10M PHON, 주간 외부 언급 3건+, 자동 클립 평균 1k+ 노출.

## 6. Sprint Ω-6 — Global Beachhead (Week 5)
**목표: "한국 사이트"에서 "글로벌 카테고리"로.**

- **i18n**: `@pkg/core/i18n` EN/JA/ZH-TW 상위 35 키 (manifest는 이미 존재).
- **/en /ja /zh 랜딩** — hreflang + canonical 자동. WorldHero 다국어.
- **5개 SEO 페이지**: vs Stake / vs Rollbit / vs Polymarket / Korean Crypto Casino Alternative / Trump Election Live Odds. 각각 JSON-LD `ComparisonPage` + 자동 갱신 KPI.
- **og-image-renderer** 라우트별 동적 OG.

성공 지표: 비-KR organic 5,000 sessions/d, US/JP 노출 1만+/월.

## 7. Sprint Ω-7 — Crush Layer (Week 6)
**목표: 후발주자가 못 따라오게 잠금.**

- **Bug Bounty `/security/bounty`** — severity별 PHON 상금 + 명예의 전당.
- **TradFi-grade Receipt + Public Verifier** 마무리 (Ω-2의 확장 — 30일치 hash batch attestation).
- **Open Data Embeds** — TVL/지수 위젯 외부 사이트가 1줄로 임베드 가능.

성공 지표: bounty 유효 보고 5건+/월, 외부 위젯 임베드 100+.

---

## 8. 의존도 & 병렬화

```text
Week 1: Ω-1 (Living Capital) ──┐
        Ω-2 (Receipts/Status) ─┤── 병렬
                               │
Week 2~3: Ω-3 (Identity)  ─────┘──┐
          Ω-4 (Money Loop) ───────┤── 병렬
                                   │
Week 4: Ω-5 (Headline/Predict) ◀──┘
Week 5: Ω-6 (Global Beachhead)
Week 6: Ω-7 (Crush)
```

## 9. 우선순위 ENUM (시스템 프롬프트 §12 고정)

```ts
export const PRIORITY = ["trust","alive","simple","retention","social","monetize","feature"] as const;
```
모든 PR는 description에 어느 항목을 강화하는지 명시. 2개 이하면 reject.

## 10. 북극성 지표 (6주 후)

| 영역 | 지표 | 목표 |
|------|------|------|
| Alive | 홈 진입 후 8s 내 첫 클릭 | 70% |
| Trust | 출금 영수증 검증 호출/d | 500+ |
| Identity | 공개 프로필 외부 referrer/월 | 50,000 |
| Money Loop | Vault TVL (PHON) | 100M |
| Headline | /predict 일거래액 | 10M PHON |
| Global | non-KR organic sessions/d | 5,000 |
| Crush | 외부 임베드 위젯 수 | 100+ |

전체: **MAU ×3 · ARPDAU ×2 · 외부 백링크 ×5 · "디지털 국가" 포지셔닝 확립.**

## 11. 기술 노트

- 신규 테이블: `settlement_receipts` · `vault_positions` · `referral_payouts_v2` · `sponsored_whale_bids` · `prediction_markets` · `market_orders` · `live_clips` · `achievement_mints` · `public_profile_views`.
- 신규 edge: `og-image-renderer` · `x-post-bot` · `settle-vault-daily` · `resolve-market` · `auto-clip-live` · `receipt-pdf`.
- 신규 RPC: `verify_settlement_receipt` · `get_public_metrics` · `get_status_page_snapshot` · `get_public_profile(nick)`.
- 모든 신규 코드는 `@pkg/*` (Sprint 0 규칙). UI 텍스트는 `g()`/`G`.
- AI: 정산/헤드라인 `google/gemini-2.5-flash`, 영수증 hash signing은 edge secrets.
- 보안: 신규 admin RPC 전부 `AdminAal2Gate` + permission baseline 등록.
- 실시간: `useRealtimeChannel` 단일 진입점만 사용.

## 12. 명시적 비대상 (Out of Scope)

- 자체 토큰/체인 발행 — 규제 리스크.
- Unreal/Three.js 풀 3D 메타버스 — §8 위반("불가능한 복잡도").
- 풀스택 모바일 앱 — PWA 우선.
- Stripe/PG 자동 결제 — `mem://constraints/payment-routing` 위반.
- 라이브 딜러 카지노 — 라이센스 ROI 비합리.

## 13. 1번 작업 (지금 바로)

`Sprint Ω-1 — Living Capital` 안에서 **`AmbientPulse` 컴포넌트**부터 시작.
- 위치: `src/packages/live/world/AmbientPulse.tsx`
- 데이터 소스: 기존 `get_live_activity_60s` + `get_whale_strikes_24h`
- 마운트: `/home`, `/dashboard` Hero 하단
- 효과: 1.5~3s 간격 floating chip 1개 (rank-up·Crown·withdraw·VIP arrival) — 사라지면서 다음 chip 등장 → "절대 정적이지 않다"

이게 끝나면 `WorldCanvas` → `LiveCityHUD` 순으로 1주 안에 Ω-1 완성.
