/**
 * PHONARA Ω v3.1 — PHASE 1: Architectural boundary enforcement.
 *
 * Layer model:
 *   critical  : wallet / core / performance / telemetry / realtime / integrations
 *               (money path — must stay light, never depend on optional UX)
 *   optional  : live / avatar-nft / earn / referral / game-engine / trade / analytics / ui
 *   operator  : admin / moderation / kernel / payout / KPI / security panels
 *               (must not be reachable from user bundle)
 *
 * Run locally:  npx depcruise --config .dependency-cruiser.cjs src
 */
module.exports = {
  forbidden: [
    {
      name: "critical-no-optional",
      severity: "warn",
      comment:
        "Critical money path (wallet/core/realtime/integrations) must not depend on optional UX packages. (CI 안정화 임시 warn — Phase 5 error 복원)",
      from: {
        path: "^src/(packages/(wallet|core|performance|telemetry|realtime)|integrations|lib/notify)",
      },
      to: {
        path:
          "^src/packages/(live|avatar-nft|earn|referral|game-engine|trade|analytics|operator)",
      },
    },
    {
      name: "no-operator-in-user-bundle",
      severity: "warn",
      comment:
        "Operator code must not be imported anywhere outside src/packages/operator. (CI 안정화 임시 warn — Phase 5 error 복원)",
      from: {
        pathNot: "^src/packages/operator",
      },
      to: {
        path: "^src/packages/operator",
      },
    },
    {
      name: "no-framer-in-critical",
      severity: "warn",
      comment:
        "framer-motion is forbidden in the critical money path. (CI 안정화 임시 warn — Phase 5 error 복원)",
      from: {
        path: "^src/(packages/(wallet|core|performance|telemetry|realtime)|integrations)",
      },
      to: {
        path: "node_modules/framer-motion",
      },
    },
    {
      name: "no-circular",
      severity: "warn",
      comment: "Circular dependencies are forbidden.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "info",
      comment: "Orphan modules — candidates for deletion in PHASE 5 (Layer 1 Diet).",
      from: {
        orphan: true,
        pathNot: [
          "(^|/)\\.[^/]+\\.(?:js|cjs|mjs|ts|cts|mts|json)$",
          "\\.d\\.ts$",
          "(^|/)tsconfig\\.json$",
          "(^|/)(?:babel|webpack)\\.config\\.(?:js|cjs|mjs|ts|cts|mts|json)$",
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
