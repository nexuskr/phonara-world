# @pkg/games — Phonara Imperial Game Library

AAA native casino games. AETHER 7 import target.

## Rules (NON-NEGOTIABLE)

1. **Money-flow git diff = 0.** Every bet/settle MUST go through existing
   `imperial_place_phon_bet` / `_apply_house_edge_split(45/35/15/5)` /
   `imperial_kill_switches` trigger path. Use `<BetSlipBridge />` — never
   construct your own bet RPC call.
2. **Imperial tokens only.** No raw hex, no `bg-yellow-*`, no `text-white`.
   Use `imperial-card`, `gradient-gold`, `text-gradient-gold`, `pulse-halo`,
   `glow-gold`, `imperial-glow`, `low:` / `mid:` / `high:` variants.
3. **Realtime via `useGameChannel`.** No `supabase.channel()`.
4. **Toast via `@/lib/notify`.** No `sonner` direct import.
5. **Sound/Haptic via `useSlotSound` / `useImperialThunderWithReverb` / `@/lib/haptics`.**
6. **Per-game budget ≤ 60KB gz.** Each game = own `games-<name>` manualChunk.
7. **Provably Fair** — every round MUST surface `<ProvablyFairBadge />`.

## Structure

```
@pkg/games/
  core/
    ui/           ← 12 primitives (Phase 1)
    engine/       ← RNG, pool, ticker, fair (Phase 2+)
    hooks/        ← useGameFrame, useViewportPause, ...
    constants.ts
    manifest.ts   ← AETHER 7 registry
    index.ts
  <kebab-game>/
    index.ts
    components/
    hooks/
    engine/
    ui/
    constants.ts
```

Pages live at `src/pages/games/<PascalGame>.tsx` and lazy-load
`@pkg/games/<kebab-game>`.
