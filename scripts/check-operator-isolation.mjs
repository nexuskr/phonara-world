#!/usr/bin/env node
/**
 * PR-K — Operator Isolation verifier.
 *
 * Verifies that operator (admin) code is fully sandboxed into the `operator-*.js`
 * chunk and that the Layer-1 entry bundle (`index-*.js`) contains 0 bytes of
 * operator surface area.
 *
 * Heuristic markers:
 *   - "src/pages/admin/"  filenames embedded in sourcemap names
 *   - "_AdminLayout", "AdminAal2Gate", "operator" string literals
 *
 * Failure → exit 1 so CI blocks regressions.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist/assets";
const ENTRY = /^index-[A-Za-z0-9_-]+\.js$/;
const OPERATOR = /^operator(-[A-Za-z0-9_-]+)?\.js$/;
const FORBIDDEN_MARKERS = [
  "pages/admin/_AdminLayout",
  "pages/admin/_AdminRoutes",
  "components/admin/GodModePanel",
  "components/admin/AMLAdmin",
  "components/admin/WithdrawRequestsAdmin",
  "AdminAal2Gate",
];

let files;
try {
  files = readdirSync(DIST);
} catch (e) {
  console.error(`[operator-isolation] dist/assets not found — run \`vite build\` first.`);
  process.exit(2);
}

const entries = files.filter((f) => ENTRY.test(f));
const operators = files.filter((f) => OPERATOR.test(f));

if (!entries.length) {
  console.error("[operator-isolation] FAIL: no index-*.js entry chunk found.");
  process.exit(1);
}
if (!operators.length) {
  console.error("[operator-isolation] FAIL: no operator-*.js chunk found — manualChunks regression?");
  process.exit(1);
}

const report = { entry: entries, operator: operators, leaks: [] };

for (const e of entries) {
  const buf = readFileSync(join(DIST, e), "utf8");
  for (const m of FORBIDDEN_MARKERS) {
    if (buf.includes(m)) {
      report.leaks.push({ entry: e, marker: m });
    }
  }
}

const opBytes = operators.reduce((sum, f) => sum + statSync(join(DIST, f)).size, 0);
report.operatorBytes = opBytes;

console.log(JSON.stringify(report, null, 2));

if (report.leaks.length) {
  console.error(`[operator-isolation] FAIL: ${report.leaks.length} operator marker(s) leaked into Layer 1 entry.`);
  process.exit(1);
}
console.log(`[operator-isolation] PASS — operator chunk ${opBytes} bytes, 0 leaks into Layer 1.`);
