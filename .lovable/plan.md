# Crash Game — Fairness, History, Flow & Perf Upgrade

Four focused improvements to `/crash` so players can verify outcomes, review their history, trust the bet/cashout flow, and play smoothly on low-end phones.

## 1. Provably-fair verification panel (per round)

- New backend RPC `crash_get_round_proof(_round_id uuid)` returning `{ id, seed_hash, seed_revealed_value, crash_multiplier, status, crashed_at }`. Only returns `seed_revealed_value` when `status='crashed'` (seed already revealed in table). Schema note: current table has `seed` + boolean `seed_revealed`; RPC returns `seed` only when `seed_revealed=true`.
- New `src/components/crash/FairnessPanel.tsx`:
  - Shows committed `seed_hash` (truncated + copy button).
  - After crash: shows revealed `seed`, recomputes SHA-256 via existing `src/lib/slots/fairness.ts#sha256Hex`, displays "Hash matches" or mismatch.
  - Displays formula `m = floor(1/(1-h)*0.97 * 100)/100` (or actual server formula — read from `_crash_compute_multiplier`) and the recomputed expected multiplier compared with `crash_multiplier`.
  - "How it works" collapsible 50–70대 친화 한글 설명.
- Mounts on `/crash` under the canvas as a collapsible card. Auto-loads the most recently crashed round; updates via `crash_rounds` realtime UPDATE where `status='crashed'`.

## 2. Crash History page (`/crash/history`)

- New RPC `crash_get_my_history(_limit int, _offset int, _filter text)` — `_filter ∈ ('all','won','lost','cashed','busted')`. Returns rows joined: `round_id, seed_hash, crash_multiplier, crashed_at, bet_phon, auto_cashout, cashed_out_at_multiplier, payout_phon, won, bonus_mult`.
- New page `src/pages/CrashHistory.tsx` (lazy route in `App.tsx`):
  - Header summary chips: total bets, win rate, net P/L, best multiplier (reuse `crash_get_my_stats`).
  - Filter pills: 전체 / 캐시아웃 성공 / 폭발 / 오늘 / 7일.
  - Virtualized-ish list (simple windowing OK, ~50 per page) with each row: time, round hash short, crash mult (color), my bet, cashout x, payout, P/L badge. Tap row → expand to embedded `FairnessPanel` for that round.
  - "내역 없음" via `<EmptyState />`; loading via `<LoadingList />`.
  - CSV export button using existing `src/lib/csv.ts`.
- Link from `/crash` header ("내 기록 →") and Crash row in main nav gets a secondary submenu.

## 3. Bet & Cashout flow — pending/loading/confirmation

- In `src/pages/Crash.tsx`:
  - Introduce explicit local states: `betState: 'idle'|'submitting'|'placed'|'cashing'|'paid'|'lost'`.
  - Bet button: spinner + "베팅 중…" while submitting; on success → "✅ 베팅 완료 · 라운드 시작 대기" pill, disabled.
  - Cashout button: while running, shows `💰 캐시아웃 {mult}x` with subtle pulse; on click → spinner "정산 중…" (locks button to avoid double-tap); on resolve → toast `✅ 정산 완료 · +{payout} PHON (round #{shortHash})` plus inline confirmation card showing payout, multiplier, new PHON balance (refetch via `walletRefresh`).
  - Round crash without cashout → inline red card "💥 이번 라운드 폭발 · 다음 라운드 자동 베팅?" with one-tap rebet.
  - All errors surfaced through `friendlyError()` (already exists) via `notify.error`.
  - Optimistic UI guard: disable bet input + quick chips when `betState !== 'idle'`.
- Server-side guarantee surfacing: after cashout, refetch `crash_bets` row by `round_id` for `won=true` and `payout_phon>0` before flipping to `paid`. If realtime lags, fallback poll once after 1.2 s.

## 4. Canvas & motion perf + accessibility

- `CrashCanvas.tsx` refactor:
  - Pause RAF when document hidden (`visibilitychange`) and when canvas off-screen (`IntersectionObserver`).
  - Detect low-end: `navigator.hardwareConcurrency <= 4 || devicePixelRatio < 2 || matchMedia('(max-width: 480px)')` → cap DPR to 1, particles 30, stars 40, skip glow shadows.
  - Respect `prefersReducedMotion()` (already in `src/lib/haptics.ts`): freeze rocket trail to static gradient line, no particle spawn, no flash.
  - Pool particles array (reuse objects instead of splice/push to reduce GC).
  - Replace per-frame `createLinearGradient` with cached gradient rebuilt on resize only.
- Settings: new `src/components/crash/CrashSettingsSheet.tsx` (gear icon on Crash header):
  - 진동 (haptics on/off) — wired to existing `isHapticsEnabled`/`setHapticsEnabled`.
  - 모션 줄이기 (force reduced motion override, stored `phonara:crash_reduced_motion:v1`).
  - 사운드 (mute toggle, persisted).
  - 저사양 모드 (force low-end path).
- Haptics integration in `Crash.tsx`: `haptics.select()` on bet placed, `haptics.win()` on cashout success, `haptics.error()` on crash without cashout.

## Files

Created
- `src/components/crash/FairnessPanel.tsx`
- `src/components/crash/CrashSettingsSheet.tsx`
- `src/pages/CrashHistory.tsx`

Edited
- `src/pages/Crash.tsx` (flow states, settings button, fairness mount, history link, haptics)
- `src/components/crash/CrashCanvas.tsx` (perf, reduced motion, low-end, pooling)
- `src/lib/crash.ts` (add `getRoundProof`, `getMyHistory` wrappers + types)
- `src/App.tsx` (lazy `/crash/history` route)

Migration
- Add `crash_get_round_proof(uuid)` and `crash_get_my_history(int, int, text)` SECURITY DEFINER with `set search_path = public`, `GRANT EXECUTE ... TO authenticated`. Update `mem://features/rpc-drift-fix-2026-05-16` follow-up note for the new signatures.

## Rules respected

- Design tokens only (`--gold`, `--pink`, `--card`, `--text`, `--muted`, `--orange` already present).
- 44px+ touch targets, mobile-first, 50–70대 친화 카피.
- Framer-motion 0.2–0.3s only; honors `prefers-reduced-motion`.
- No new libraries.
- Zero regression to existing Crash flow.
