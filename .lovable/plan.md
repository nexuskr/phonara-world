# PHONARA Ω∞ — SOVEREIGN VERIFICATION OS

> Not a QA suite. A **self-governing verification operating system** that continuously proves integrity, survivability, replayability, safety, isolation, and financial consistency of the entire Phonara runtime — and refuses to let the platform ship when it cannot.

> All 19 sections of the Imperial Directive are encoded into 8 buildable **subsystems** below. Each subsystem has: laws it enforces, artifacts it produces, and a verifiable acceptance gate.

---

## 0. Boundaries (Section 1, 2, 14 — IMMUTABLE)

| Law | Mechanism in this build |
|---|---|
| Money-flow 8-path FROZEN | `scripts/check-money-flow-freeze.mjs` already present → wired as a **mandatory pre-suite gate**. Any suite that detects a 1-byte diff against the 8 paths → CRITICAL, run aborts before fixtures load. |
| No client money write | Suite `05-rls-direct` brute-attempts INSERT/UPDATE/DELETE on all money tables with anon + authenticated clients. Expected: 100% denial. Any success → CRITICAL. |
| Operator never in user bundle | `check-operator-isolation.mjs` + new `op-fortress.scan.ts` extends to: HAR, preload chain, service worker, IndexedDB, localStorage, sourcemaps, websocket frames, hydration payload. |
| Production untouchable | Hard env split. `BLAST_RADIUS=preview` is the **only** value that unlocks chaos / mutation suites. Production targets get `read-only-observatory` profile (assertions only, zero writes). |
| AI assumptions distrusted | All AI-generated artifacts pass through **Hallucination Containment Gate** (§4) before being written. |

These boundaries are wired as **pre-flight verifications**. If any fails, the kernel exits with code 78 (neutral) on schedule runs and code 1 on `main`.

---

## 1. Subsystem map

```text
                       ┌────────────────────────────────────────┐
                       │  PHONARA VERIFICATION OS (kernel)      │
                       │  governance-kernel/                    │
                       └──┬─────────────────────────────────────┘
                          │
   ┌──────────────────────┼──────────────────────────────────────┐
   │                      │                                      │
┌──▼──────────┐    ┌──────▼──────┐    ┌────────────┐    ┌────────▼──────┐
│ S1 Topology │    │ S2 Halluc.  │    │ S3 Replay  │    │ S4 Temporal   │
│ Discovery   │    │ Containment │    │ Capsule    │    │ Consistency   │
│ (frontend/  │    │ (verify     │    │ (HAR + ws  │    │ (causality    │
│  db/edge/   │    │  before     │    │  + DOM +   │    │  graph,       │
│  realtime/  │    │  generate)  │    │  storage + │    │  monotonic    │
│  oracle)    │    │             │    │  oracle)   │    │  seq, races)  │
└──┬──────────┘    └─────────────┘    └────────────┘    └───────────────┘
   │
┌──▼──────────┐    ┌─────────────┐    ┌────────────┐    ┌───────────────┐
│ S5 Financial│    │ S6 Realtime │    │ S7 Oracle  │    │ S8 Telemetry  │
│ Invariant   │    │ Warfare     │    │ Dominance  │    │ Truth Engine  │
│ (ledger     │    │ (storms,    │    │ (stale,    │    │ (client → edge│
│  conserv.)  │    │  shards)    │    │  divergent)│    │  → dashboard) │
└─────────────┘    └─────────────┘    └────────────┘    └───────────────┘
                          │
                          │      cross-cuts:
                          │      - Operator Fortress (§11)
                          │      - Exploit Hunter (§12)
                          │      - Execution Economics (§13)
                          │      - Failure Intelligence (§15)
                          │      - Governance Score (§16)
                          │      - Self-Evolving (§17)
                          │      - Dual-AI cross-audit (§18)
```

Repo layout:

```text
governance-kernel/
├── kernel.config.ts              # blast-radius, profile, risk weights
├── boot/
│   ├── preflight.ts              # money-freeze, operator-isolation, env split
│   └── secret-rotation.ts        # 5-layer fallback (carried from prior plan)
├── topology/                     # S1
│   ├── discover.frontend.ts      # route graph, lazy chunks, preload chain
│   ├── discover.db.ts            # pg_proc, pg_policies, pg_trigger via service role (preview only)
│   ├── discover.edge.ts          # 64 edge fns + verify_jwt + cron metadata
│   ├── discover.realtime.ts      # @pkg/realtime partitions × regions
│   ├── discover.oracle.ts        # oracle_source_weights + health
│   └── topology.snapshot.json    # source of truth, diff-gated
├── containment/                  # S2
│   ├── hallucination.gate.ts     # verify(selector|rpc|route|ws|har) before use
│   └── quarantine.jsonl          # rejected assumptions, append-only
├── replay/                       # S3
│   ├── capsule.recorder.ts       # HAR + ws frames + DOM snap + storage + seeds
│   ├── capsule.player.ts         # `bun replay <id>` entry
│   └── capsules/<id>/            # one folder per critical failure
├── temporal/                     # S4
│   ├── causality.graph.ts        # build DAG from trace ids + ws seq
│   └── invariants.temporal.ts    # settle_ts >= bet_ts, monotonic, no dup
├── financial/                    # S5
│   ├── invariants.derive.ts      # auto-derive from migrations + RPCs
│   └── conservation.check.ts     # before+Δ == after, per user, per asset
├── realtime/                     # S6
│   └── warfare.ts                # reconnect storm, packet loss, dup, partition
├── oracle/                       # S7
│   └── dominance.ts              # stale, replayed, negative, shadow drift
├── telemetry/                    # S8
│   └── truth.crosscheck.ts       # client_metrics ↔ admin_get_lobby_analytics
├── fortress/                     # §11
│   └── operator.fortress.ts      # 8-surface scan
├── exploits/                     # §12
│   ├── replay.attacker.ts
│   ├── idem.collision.ts
│   ├── ws.resend.storm.ts
│   └── cache.poison.ts
├── economics/                    # §13
│   └── risk.score.ts             # RISK_SCORE = financial × exploit × … × blast
├── intelligence/                 # §15
│   ├── classify.ts               # severity, blast, exploitability
│   ├── bisect.ts                 # `git bisect run` wrapper
│   └── remediation.proposer.ts   # writes proposal/<id>.md (no auto-apply)
├── governance/                   # §16
│   ├── score.compute.ts          # 12-axis weighted score
│   └── score.history.jsonl       # trend, deploy gate
├── evolution/                    # §17
│   └── rediscover.on.change.ts   # topology diff → regenerate downstream
├── dual-ai/                      # §18
│   ├── generator.ts              # produces artifact
│   ├── verifier.ts               # tries to break it
│   ├── auditor.ts                # validates both
│   └── decision.log.jsonl        # 3-of-3 quorum required
├── secrets/                      # (prior plan carried forward)
│   └── SecretRotationManager.ts
└── reports/
    ├── governance-score.html
    ├── replay-index.html
    └── kernel-summary.json
```

---

## 2. S1 — Autonomous Topology Discovery (§3, §17)

Discovery runs at kernel boot AND on every migration / route / edge fn / config change. Produces `topology.snapshot.json` — **diff-gated**: an unexpected diff against the previous snapshot triggers `evolution/rediscover.on.change.ts`, which regenerates contracts, replay graphs, invariants, risk scores, and chaos matrices.

Sources:

| Layer | Tool | Read-only? |
|---|---|---|
| Frontend routes / lazy / preload | vite build manifest + dependency-cruiser | yes |
| DB schema / RLS / triggers / RPCs | `pg_proc`, `pg_policies`, `pg_trigger` via service role on **preview only** | yes |
| Edge fns + verify_jwt + cron | `supabase/config.toml` + `supabase/functions/*` AST | yes |
| Realtime topology | `@pkg/realtime` + `realtime_region_heartbeats` | yes |
| Oracle | `oracle_source_weights` + `oracle_source_health` | yes |

Snapshot is signed (sha256). Topology drift on prod = **CRITICAL**, on preview = trigger regeneration.

---

## 3. S2 — AI Hallucination Containment (§4)

Every artifact generated by Generator-AI (selector, RPC name, route, ws channel, HAR entry, Zod schema) **must** pass `verify(kind, value)` before being committed.

```ts
// containment/hallucination.gate.ts (signature only)
export type Kind = "selector" | "rpc" | "route" | "ws" | "har" | "edge" | "table";
export interface Verdict { ok: boolean; evidence?: string; reason?: string; }
export async function verify(kind: Kind, value: string): Promise<Verdict>;
```

Verifiers:
- `selector` → live page query in Playwright `expect.poll` (must resolve ≥1 element, stable across 3 reloads).
- `rpc` → must exist in `topology.snapshot.json.rpcs[]` with matching arity.
- `route` → must exist in frontend route graph AND respond 2xx/3xx (not 404).
- `ws` → must be one of `@pkg/realtime` partitions × regions.
- `har` → must appear in recorded HAR baseline.
- `edge` / `table` → must exist in topology snapshot.

Failure → append to `quarantine.jsonl` with `hallucination_detected`, block generation, surface in Governance Score as **trust penalty**.

---

## 4. S3 — Deterministic Replay Capsule (§5)

Every CRITICAL failure produces a **capsule**:

```text
capsules/<uuid>/
├── manifest.json        # versions, env, profile, region, chaos_seed
├── har/network.har
├── ws/frames.jsonl
├── dom/<step-n>.html
├── storage/{local,session,indexedDB}.json
├── cookies.json
├── trace/playwright.zip
├── rpc-ordering.jsonl
├── oracle-snapshots.json
├── telemetry-state.json
├── invariant-state.json
└── retry-chains.jsonl
```

CLI: `bun replay <capsule-id>` re-mounts fixtures with frozen clock, replays HAR via `context.routeFromHAR`, injects identical chaos seed, asserts identical outcome. Divergence = CRITICAL.

Determinism guards:
- frozen `Date.now()` via Playwright `addInitScript`
- seeded `Math.random` (mulberry32)
- pinned oracle snapshot served from HAR
- chaos injector reads from `manifest.json.chaos_seed`

---

## 5. S4 — Temporal Consistency (§6)

Build causality DAG per scenario from: `x-trace-id` headers, ws sequence ids, RPC call timestamps, edge function logs.

Mandatory invariants:
- `settle_ts >= bet_ts` for every duel / slot / crash bet.
- `sequence_id` strictly monotonic per channel × region.
- `duplicate_settlement_count == 0`.
- `cross_shard_divergence <= 50ms` p99 between ap/us/eu heartbeats.
- No RPC executes while a higher-priority money RPC for the same user is in-flight (overlap detector).

Violation = CRITICAL, capsule emitted.

---

## 6. S5 — Financial Invariant Engine (§7)

**Auto-derived** from `topology.snapshot.json.tables` + trigger graph (the kernel reads migrations + RPC bodies to compute the conservation equation per asset).

Per user, per asset (PHON / KRW / USDT):

```text
before_balance
+ Σ deposits
+ Σ payouts
+ Σ staking_rewards
+ Σ swap_in
− Σ withdrawals
− Σ burns
− Σ bets
− Σ swap_out
== after_balance
```

Detectors:
- phantom payout (payout without matching bet/round)
- duplicate settlement (same `ref_id` settled twice)
- replayed withdrawal (same idem key, 2 successes)
- orphan ledger (treasury entry with no source)
- race credit (two concurrent credits to same balance row)
- idempotency bypass (`apply_token_burn(source, ref_id, ref_type)` unique violation simulated)

Runs in **observe-only** mode in production (read-only). Runs in **active** mode in preview (kernel uses dedicated `e2e_*` test users only, never touches real money rows).

Violation = **PLATFORM BLOCKER** → governance score drops below deploy threshold automatically.

---

## 7. S6 — Realtime Warfare (§8)

Chaos primitives wrap `@pkg/realtime` (FREEZE 8-path raw channels excluded):

| Primitive | How |
|---|---|
| reconnect storm | force socket close × N, jittered backoff |
| packet loss | Playwright route abort 20% on `wss://*` |
| stale subscription | subscribe → freeze ack → assert client detects |
| duplicate broadcast | inject 2× identical frame, assert client dedupes |
| sequence corruption | rewrite `seq_id` ordering in frame |
| network partition | block per-region wss endpoint, assert failover |
| delayed broadcast | 3s artificial delay, assert UI shows degraded state |

All chaos is seeded (`chaos_seed` in manifest) → fully deterministic replay.

---

## 8. S7 — Oracle Dominance (§9)

Scenarios injected into the oracle pipeline (preview only):

- stale feed → freeze source for 60s → assert `oracle_source_health.degraded=true` within 5min.
- replayed candle → repost old `updated_at` → assert quarantine.
- delayed exchange data → 30s lag → assert weight penalty applies.
- negative / zero price → assert outlier filter rejects.
- shadow/live divergence → assert `oracle_shadow_drift` row inserted.
- consensus corruption → 1 source disagrees by 100bps → assert clamp activates.
- timestamp skew → wall clock vs source ts > 10s → assert source weight degrades.

Invariant: `abs(shadow_price - live_price) <= threshold_bps`. Violation = CRITICAL.

---

## 9. S8 — Telemetry Truth (§10)

End-to-end cross-check loop:
1. Browser emits N synthetic `client_metrics` events with known fingerprints.
2. `imperial-metrics-batch` edge function logs (count, dedup, rate-limit).
3. `client_metrics` table row count diff.
4. `admin_get_lobby_analytics(window_hours)` aggregation.
5. `/admin/ops/sprint-4` dashboard render.

Assertion: same fingerprints visible at every stage (modulo expected dedup). Drift = silent telemetry loss.

Detectors:
- silent drop (emitted > ingested)
- stale cache (5s cache serving > 5s old data)
- fabricated dashboard (dashboard row with no upstream evidence)
- low-end suppression failure (reduced-motion device still emits)

---

## 10. Operator Fortress (§11)

Extends `check-operator-isolation.mjs` to scan **8 surfaces** per build + per E2E run:

1. JS chunks (`index-*.js`) — FORBIDDEN_MARKERS already wired.
2. Source maps — same markers.
3. Preload links in entry HTML.
4. Hydration payload (`window.__phonara_*`).
5. Service worker (`sw.js`, `sw-push.js`) — no admin imports.
6. IndexedDB after login — no admin keys.
7. localStorage after login — no admin keys, no service-role JWT.
8. HAR exports — no admin route, no `Authorization: ... service_role`.
9. WS frame payloads — no `admin:*` channel for non-admin users.

Any hit = IMMEDIATE FAILURE, capsule emitted, governance score floor.

---

## 11. Exploit Hunter (§12)

Adversarial suites run continuously, **on preview only**:

- duplicate POST replay (same body + idem key, expect 1 success)
- stale session replay (expired JWT)
- ws resend storm (1000 frames/s, expect throttle, no double settle)
- cache poisoning (HTML `must-revalidate` honored — already in `_headers`)
- delayed ACK amplification (slow client, expect server-side timeout)
- idem_key collision (`apply_token_burn` unique check)
- sequence corruption (out-of-order ws frames)
- mutation amplification (1 user request → assert ≤1 money mutation)

---

## 12. Execution Economics (§13)

`economics/risk.score.ts`:

```text
RISK_SCORE(target) =
    financial_impact     // $/event from invariant graph
  × exploitability       // historic CVE-like score per RPC
  × replay_surface       // # of state mutations in flow
  × realtime_sensitivity // 1 if subscribes to wallet/game, else 0.2
  × operator_privilege   // 1 if admin/AAL2, else 0.3
  × mutation_surface     // # of tables touched
  × blast_radius         // users impacted / total active
  × volatility           // recent failure rate (EMA-7)
```

Scheduler picks targets to **maximise risk reduction per compute dollar**. Reports per-run `dollars_saved_per_minute` to governance score.

---

## 13. Failure Intelligence (§15)

On any CRITICAL, autonomously emit `intelligence/incident-<id>.md`:

- severity (auto-classified)
- estimated blast radius (users × $ exposure)
- exploitability (1-5)
- first-bad-commit (`git bisect run governance-kernel/bisect-target.sh`)
- likely root cause (cluster failure log against past incidents via embeddings)
- replay confidence (deterministic? flaky? requires-network?)
- remediation **proposal** (writes to `proposals/<id>.md`, **never auto-applies**)
- rollback suggestion (commit SHA + migration down if available)

Section 2 forbids auto-apply for any RLS, RPC, schema, treasury, or settlement change — these proposals always require human approval.

---

## 14. Governance Score (§16)

12-axis weighted score, 0-100:

| Axis | Weight |
|---|---|
| invariant integrity | 15 |
| replay confidence | 12 |
| realtime consistency | 10 |
| oracle correctness | 10 |
| operator isolation | 12 |
| telemetry trust | 8 |
| chaos survivability | 8 |
| exploit resistance | 10 |
| flaky rate (inverse) | 5 |
| runtime drift | 4 |
| mutation safety | 3 |
| replay determinism | 3 |

Thresholds:
- ≥ 92 → deploy unlocked
- 80-91 → preview only, no rollout phase advance
- < 80 → **GO-LIVE BLOCKED**, only hotfix lanes proceed

Score is computed every run, stored in `governance/score.history.jsonl`, rendered in HTML report, surfaced to `/admin/ops` (new tile reads the JSON via existing edge function).

---

## 15. Self-Evolving Governance (§17)

Trigger sources monitored:
- new migration in `supabase/migrations/`
- route added/removed (`src/pages/**`, `_AdminRoutes.tsx`)
- new edge function in `supabase/functions/`
- `supabase/config.toml` change
- websocket topology change (`@pkg/realtime`)
- oracle source weight change

On any trigger:
1. `topology/discover.*` re-runs.
2. Diff against `topology.snapshot.json`.
3. For each diff, regenerate downstream artifacts (contracts, replay graphs, invariants, risk scores, chaos matrices) — through the Hallucination Containment Gate.
4. Auditor-AI signs off.
5. New snapshot committed, governance score recomputed.

No human intervention. But: any change to RLS, SECURITY DEFINER RPC, money schema, treasury logic, settlement logic is **flagged-not-applied** (per §2).

---

## 16. Dual-AI Verification (§18)

Three AI roles + two non-AI engines. Quorum 3-of-3 (Generator, Verifier, Auditor) required before any artifact merges to `topology.snapshot.json` or `contracts/`.

```text
Generator-AI  →  creates artifact
Verifier-AI   →  attempts to break (mutation testing, adversarial inputs)
Auditor-AI    →  reviews both (style, security, scope creep)
Replay Engine →  proves determinism
Governance    →  decides survivability via score
```

All decisions append to `dual-ai/decision.log.jsonl`. A single AI can never push.

---

## 17. Secret Rotation (carried from prior plan)

5-layer fallback (Primary → Cached → Pool → Read-only → Emergency Static → Ultimate Fail), `SecretRotationManager` class, audit trail, alert tiers, suite gating. See preserved file `governance-kernel/secrets/SecretRotationManager.ts` — full code retained from previous plan iteration; not duplicated here for brevity.

---

## 18. Execution profiles

| Profile | Where it runs | Mutations allowed | Chaos | Suites |
|---|---|---|---|---|
| `read-only-observatory` | production `phonara.world` | NO | NO | S1 discovery, S5 invariant (read), S8 telemetry crosscheck, fortress scan |
| `preview-active` | `id-preview--*.lovable.app` | only on `e2e_*` test users | YES, seeded | all 8 + exploits |
| `local-replay` | developer machine | capsule-driven only | replay-only | replayer + bisect |

Production never gets chaos. Preview never touches non-`e2e_*` accounts. The kernel enforces this via `kernel.config.ts` → `BLAST_RADIUS` check at preflight.

---

## 19. Build sequence (phased, each phase ships green)

| Phase | Ships | Acceptance gate |
|---|---|---|
| **P0 Preflight** | `boot/preflight.ts`, env split, freeze + isolation wiring | preflight fails the run on any law breach |
| **P1 Topology** | S1 discovery + snapshot + diff gate | snapshot stable across 3 consecutive runs |
| **P2 Containment** | S2 hallucination gate | 100% of generated selectors/RPCs verified |
| **P3 Replay** | S3 capsule recorder + player | 1 seeded failure replays bit-identical |
| **P4 Financial + Temporal** | S5 + S4 | conservation holds across 10k synthetic events |
| **P5 Realtime + Oracle + Telemetry** | S6 + S7 + S8 | 7 chaos primitives + 7 oracle scenarios + telemetry loop pass |
| **P6 Fortress + Exploits** | §11 + §12 | 8-surface scan + 8 exploits all caught/denied |
| **P7 Economics + Intelligence + Score + Evolution + Dual-AI** | §13 + §15 + §16 + §17 + §18 | governance score ≥ 92, decision log healthy |

Each phase produces a separate PR with: passing kernel-summary.json + governance score + replay sample.

---

## 20. What this is NOT

It is not Playwright. It is not CI. It is not a test suite.
It is an **autonomous exchange-grade governance organism** that runs continuously, generates its own targets, breaks its own outputs, replays its own failures, scores its own readiness, refuses its own deployment when score drops — and never, ever, mutates production money paths.
