#!/usr/bin/env node
// Phonara forbidden-phrase guard — fails CI if any user-facing copy contains banned keywords.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BAD = [
  /확정\s*(수익|보상)/,
  /원금\s*보장/,
  /수익\s*보장/,
  /보장\s*수익/,
  /평생\s*(골드|등급|뱃지|커미션|보상|공유)/,
  /수익\s*분배/,
  /최대\s*\d+\s*%/,
  /\blifetime\b/i,
  /\bguaranteed\b/i,
  /\bprofit\s*share\b/i,
];

const files = execSync(
  "git ls-files 'src/lib/i18n.ts' 'src/**/*.tsx' 'src/**/*.ts'",
  { encoding: "utf8" }
)
  .split("\n")
  .filter(Boolean);

const offenders = [];
for (const f of files) {
  let txt;
  try { txt = readFileSync(f, "utf8"); } catch { continue; }
  txt.split("\n").forEach((line, i) => {
    // skip comments & guard definitions in dmAudit / this script itself
    if (f.endsWith("check-forbidden-phrases.mjs")) return;
    if (f.endsWith("dmAudit.ts")) return;
    if (/^\s*\/\//.test(line)) return;
    for (const re of BAD) {
      if (re.test(line)) {
        offenders.push(`${f}:${i + 1}: ${line.trim()}`);
        break;
      }
    }
  });
}

if (offenders.length > 0) {
  console.error("❌ Forbidden phrases detected:\n" + offenders.join("\n"));
  process.exit(1);
}
console.log("✅ No forbidden phrases found.");
