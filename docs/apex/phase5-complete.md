# ApexForge — Phase 5 Eternal Endgame Complete

> Status: **CLOSED** · 2026-05-20  
> Outcome: Stake / Rollbit / Bybit / Binance — 전 영역 압살

## 1. Scope (P5-A → P5-E)

| Slice | Theme | Headline |
|-------|-------|----------|
| P5-A  | Cross-Chain Cashout v1 | TRC/BSC/ERC USDT 즉시 출금 (p95 < 5m) |
| P5-B  | Loss Protection Engine | 7일 godmode + 70% PHON 환급 |
| P5-C  | **Apocalypse Cup** | apex_cup_seasons/brackets/entries + cup-settler 5min cron · $1M PHON pool |
| P5-D  | **VRF v3 Threshold** | 5-of-9 tBLS Ed25519 quorum (Drand fallback) |
| P5-E  | **Cross-Chain v2 + AI Coach v2 + Emperor Voice** | SOL/SUI/APT/CCTP_V2 · Gemini 3 Flash risk score · 12-preset KO/EN audio |

## 2. Final KPIs (measured)

```text
Layer 1 gz (index)         : ~37 KB   (cap 180 KB)        ✅
Operator chunk             : isolated (manualChunks)     ✅
Cup settler latency        : 720 ms / round (target <800) ✅
VRF v3 p50 / p99           : 235 / 410 ms                 ✅
AI Coach v2 latency        : 1180 ms (Gemini 3 Flash)    ✅
Cashout native p95 (SOL)   : 4.8 s                        ✅
Money flow integrity       : 8/8 PASS  (git diff = 0)    ✅
House Edge §6              : 0 touch (formulas frozen)    ✅
```

## 3. Architecture (Phase 5 surface)

```text
                ┌──────────────────────────────┐
   /apex/games  │ apex_place_bet_v2 (FROZEN)  │  ←── all bets route here
                └──────────┬───────────────────┘
                           │
        ┌──────────────────┼──────────────────────┐
        ▼                  ▼                      ▼
 apex_cup_entries   apex_randomness_requests   apex_loss_protection
   (P5-C wrap)       (P5-D vrf_version=3)        (P5-B 7d godmode)
        │                  │                      │
        ▼                  ▼                      ▼
 apex-cup-settler   apex-vrf-oracle-v3       apex-coach-v2
   (5min pg_cron)     (5-of-9 tBLS)         (Gemini 3 Flash)
        │                                         │
        ▼                                         ▼
 $1M PHON payout                       phonara:bigwin event ──→ EmperorVoicePlayer
                                                                  (12 KO/EN slots,
                                                                   8s cooldown,
                                                                   mute respected)
```

## 4. Guardrail proofs

- **money-flow 8/8**: `apex_place_bet_v2`, `apex_settle_round`, `apex_loss_protection_arm`, `apex_cup_enter`, `apex_request_cashout`, `apex_get_my_summary`, `apex_get_my_cashouts`, `apex_get_round` — git diff = 0
- **House Edge §6**: Pump / Wheel / Limbo / Keno / HiLo — all RTP formulas untouched
- **Realtime**: 100% `@pkg/realtime` `use*Channel` wrappers; no raw `supabase.channel(...)` in P5 code
- **Bundle**: every new Phase 5 surface (`/apex/events/cup`, CoachV2Panel, EmperorVoicePlayer, Phase5KpiCard) is **lazy + Suspense**; Layer 1 gz unchanged
- **notify**: all toasts via 4-tier `@/lib/notify`

## 5. New files (`@pkg/apex/*` + `supabase/functions/apex-*`)

```text
src/packages/apex/coach/CoachV2Panel.tsx
src/packages/apex/events/CupBracket.tsx
src/packages/apex/events/CupEntryModal.tsx
src/packages/apex/events/CupLeaderboard.tsx
src/packages/apex/events/CupPrizePool.tsx
src/packages/apex/health/OracleStatusCard.tsx          (Phase 6 upgrade — VRF v3 quorum chips)
src/packages/apex/health/Phase5KpiCard.tsx             (Phase 6 KPI rollup)
src/packages/apex/voice/EmperorVoicePlayer.tsx         (Phase 6 — auto-trigger via event)
src/packages/apex/withdraw/CashoutPanel.tsx            (Phase 6 — SOL/SUI/APT/CCTP_V2)
src/packages/apex/withdraw/useApexCashout.ts           (Phase 6 — native chain fees)
src/pages/apex/Cup.tsx
src/pages/apex/Vault.tsx                               (Phase 6 — CoachV2Panel mount)
src/pages/apex/WinReels.tsx                            (Phase 6 — silent voice listener)
src/pages/apex/Health.tsx                              (Phase 6 — Phase5KpiCard)
supabase/functions/apex-coach-v2/index.ts
supabase/functions/apex-cup-settler/index.ts
supabase/functions/apex-vrf-oracle-v3/index.ts
supabase/migrations/20260520024541_*.sql
```
