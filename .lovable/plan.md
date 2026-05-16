# Sugar Fever 3000 — New Signature Slot

Add a new flagship-style slot "Sugar Fever 3000" following the exact same architecture pattern as Olympus Legacy 5000. Zero regression to existing 8 slots. All differences expressed via theme + Canvas + PaytableSheet + MaxWinOverlay only.

## Scope

New slot card on Casino lobby, route `/casino/sugar-fever-3000`, warm pastel candy luxury aesthetic (soft pink + warm gold + mint + strawberry red). Shares OlympusSlot engine and `cluster_tumble` bonus pipeline. Reuses existing `olympus` symbol/sound pack as placeholder so it works immediately; assets can be swapped later.

## Files to create

1. `src/components/slots/SugarFeverCanvas.tsx`
   - Single RAF loop, DPR cap 2, pause on `document.hidden`, `prefers-reduced-motion` static fallback
   - 2-layer parallax pastel "sugar clouds", floating candy dots, soft sparkle particles (auto-throttled on mobile)
   - Warm radial glow vignette (pink → gold)

2. `src/components/celebration/SugarFeverMaxWinOverlay.tsx`
   - Built on shared celebration primitives (same pattern as `OlympusLegacyMaxWinOverlay`)
   - 3000x+ candy burst: 250 GPU particles desktop / 120 mobile, chocolate splash radial, giant lollipop + crown candy SVG, slow-mo + screen shake
   - React.lazy compatible default export, reduced-motion path = single static hero frame
   - Crown award already handled by base celebration pipeline at 2500x+ via `computeLegendaryCrown`

3. `src/components/slots/SugarFeverPaytableSheet.tsx`
   - 6-column paytable, candy symbols (Strawberry / Chocolate Bar / Rainbow Candy / Mint Drop / Golden Lollipop scatter / Multiplier Bomb)
   - Multiplier Bomb ladder 2x → 100x, Free Spins with progressive multipliers, cluster_tumble mechanics explanation
   - Warm pastel cards with gold accent borders

4. `src/pages/casino/SugarFever3000.tsx`
   - Exact wrapper mirror of `OlympusLegacy5000.tsx`: `SlotSignatureWrapper` with `slotId="sugar_fever"`, theme, Background, PaytableSheet, MaxWinOverlay, pastel flare colors, signatureLabel, themeKey

## Files to edit (additions only)

5. `src/components/slots/themes.ts`
   - Add `SUGAR_FEVER_PATTERN` (pastel dot lattice + warm radial glow)
   - Add `SUGAR_FEVER_THEME`: `gameCode: "sugar_fever_3000"`, `maxMultiplier: 3000`, `volatility: "high"`, `symbolPack: "sugar"` (falls back to olympus assets via theme `bg`/`logo` imports reusing existing slot art temporarily), `soundPack: "sugar"`, `bonusKind: "cluster_tumble"`, pastel pink + gold reel frame
   - Reuse `bgOlympus` / `logoOlympus` imports with a swap-comment block, identical to Olympus Legacy convention

6. `src/lib/sounds/soundConfig.ts`
   - Add `sugar_fever` to `SLOT_ID_TO_THEME` (mapped to `olympus` theme as placeholder)
   - Add `sugar_fever` and `sugar_fever_3000` aliases to `SLOT_ID_TO_SOUND_KEY`
   - Add `SLOT_SOUND_MAP.sugar_fever` entry (sfx: `candy_pop`, `chocolate_splash`; voice empty for elegance; legendary uses common `legendary_win`)

7. `src/lib/empireConfig.ts`
   - Add `"sugar_fever"` to `EmpireSlotKey` union
   - Add `SLOT_CROWN_WEIGHT.sugar_fever = 1.4`
   - Add `sugar_fever` + `sugar_fever_3000` aliases to ALIAS map

8. `src/App.tsx`
   - Add `const SugarFever3000 = lazy(() => import("./pages/casino/SugarFever3000"))`
   - Add `<Route path="/casino/sugar-fever-3000" element={<SugarFever3000 />} />` next to OlympusLegacy5000 route

9. `src/pages/Casino.tsx`
   - Insert lobby card at top recommended section, mirroring the Olympus Legacy 5000 card with warm pastel gradient + "NEW SIGNATURE" ribbon

## Technical notes

- No new DB tables, RPCs, or backend changes. Pure frontend additive feature.
- All colors via inline `hsl()` literals inside theme strings (consistent with existing theme file convention — semantic tokens are not used inside `themes.ts` because patterns need raw CSS gradients).
- `SugarFeverCanvas` uses `useAnimatedCanvas` hook if present, otherwise a self-contained RAF identical to `OlympusLegacyCanvas` to guarantee zero coupling.
- Mobile particle throttle: `navigator.hardwareConcurrency <= 4 || matchMedia("(max-width: 640px)")` → halve particle counts.
- Crown weight 1.4 places Sugar Fever between Cosmic Forge (1.5) and Neon Tokyo (1.4) — same tier as Neon, below Olympus Legacy flagship (1.6) by design.

## Out of scope

- New audio asset files (placeholder reuses olympus sound pack; ElevenLabs prompts can be added later in `docs/audio/elevenlabs-prompts.md`)
- New image assets (placeholder reuses olympus bg/logo; swap comment block included for later)
- Any change to the OlympusSlot engine, cluster_tumble pipeline, or other 8 existing slots
