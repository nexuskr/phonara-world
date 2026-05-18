# Phase 3.5 Hardening — Limited Rollout Production Readiness

Phase 3.5 Deflationary Flywheel이 Complete된 상태에서, 실제 돈이 오가는 Limited Rollout으로 안전하게 진입하기 위한 최종 Hardening 슬라이스. Money-flow 8경로는 git diff = 0 절대 유지, Operator Isolation 유지, 모든 신규 객체는 `imperial_` prefix.

## 작업 순서 (Safety → Burn+NFT → Cinematic → Rollback → Admin → Rollout)

### 1) Global Safety & Emergency Freeze
- 신규 테이블 `imperial_kill_switches(key text pk, enabled bool, reason text, updated_at, updated_by)` — admin-only RLS
- 기본 row: `imperial_betting`, `imperial_flywheel`, `imperial_withdrawal`, `imperial_burn`, `imperial_nft_mint` (모두 OFF)
- RPC: `emergency_freeze_all(reason)` / `emergency_unfreeze_all(reason)` (AAL2 + admin) → 모든 imperial_* 스위치 일괄 ON/OFF, `imperial_kill_switch_audit` immutable log
- 기존 `imperial_place_phon_bet` / `imperial_settle_phon_bet` SQL **건드리지 않음** — 대신 `imperial_duel_rooms.emergency_freeze_flag` 와 새 스위치를 OR로 묶는 헬퍼 `imperial_is_betting_allowed()` 추가, 기존 트리거 가드 1줄만 확장
- Hook: `useImperialKillSwitches()` (15s + realtime, wallet/admin partition)

### 2) Optimized Token Burn + NFT Synergy
신규 테이블 (모두 append-only immutable, admin SELECT, self SELECT own):
- `imperial_token_burns(id, user_id, source enum[house_edge|volatility|near_miss|manual], base_amount, burn_rate, burn_amount, ref_id, ref_type, meta jsonb, created_at)`
- `imperial_user_nfts(id, user_id, tier 1..5, lifetime_burn, mint_event_id, last_upgraded_at)` — unique(user_id)
- `imperial_nft_audit(id, user_id, from_tier, to_tier, lifetime_burn, reason, created_at)`

RPC (모두 SECURITY DEFINER, internal 호출):
- `apply_token_burn(_user, _source, _base, _ref_id, _ref_type)` → rate 결정 + insert + `_maybe_upgrade_nft(_user)` 호출, idempotent on (source, ref_id, ref_type) unique
- Burn rate constants in `imperial_flywheel_params` (hot-reload):
  - `house_edge` 26%
  - `volatility_extra` per tier: calm 0.8 / warm 1.2 / hot 1.8 / surge 2.4 / extreme 3.2 (%)
  - `near_miss_strong` 12~22% (RNG 결정)
- `_apply_house_edge_split` **변경 없이** burn leg 직후 `apply_token_burn(user, 'house_edge', burn_amount, ref_id, 'settle')` 추가 호출 — split 자체 4-leg는 그대로 (rollback 영향 0)
- `get_burn_leaderboard(_limit)` 공개 RPC + 자기 순위
- NFT 5 tier thresholds (lifetime PHON burned):
  1. Ember Witness — 1,000
  2. Flame Sovereign — 25,000
  3. Pyric Marshal — 250,000
  4. Eternal Sacrifice — 2,500,000
  5. Imperial Ascendant — 25,000,000
- Tier별 perks meta (revenue_share_bps, yield_boost_bps, gov_weight) — DB 상수 + 클라 미러 `src/lib/imperialNft.ts`

### 3) Cinematic Visual + Thunder Reverb Audio
신규 컴포넌트:
- `src/components/imperial/BurnRevealOverlay.tsx` — 5 tier별 Framer Motion 시퀀스 (Ember pulse → Flame pillar → Pyric vortex → Eternal rift → Mythic thunder)
- `src/components/imperial/MythicThunder.tsx` — lightning bolts (SVG path stroke-dashoffset), screen shake, particle storm (canvas, low-end fallback → static glow)
- `src/components/imperial/NftUpgradeReveal.tsx` — Golden Rift + Dragon Flame + Crown Particle + Imperial Serif font (Cinzel/Cormorant)
- `src/hooks/useImperialThunderWithReverb.ts` — Web Audio API: white-noise burst → ConvolutionNode (procedural impulse response, 2.5s decay, hall-size), LP filter sweep, sub-bass rumble. Respect prefers-reduced-motion + `degrade_mode`.
- 모두 lazy-load, `low:hidden` / `degrade:hidden` Tailwind variant 사용, 60fps budget (transform/opacity only)

진입점:
- `RealBetSlip.tsx` 결과 처리 직후 `<BurnRevealOverlay tier={result.burnTier}/>` 마운트 (UI only)
- NFT 업그레이드는 realtime `imperial_user_nfts` UPDATE 수신 시 `<NftUpgradeReveal/>`

### 4) Rollback System
- `rollback_injection_event(_event_id uuid)` (admin AAL2)
  - FOR UPDATE lock event row
  - Snapshot pre-state → `imperial_rollback_snapshots(event_id, pre jsonb, post jsonb, created_by, created_at)`
  - Treasury/liquidity ledger reversal entries (append-only, kind='rollback', meta.original_event_id)
  - Mark `imperial_injection_events.rolled_back_at` + `rolled_back_by`
  - Emit telemetry `tlog('rollback', 'warn', ...)`
- Test: `src/__tests__/flywheel/rollback.test.ts` — inject → rollback → balances restore 검증

### 5) Admin `/admin/flywheel` (확장)
기존 `<FlywheelAdmin/>` 에 패널 추가 (단일 tab):
- Big Red **Freeze All** / **Unfreeze All** 버튼 (AAL2 confirm dialog, 사유 입력 필수)
- 개별 5개 Kill Switch row
- **Rollback** 패널 — 최근 50 injection event 테이블 + rollback 버튼 (사유 + 더블 confirm)
- 5-Tier Volatility Heatmap (이미 존재) + Burn Leaderboard Top 20
- NFT Tier Distribution donut
- 15s 자동 갱신 (`setVisibleInterval` admin category)

### 6) Limited Rollout Guardrails
- `imperial_rollout_tiers` 테이블: user_id → tier 0..3 (0=block, 3=full)
- `imperial_can_participate(_user)` SECURITY DEFINER → kill switch + rollout tier + adult gate 종합 판정
- `RealBetSlip` 진입 시 게이트: tier 0 → Risk Warning 모달, tier 1 → 일일 입금/베팅 캡 5만 PHON
- Onboarding: `<ImperialRolloutGate/>` (1회 동의 + `imperial_rollout_consents` 기록)
- CI: `scripts/check-money-flow-freeze.mjs` 통과 강제

## Technical Details

### Files (new)
```text
supabase/migrations/2026xxxx_imperial_phase35_hardening.sql
src/lib/imperialNft.ts
src/lib/imperialBurn.ts
src/hooks/useImperialKillSwitches.ts
src/hooks/useImperialThunderWithReverb.ts
src/hooks/useImperialUserNft.ts
src/components/imperial/BurnRevealOverlay.tsx
src/components/imperial/MythicThunder.tsx
src/components/imperial/NftUpgradeReveal.tsx
src/components/imperial/ImperialRolloutGate.tsx
src/components/admin/FlywheelRollbackPanel.tsx
src/components/admin/FlywheelEmergencyPanel.tsx
src/components/admin/BurnLeaderboardPanel.tsx
src/__tests__/flywheel/rollback.test.ts
src/__tests__/flywheel/burn-rates.test.ts
docs/duel/phase3.5-hardening-bible.md
```

### Files (edited — UI/admin only, money-flow 0줄)
```text
src/components/duel/RealBetSlip.tsx          // overlay mount only
src/components/admin/FlywheelAdmin.tsx       // mount new panels
src/pages/admin/Duel.tsx                     // tab labels
```

### Money-Flow FREEZE (untouched)
모든 8경로 (`useDeposit`, `useDepositRealtime`, `useDepositCountdown`, `bybit-feed`, `useCrashRound`, `MegaOrderPanel`, `use-kill-switches`, `use-auto-bet`) git diff = 0. `imperial_place_phon_bet`/`imperial_settle_phon_bet` SQL 본문 변경 없음 — split RPC 내부에서 burn 호출만 추가.

### Rollout Plan
- 모든 신규 Kill Switch **default OFF** (= 기능 비활성). Tier 0 사용자만 enable.
- 72h alpha → metrics OK 시 burn/nft ON
- Rollback drill: 첫 24h 내 1회 강제 실행 검증

### QA / Verification
- `bun run test src/__tests__/flywheel/*` (burn rate 분포 + 5000-spin edge + rollback)
- `node scripts/check-money-flow-freeze.mjs` PASS
- `node scripts/check-operator-isolation.mjs` PASS
- Lighthouse 60fps (BurnReveal tier 5 포함)
- Manual: AAL2 Freeze All → 모든 placement reject 확인

### Memory Update
신규 `mem://features/phase-3.5-hardening` + index Core 1줄.
