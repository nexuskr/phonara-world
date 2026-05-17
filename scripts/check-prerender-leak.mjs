#!/usr/bin/env node
/**
 * Prerender leak check.
 *
 * Scans every prerendered HTML file listed in reports/prerender-report.json
 * for sensitive tokens. Any hit fails the build.
 *
 * Forbidden phrases are matched case-insensitively. The well-known
 * Supabase publishable anon key (configured in `src/integrations/supabase/client.ts`)
 * is allow-listed because it is safe to ship to clients.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const FORBIDDEN = [
  "access_token",
  "refresh_token",
  "service_role",
  "secret",
  "password",
  "private_key",
  "withdraw_pin",
  "admin_",
  "Bearer ",
  // JWT-like prefix. Anon key (also starts with eyJ) is whitelisted below.
  "eyJ",
];

// Anon/publishable key fragment — safe in client bundles. Used to whitelist
// "eyJ" hits that are actually just the public anon JWT.
const ANON_KEY_FRAGMENT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtldGxxemZhcGxwcG11cGFpd2Z0";

const REPORT_PATH = path.join(ROOT, "reports", "prerender-report.json");

function findHits(haystack, needles) {
  const lower = haystack.toLowerCase();
  const hits = [];
  for (const n of needles) {
    const needle = n.toLowerCase();
    let idx = 0;
    while (true) {
      const at = lower.indexOf(needle, idx);
      if (at === -1) break;
      // Whitelist: occurrences of "eyJ" that are part of the public anon key.
      if (n === "eyJ") {
        const slice = haystack.substring(at, at + ANON_KEY_FRAGMENT.length);
        if (slice.startsWith(ANON_KEY_FRAGMENT)) {
          idx = at + ANON_KEY_FRAGMENT.length;
          continue;
        }
      }
      const ctxStart = Math.max(0, at - 40);
      const ctxEnd = Math.min(haystack.length, at + needle.length + 40);
      hits.push({
        needle: n,
        index: at,
        context: haystack.substring(ctxStart, ctxEnd).replace(/\s+/g, " "),
      });
      idx = at + needle.length;
    }
  }
  return hits;
}

async function main() {
  let report;
  try {
    report = JSON.parse(await fs.readFile(REPORT_PATH, "utf8"));
  } catch {
    console.error("[leak-check] reports/prerender-report.json not found — run prerender first.");
    process.exit(1);
  }

  const files = report.routes
    .filter((r) => r.status === "ok" && r.outFile)
    .map((r) => ({ route: r.route, file: path.join(ROOT, r.outFile) }));

  if (files.length === 0) {
    console.error("[leak-check] no prerendered files to scan.");
    process.exit(1);
  }

  let totalHits = 0;
  for (const { route, file } of files) {
    const html = await fs.readFile(file, "utf8");
    const hits = findHits(html, FORBIDDEN);
    if (hits.length === 0) {
      console.log(`[leak-check] ${route} → clean (${html.length}B)`);
      continue;
    }
    totalHits += hits.length;
    console.error(`[leak-check] ${route} → ${hits.length} HIT(s) in ${path.relative(ROOT, file)}`);
    for (const h of hits.slice(0, 10)) {
      console.error(`   • "${h.needle}" @${h.index}: …${h.context}…`);
    }
    if (hits.length > 10) console.error(`   • …and ${hits.length - 10} more`);
  }

  if (totalHits > 0) {
    console.error(`[leak-check] FAILED — ${totalHits} forbidden token(s) in prerendered HTML.`);
    process.exit(1);
  }
  console.log(`[leak-check] OK — ${files.length} file(s) scanned, no leaks.`);
}

main().catch((err) => {
  console.error("[leak-check] fatal:", err);
  process.exit(1);
});
