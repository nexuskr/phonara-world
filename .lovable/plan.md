# Phase D — Slice 2: Virtual Lobby v3 + Routing + Mobile Hardening

Slice 1 (Avatar Studio + DB + Avatar3D fallback) is shipped. Slice 2 wires everything into the app and adds the FOMO-driving Virtual Lobby — without touching money-flow, operator chunks, or bundle budgets.

## Scope

### 1. Routing & navigation
- Register `/avatar/studio` and `/lobby` in `src/App.tsx` via `React.lazy` (lands in the `three3d` chunk, not Layer 1).
- Add a floating "황제의 로비" FAB to the mobile Bottom Nav linking to `/lobby`. Warm King tone, gold pulse.

### 2. `src/components/lobby/v3/` (new)
- `useDeviceTier.ts` — detect Low-end via `hardwareConcurrency ≤ 4`, `deviceMemory ≤ 4`, `devicePixelRatio ≤ 2`, or UA match (iPhone ≤ 11, Galaxy A). Returns `'low' | 'mid' | 'high'`.
- `InstancedAvatarManager.tsx` — single `InstancedMesh` for up to 160 avatars (mid/high). Frustum culling, LOD by distance, shader-based breathing/idle. `MAX_COUNT = 60` on low.
- `VirtualLobby3D.tsx` — R3F `<Canvas>` with `dpr={[1, tier==='high'?2:1.5]}`, `frameloop="demand"` when idle, `gl={{ powerPreference:'high-performance', antialias: tier!=='low' }}`. Mounts manager + lights + ground.
- `VirtualLobby2DFallback.tsx` — SVG grid of avatars for low-end / WebGL unavailable.
- `ProximityFomoToast.tsx` — when a nearby avatar's PHON/tier > viewer, fire Warm King toast ("저 황제의 왕관이 당신을 노려보고 있습니다…"). Throttled 1/8s, max 3/min.
- `useContextRecovery.ts` reuse — listen `webglcontextlost/restored`, re-mount scene, restore loadout within 5s.
- `safeDispose` everywhere on unmount; zero geometry/texture growth verified over 5min.

### 3. `/lobby` page
- `src/pages/Lobby.tsx` — Suspense + ErrorBoundary → tier check → `VirtualLobby3D` or `VirtualLobby2DFallback`. Header with live emperor count and "내 황제 꾸미기" CTA → `/avatar/studio`.

### 4. Guardrails
- `vite.config.ts`: `lobby` and `avatar` files resolve into `three3d` chunk (already excluded from preload).
- No imports from `src/pages/admin/**` or `@pkg/operator/**`.
- No edits to money-flow 8 paths (PRJ_FREEZE_RAW_CHANNEL, wallet ledger, withdraw, deposit, swap, betting, staking, packages).

## Validation

- `git diff` on money-flow 8 paths = 0 lines.
- `node scripts/check-operator-isolation.mjs` PASS.
- `npm run size:check` PASS — avatar + lobby chunks ≤ 120KB gzip each; `index` delta = 0.
- Manual FPS notes for iPhone 12 / 15 / S21 / A54 at 100–160 avatars (target avg 45–60 FPS; A54 falls back to 2D).
- Context-lost recovery verified <5s.
- 5min residency: 0 geometry/texture growth (devtools memory snapshot).

## Memory updates

- Append `mem://features/phase-d-avatar-lobby-v3` with: routes, files, tier thresholds, MAX_COUNT, FOMO copy rules.
- Update `mem://index.md` Memories list with one-liner.

## Out of scope (later slice)

- Realtime multi-user presence sync (currently seeded from `get_world_domination_stats` + sampled top emperors).
- NFT cosmetic crossover (Phase C collection visuals).
