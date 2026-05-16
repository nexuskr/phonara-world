# Phase Ω — "Single-Planet Monopoly" Roadmap

목표 한 줄: **동종업계(예측·소셜 트레이딩·캐주얼 머니 게임) 글로벌 1위로 압살.**
방향: 더 많은 기능이 아니라, *해자(moat)* 4개를 동시에 깊게 판다.

## 0. 해자 4개 (Moat Map)

```text
       ┌──────────────┐
       │ 1. 신뢰 해자  │  돈이 사라지지 않는다는 확신
       └──────┬───────┘
              │
┌─────────────┼─────────────┐
│ 2. 속도 해자 │ 3. 정체성 해자│  Empire/NFT/Crown
└─────────────┼─────────────┘
       ┌──────┴───────┐
       │ 4. 화제 해자  │  Trump×Musk·Live·Press
       └──────────────┘
```

이미 깔린 것: Oracle Fortress, Kernel Observability, Trust v2, Empire 10-Tier, VIP, Whale Rail, Phase D Trump×Musk, AS SEEN ON, B2B Sim API.
빠진 것: **글로벌 진입점**, **카테고리 정의**, **언론 화력**, **수익 자동화**.

---

## 1. Phase Ω-1 — Global Beachhead (Week 1~2)

세계 시장 진입의 1번 관문. "한국 사이트"가 아닌 "글로벌 카테고리 리더"로 보이게.

- **i18n 골격**: `@pkg/core/i18n`에 EN/JA/ZH-TW 추가. 핵심 35개 키만 우선(`g()` 호출 상위). 자동 fallback = KO.
- **/en /ja /zh 라우트**: 국가별 랜딩 3종(World Domination Wall + 현지 카피). hreflang + canonical 자동.
- **글로벌 SEO 페이지 5종**: `Phonara vs Stake`, `vs Rollbit`, `vs Polymarket`, `Korean Crypto Casino Alternative`, `Trump Election Live Odds`.
  - 각 페이지 JSON-LD `ComparisonPage` + 자동 갱신 KPI(`get_world_domination_stats`).
- **Edge `og-image-renderer`**: 라우트별 1200×630 동적 OG(Empire 티어/Crown/누적 출금액 박은 카드) → 트위터 카드 폭격.

성공 지표: 30일 내 비-한국어 organic traffic 5,000 sessions/d, US/JP 검색 노출 1만+.

## 2. Phase Ω-2 — Compounding Money Loop (Week 2~3)

수익이 수익을 만드는 자동화. 사람 손 안 탐.

- **Empire Vault (자동 복리)**: PHON을 vault에 lock → 24h마다 황제 일일 배당 + Crown 가중치 자동 재투자. `vault_positions` + `cron settle_vault_daily`.
- **Referral 2-Tier 폭주**: 기존 referral 위에 2-tier 5% / 2% 추가. `referral_payouts_v2` 테이블 + 매일 자동 정산. 글로벌 메가폰: `/r/<code>` 단축 + 동적 OG.
- **Sponsored Whale Slot**: Whale Rail 안에 24h 광고 슬롯 1칸(=$50 PHON). 자동 입찰. `sponsored_whale_bids`. 자기 광고로 자기 사이트 수익화 = AdSense 안 씀.
- **VIP Auto-renew 동의 다이얼로그**: 만료 24h 전 1-click 갱신 + Crown ×3 잠금 유지.

성공 지표: vault TVL > 100M PHON, sponsored slot 점유율 > 70%, 2-tier referral MoM 신규 +30%.

## 3. Phase Ω-3 — Headline Weapon (Week 3~4)

Trump·Musk·테슬라·도지 — 매일 헤드라인이 트래픽을 생성하게.

- **/predict 시장 카테고리** (이미 `daily_briefings` 있음): 클로즈드 베타로 운영 중인 prediction 흐름을 공개 마켓으로 승격.
  - `prediction_markets`(question, resolves_at, yes_odds, no_odds, oracle_source) + `market_orders`.
  - 정산: `daily_briefings` AI + 외부 데이터(이미 oracle 인프라 있음) → `resolve_market(market_id, outcome)`.
- **Live Studio Auto-Clip**: `/live` 영상에서 60s Crown 폭발/Baron 승급/대형 출금 순간 자동 클립 → `live_clips` 테이블 + Twitter/X 자동 게시(`x-post-bot` edge, 운영자 토큰).
- **AS SEEN ON 강화**: `inbound_press_hits` 자동 큐레이션 → 홈 마키 + `/press` 페이지(언론사 로고 + 헤드라인 원문 링크).

성공 지표: 주 3+ 외부 언급 캡처, 트위터 자동 클립 평균 1k+ 노출, prediction 마켓 일일 거래액 10M PHON.

## 4. Phase Ω-4 — Personal Identity Loop (Week 4~5)

"내 캐릭터가 내 SNS 프로필이 되게 한다." Avatar/NFT의 외부화.

- **/u/<nickname> 공개 프로필**: Empire 티어 / Crown 폭발 history / NFT 컬렉션 / 누적 수익(마스킹) — 외부 공유 가능. 동적 OG.
- **NFT Showcase 외부 임베드**: `<iframe src="/embed/nft/<id>">` 1줄로 디스코드/노션/블로그 임베드.
- **Achievement Mint**: 특정 마일스톤(첫 Baron / 100 Crown / Vault 1M) 달성 시 한정 NFT 자동 발급 + 공개 갤러리.
- **Cross-poster (opt-in)**: Crown 폭발/Baron 승급 시 본인 X/Threads에 자동 포스트(OAuth 1회).

성공 지표: 공개 프로필 외부 referrer 월 5만+, 임베드 1,000개+, 자발적 cross-post 일 200+.

## 5. Phase Ω-5 — Crush Layer (Week 5~6)

경쟁사가 못 따라오게 잠금.

- **TradFi Settlement Receipt**: 모든 출금 완료 시 PDF 영수증(거래시각 + UTC + oracle median + 서명 hash) 자동 발급. /trust에서 누구나 hash 검증 가능 (`verify_settlement_receipt(hash)`). Stake·Rollbit이 못 흉내내는 신뢰 한 방.
- **Public Status Page** `/status`: oracle quorum, kernel inflight, payout p50/p99(`get_payout_ops_stats_24h`), uptime 7d. 거래소 수준 투명성.
- **Open Metric Endpoint**: `/api/public/metrics` (TVL, 24h volume, payouts) — 외부 dashboard·트래커가 자유 사용 → 백링크 자동.
- **Bug Bounty Page** `/security/bounty`: HackerOne 스타일 (직접 운영, severity별 PHON 상금). 공개 명예의 전당 = 보안 신뢰 증명.

성공 지표: 출금 영수증 외부 공유 일 100+, status 페이지 외부 임베드, bounty 유효 보고 월 5+.

---

## 6. 우선순위 & 의존도

```text
Ω-1 (i18n+SEO) ──┐
                 ├─→ Ω-3 (Headline) ─→ Ω-4 (Identity) ─→ Ω-5 (Crush)
Ω-2 (Money Loop)─┘
```

- Ω-1과 Ω-2는 병렬. 둘 다 done 후 Ω-3.
- Ω-5는 항상 마지막 — 앞 단계들의 신뢰가 쌓여야 의미.

## 7. 측정 (북극성 지표)

| 단계 | KPI | 목표 (6주) |
|------|-----|-----------|
| Ω-1 | 비-KR organic sessions/d | 5,000 |
| Ω-2 | Vault TVL (PHON) | 100M |
| Ω-3 | Prediction 일거래액 | 10M PHON |
| Ω-4 | 공개 프로필 외부 referrer/mo | 50,000 |
| Ω-5 | 영수증 검증 호출/d | 500 |

전체: **MAU ×3, ARPDAU ×2, 외부 백링크 ×5, "한국에서 운영되는 글로벌 사이트" 포지셔닝 확립.**

## 8. 기술 노트 (요약)

- 신규 테이블: `prediction_markets`/`market_orders`/`vault_positions`/`referral_payouts_v2`/`sponsored_whale_bids`/`live_clips`/`settlement_receipts`/`achievement_mints`.
- 신규 edge: `og-image-renderer`/`x-post-bot`/`settle-vault-daily`/`resolve-market`/`auto-clip-live`.
- 신규 RPC: `get_public_metrics`/`verify_settlement_receipt`/`get_status_page_snapshot`.
- 모든 신규 코드는 `@pkg/*` alias에 작성(Sprint 0 규칙).
- AI 모델: 시장 정산/헤드라인은 `google/gemini-2.5-flash`(가성비), 영수증 hash signing은 edge secrets.
- 보안: 모든 신규 admin RPC는 `AdminAal2Gate` + permission baseline 등록.

## 9. 명시적 비대상 (Out of Scope)

- 자체 토큰/체인 발행 (규제 리스크, 6주 내 무리).
- 풀스택 모바일 앱 (PWA로 우선 충분).
- 라이브 딜러 카지노 (라이센스 비용 vs ROI 비합리).
- Stripe/PG 자동 결제 — `mem://constraints/payment-routing` 위반.
