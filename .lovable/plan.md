# ApexForge Hybrid Overlay — Phonara 위에 7-Tab 신설

## 결정 사항 (사용자 답변 반영)
- **스택**: 현재 React 18 + Vite + Supabase 100% 유지. Next.js/Nx/NestJS/Rust gRPC/PixiJS/Kafka는 불가능. 시각·UX만 ApexForge 톤으로 끌어올린다.
- **기존 시스템**: Phonara/Imperial Duel/Empire/Flywheel/VIP Pass/PHON 출금 — git diff = 0, 머니플로 8경로 무변경.
- **신규 페이지**: 모두 mock 또는 기존 RPC 재포장. 실제 Solana cNFT/Arweave/Helius는 안 함 → `MIGRATION.md`에 "FUTURE" 마커로만 명세.
- **보상**: 신규 미션 보상은 전부 기존 PHON 잔액으로 지급 (`grant_phon_for_*` 패턴 따름). 신규 출금 경로 없음.

## 신규 7 탭 (`/apex/*` prefix, 기존 라우트 보존)

| 탭 | 라우트 | 핵심 | 구현 베이스 |
|---|---|---|---|
| Home (ApexForge Hero) | `/apex` | Daily Vault 카운트다운 + 빅윈 피드 + Free Money 마키 | `WhaleStrikeRail` + `LivePayoutCounter` 재활용 |
| Free Money (부업) | `/apex/free` | 7개 일일 미션 + 즉시 PHON 지급 + 친구 추천 2단 보상 + 한국 부업 리더보드 | 신규 `free_missions` 테이블 + `claim_free_mission` RPC |
| Daily Vault | `/apex/vault` | KST 00:00 자동 갱신 + Pity + Streak + 골드 박스 오픈 애니 | 신규 `daily_vault_claims` + `claim_daily_vault` RPC (cron) |
| Win Reels | `/apex/reels` | TikTok-식 세로 스와이프, 빅윈 자동 모션 카드 | `get_whale_strikes_24h` 데이터로 풀스크린 reels |
| NFT Lootbox (mock) | `/apex/lootbox` | Basic/Premium/Ultimate 3티어 카드 오픈 시각화, "FUTURE: Bubblegum V2" 주석 | 기존 `nft_collection` + 신규 `mock_lootbox_open` RPC |
| Sportsbook (mock) | `/apex/sports` | 가상 라이브 odds + multi-bet 슬립 (실제 정산 없음, demo) | 신규 `sports_mock_events` seed + 클라 only |
| My Apex | `/apex/me` | Streak·미션·24h Story·지갑 진입 | 기존 컴포넌트 컴포지션 |

기존 메뉴(`Home/Earn/Games/Trade/Live`)는 그대로 유지 — `PhonaraNav`에 ApexForge 탭 추가 모드(localStorage 토글 `apex:nav_mode`).

## 디자인 시스템 (Stake 압도)
- 신규 토큰: `--apex-neon: 152 100% 50%` (#00FF9F), `--apex-magenta: 300 100% 50%`, `--apex-black: 0 0% 4%`.
- 추가 유틸: `.apex-glass`, `.apex-glow-neon`, `.apex-glow-magenta`, `.apex-particle-burst` (`canvas-confetti` lazy).
- `index.css`에 `:root[data-theme="apex"]` 토큰 오버라이드 + `<ApexThemeProvider>` (URL `/apex/*` 시 자동 적용).
- 기존 Imperial Gold 토큰은 절대 수정 안 함.

## 데이터베이스 변경 (마이그레이션 1건)

```text
free_missions(id, code, title_ko, reward_phon, daily_cap, active)
free_mission_claims(user_id, mission_code, claimed_at, reward_phon)  -- unique(user_id, mission_code, date)
daily_vault_state(user_id, last_claim_date, streak, pity_counter)
daily_vault_claims(id, user_id, claimed_at, reward_phon, rarity)
mock_lootbox_opens(id, user_id, tier, result_json, opened_at)
sports_mock_events(id, sport, home, away, starts_at, odds_json)  -- seed only
```

RPC: `claim_free_mission(code)` / `claim_daily_vault()` / `open_mock_lootbox(tier)` — 모두 `grant_phon_for_*` 패턴, AAL 가드, idempotent, 일/회 cap.

## 라우팅 & 코드 위치
- `src/pages/apex/{Index,FreeMoney,Vault,Reels,Lootbox,Sports,Me}.tsx` 신규.
- `src/packages/apex/{components,hooks,lib}/*` — 신규 도메인 코드는 전부 여기 (`@pkg/*` alias 신설).
- `src/App.tsx`에 lazy route 7개 추가.
- 기존 `src/pages/*` 무변경.

## PWA (이미 일부 있음)
- 기존 manifest 4개(ko/en/ja/vi) 유지, `display: standalone` 확인만.
- Service Worker는 PWA 가이드 준수: 프리뷰/iframe 가드 + `NetworkFirst HTML` + `/~oauth` denylist. 신규 SW 추가 안 함 (기존 `public/sw.js` 유지).

## MIGRATION.md (별도 산출물)
프로젝트 루트에 작성. Nx + NestJS + Prisma + BullMQ + Redis + Rust gRPC(Tonic) + Helius DAS + Arweave(Bundlr) + Bubblegum V2 + OpenTelemetry Tempo 단계별 이전 절차. 현재 mock 레이어 → 실 서비스로 교체할 파일/RPC 목록 표.

## 비범위 (안 함)
- Next.js/Nx 전환, NestJS 도입, Rust WASM/gRPC, PixiJS v8, 실제 Solana 트랜잭션, Arweave 업로드, Helius 호출, 1000x 실거래 perp, 실제 sportsbook 정산, 신규 출금 경로, 한국 무료 부업의 현금성 보상(=전부 in-game PHON으로 통일).
- 리브랜딩 전면 교체 (Phonara 브랜드 유지, `/apex` 서브브랜드).

## 작업 순서 (체크포인트)
1. DB 마이그레이션 + RPC 6종 + RLS.
2. `@pkg/apex` 스캐폴드 + 테마 토큰 + `ApexThemeProvider`.
3. `/apex` Hero + Daily Vault + Free Money (가장 큰 ROI).
4. Win Reels + NFT Lootbox(mock) + Sportsbook(mock) + My Apex.
5. PhonaraNav 토글 + 진입 배너.
6. `MIGRATION.md` 작성.
7. QA: 머니플로 8경로 git diff = 0 검증, bundle budget, operator isolation.
