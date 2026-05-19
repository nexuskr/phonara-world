# Phase 2 — Provably Fair v2

Shared fairness substrate for all 7 AETHER games. Zero money-flow touch. Pure verification layer that game engines (Phase 3+) will plug into.

## Scope

- New `imperial_pf_server_seeds` table (commit/reveal log, append-only).
- 3 SQL RPCs: `imperial_pf_commit`, `imperial_pf_reveal`, `imperial_pf_verify`.
- Client core hook + crypto helpers (`@pkg/games/core/pf`).
- Wire existing `ProvablyFairBadge` + new `FairnessVerifier` modal.
- Per-game `engine/pf.ts` adapter stubs (no game logic yet).

Money-flow files (`imperial_place_phon_bet`, `imperial_settle_*`, `_apply_house_edge_split`, treasury ledger, withdrawal, swap, staking) — **not touched**. Git diff target = 0 on the 8 protected paths.

## Database

Migration: `supabase/migrations/20260520_aether_phase2_pf_v2.sql`

```text
imperial_pf_server_seeds
  id              bigserial PK
  game            text  NOT NULL              -- 'crash'|'mines'|'plinko'|'dice'|'limbo'|'keno'|'wheel'
  round_id        bigint NOT NULL
  server_seed     text  NOT NULL              -- 64-hex, hidden until reveal
  server_seed_hash text NOT NULL              -- sha256(server_seed)
  nonce_start     bigint NOT NULL DEFAULT 0
  committed_at    timestamptz NOT NULL DEFAULT now()
  revealed_at     timestamptz
  UNIQUE (game, round_id)
  INDEX (game, committed_at DESC)
```

RLS:
- SELECT: authenticated — only `server_seed_hash`, `revealed_at`, `nonce_start`, `committed_at` via view `imperial_pf_public`. Raw `server_seed` only via RPC after reveal.
- INSERT/UPDATE: blocked to clients. Only SECURITY DEFINER RPCs.

RPCs (all `SECURITY DEFINER`, `search_path = public`, `auth.uid()` gated):

1. `imperial_pf_commit(p_game text, p_round_id bigint) → text`
   - Generates `server_seed = encode(gen_random_bytes(32), 'hex')`.
   - Hash = `encode(digest(server_seed, 'sha256'), 'hex')`.
   - Inserts row, returns `server_seed_hash`. Idempotent on `(game, round_id)` — returns existing hash if already committed.

2. `imperial_pf_reveal(p_round_id bigint, p_game text) → text`
   - Sets `revealed_at = now()` if null. Returns `server_seed`. Safe to call multiple times.

3. `imperial_pf_verify(p_seed text, p_hash text, p_nonce bigint) → boolean`
   - Pure: `digest(p_seed,'sha256') = p_hash`. Returns boolean. No table touch.

Permission baseline: add these 3 to `function_permissions_baseline` (user-callable, gated by `auth.uid() IS NOT NULL`). `check_permission_drift()` must stay at 0.

## Client

```text
src/packages/games/core/pf/
  index.ts                 -- re-exports
  crypto.ts                -- sha256Hex, hmacSha256Hex (Web Crypto)
  rng.ts                   -- bytesToFloats, floatToInt (HMAC-SHA256 stream, Stake-compatible)
  useProvablyFair.ts       -- hook: commit(game, roundId), reveal(roundId), verify(seed,hash,nonce)
                              subscribes via useGameChannel(`pf:${game}:${roundId}`) for reveal broadcasts

src/packages/games/core/ui/
  FairnessVerifier.tsx     -- modal: paste seed+hash+nonce, live verify, copy buttons
                              uses Dialog + imperial-card + gradient-gold
  ProvablyFairBadge.tsx    -- (already exists from Phase 1) — extend onClick to open FairnessVerifier
```

Hook contract:
```ts
const { commit, reveal, verify, state } = useProvablyFair(game, roundId);
// state: { hash?: string, seed?: string, revealedAt?: string, verified?: boolean }
```

All calls go through `supabase.rpc('imperial_pf_commit'|'imperial_pf_reveal'|'imperial_pf_verify', ...)`. No direct table access.

## Per-game engine stubs

For each of `crash, mines, plinko, dice, limbo, keno, wheel`:

```text
src/packages/games/<game>/engine/pf.ts
  export const PF_GAME = '<game>';
  export async function preparePfRound(roundId): Promise<{hash}>
  export async function revealPfRound(roundId): Promise<{seed}>
  // pure outcome derivation hook — wired in Phase 3+
```

No game runtime yet — these are typed shells for Phase 3 to import.

## UI integration

- `ProvablyFairBadge` rendered inside `GameHUD` slot for each game (Phase 3+ wiring). Style: `imperial-card` + `bg-gradient-gold` + `imperial-pulse-dot` when hash is committed but not revealed.
- Click → `<FairnessVerifier open seed? hash? nonce?>` modal.
- Modal honours `prefers-reduced-motion` (no shimmer, no pulse).

## Merge gates

1. `git diff` on money-flow whitelist (8 paths) = 0 — verified by existing `scripts/check-money-flow-freeze.*`.
2. `check_permission_drift()` = 0 after baseline insert.
3. `bun run size-limit` PASS (PF code lives in lazy game chunks).
4. ESLint PASS (no raw `supabase.channel`, no direct sonner).
5. House-edge simulation untouched (PF is verification only) — re-run existing 5000-spin script as sanity, must stay 6.0–6.4%.

## Out of scope (Phase 3+)

- Actual game RNG consumption from server seed + client seed + nonce.
- Round lifecycle integration into bet placement.
- Client seed rotation UI.

## File list

New:
- `supabase/migrations/20260520_aether_phase2_pf_v2.sql`
- `src/packages/games/core/pf/index.ts`
- `src/packages/games/core/pf/crypto.ts`
- `src/packages/games/core/pf/rng.ts`
- `src/packages/games/core/pf/useProvablyFair.ts`
- `src/packages/games/core/ui/FairnessVerifier.tsx`
- `src/packages/games/{crash,mines,plinko,dice,limbo,keno,wheel}/engine/pf.ts` (7 files)

Edited:
- `src/packages/games/core/ui/ProvablyFairBadge.tsx` — open FairnessVerifier on click
- `src/packages/games/core/index.ts` — re-export pf module
