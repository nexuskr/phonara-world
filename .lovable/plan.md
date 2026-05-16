# Olympus Legacy 5000 — New Flagship Signature Slot

Add an 8th Signature Slot, "Olympus Legacy 5000", as the new crown jewel. It plugs into the existing single-engine architecture (`OlympusSlot` + `SlotSignatureWrapper`) the same way Cosmic Forge 5000 does — zero changes to the reel engine, zero new logic hooks.

## Design Direction — "Warm Olympus Luxury"

- Palette: deep night blue base + rich warm amber gold (`hsl(45 90% 60%)`), soft marble white, gentle luxurious glow
- Lightning: warm golden amber only — never cold blue
- Vibe: Trump-level hype on the 5000× moment, Musk-level particle precision, Korean 50–70s dignified luxury

## What gets built

### New files
- `src/components/slots/OlympusLegacyCanvas.tsx` — animated background
  - 2-layer parallax warm clouds (slow drift)
  - Marble pillar silhouettes (low-opacity)
  - Random golden amber lightning bolt every 8–14s (lightning path procedurally generated)
  - `prefers-reduced-motion` → static gradient only
  - Pauses on `document.hidden`; RAF budget capped (≤16ms even during lightning burst)
- `src/components/slots/OlympusLegacyPaytableSheet.tsx` — 6-column paytable
  - Zeus Multiplier Ladder: `2 / 5 / 12 / 30 / 80 / 200 / 500`
  - Free Spins tiers: `10 / 15 / 20 / 25`
  - Lightning Wild rules + cluster-tumble explanation
  - Reuses `BasePaytableSheet` shell for sheet/trigger consistency
- `src/components/celebration/OlympusLegacyMaxWinOverlay.tsx` — 5000× cinematic
  - Phases: 320ms screen-shake → 1.2s 0.4× slow-mo → 200+ golden particles → Zeus silhouette fade-in → CTA
  - Auto Crown award at `≥4000×` via existing `useEmpireCrown` payload (idempotent dedupe by spinId)
  - Built on `BaseMaxWinOverlay` so trigger plumbing is unchanged
- `src/pages/casino/OlympusLegacy5000.tsx` — page wrapper, identical shape to `CosmicForge5000.tsx`

### Edits
- `src/components/slots/themes.ts` — add `OLYMPUS_LEGACY_THEME`
  - `gameCode: "olympus_legacy_5000"`, `maxMultiplier: 5000`, `volatility: "high"`
  - Warm amber `reelFrameClass`, `spinStreakClass`, new `OLYMPUS_LEGACY_PATTERN`
  - `bonusKind: "cluster_tumble"`, `symbolPack: "olympus"`, `soundPack: "olympus"`
- `src/lib/sounds/soundConfig.ts` — add `olympus_legacy` + `olympus_legacy_5000` to `SLOT_ID_TO_THEME`, `SLOT_SOUND_MAP`, and `SLOT_ID_TO_SOUND_KEY` (reuse olympus pack)
- `src/lib/empireConfig.ts` — extend `EmpireSlotKey` with `"olympus_legacy"`, set `SLOT_CROWN_WEIGHT.olympus_legacy = 1.6` (highest), add alias entries
- `src/App.tsx` — `lazy()` import + route `/casino/olympus-legacy-5000`
- `src/pages/Casino.tsx` — add lobby card (if a card list exists in that file)

## Architecture Compliance

- No new slot folder, no new logic hook
- All differences delivered through `themes.ts` + custom Background + PaytableSheet + MaxWinOverlay
- `cluster_tumble` `bonusKind` reuses existing bonus pipeline for the 6×5 tumble / multiplier-orbs / free-spin / lightning feel — base reel engine untouched
- Zero edits to `OlympusSlot.tsx`, `SlotSignatureWrapper.tsx`, `SoundManager`, `WinCelebrationManager`

## Performance Budget

- Canvas: single RAF loop, offscreen path cache for lightning, capped DPR=2, pause on hidden tab
- MaxWinOverlay: `React.lazy` import, particle count auto-throttled on mobile (200 desktop / 120 mobile), GPU `will-change: transform`
- Full `prefers-reduced-motion` paths on canvas + overlay
- No re-renders on existing 7 slots — they don't import anything new

## Open question

- **Background image**: existing slots reference `@/assets/slots/<key>/bg.jpg` + `logo.png`. Olympus Legacy can either (a) reuse the existing `assets/slots/olympus/` art, or (b) wait for a new amber-gold hero asset. Plan ships with option (a) so it works immediately; new art can drop in later by changing two import lines in `themes.ts`.
