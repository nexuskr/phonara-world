#!/usr/bin/env node
/**
 * PR-P1-A — Crown UI leak detector (baseline mode).
 *
 * 사용자 노출 컴포넌트/페이지의 "Crown"/"👑"/"크라운" 노출 검출.
 *
 * 화이트리스트:
 *   - src/lib/rewards/*           — 어댑터 자체
 *   - src/lib/branding/crownGlossary.ts — 매핑 정의
 *   - src/lib/crown.ts            — 레거시 백엔드 어댑터
 *   - src/integrations/supabase/  — 자동 생성
 *   - test/spec files
 *
 * 모드:
 *   - 기본 (baseline): 카운트만 출력, exit 0
 *   - `--strict`: 1건 발견 시 exit 1
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const STRICT = process.argv.includes("--strict");

const PATTERNS = [
  { name: "emoji-crown",   re: /👑/g },
  { name: "korean-crown",  re: /크라운/g },
  { name: "english-crown", re: /(?<![A-Za-z0-9_])Crown(?![A-Za-z0-9_])/g },
];

const SCAN_GLOB = ["src/components", "src/pages", "src/packages/ui", "src/packages/earn"];
const WHITELIST = [
  /src\/lib\/rewards\//,
  /src\/lib\/branding\/crownGlossary/,
  /src\/lib\/crown\.ts$/,
  /src\/integrations\/supabase\//,
  /\.test\.|\.spec\./,
  /crown_events|award_crown|crown_war_/,
];

function listFiles() {
  try {
    const out = execSync(
      `git ls-files ${SCAN_GLOB.join(" ")} | grep -E '\\.(ts|tsx)$'`,
      { encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

const files = listFiles();
const findings = [];

for (const f of files) {
  if (WHITELIST.some((w) => w.test(f))) continue;
  let src;
  try { src = readFileSync(f, "utf8"); } catch { continue; }
  for (const { name, re } of PATTERNS) {
    const matches = src.match(re);
    if (!matches) continue;
    if (name === "english-crown") {
      // skip lucide-react Crown icon import lines
      let real = 0;
      for (const line of src.split("\n")) {
        if (/from\s+["']lucide-react["']/.test(line)) continue;
        const m = line.match(re);
        if (m) real += m.length;
      }
      if (real > 0) findings.push({ file: f, name, count: real });
    } else {
      findings.push({ file: f, name, count: matches.length });
    }
  }
}

const total = findings.reduce((a, b) => a + b.count, 0);
const byKind = findings.reduce((acc, f) => {
  acc[f.name] = (acc[f.name] || 0) + f.count;
  return acc;
}, {});

console.log("[check-no-crown-ui] scanned files:", files.length);
console.log("[check-no-crown-ui] findings (top 30 files):");
findings.sort((a, b) => b.count - a.count).slice(0, 30).forEach((f) => {
  console.log(`  ${String(f.count).padStart(4)}  ${f.name.padEnd(14)}  ${f.file}`);
});
console.log("[check-no-crown-ui] total:", total, "by kind:", byKind);

if (STRICT && total > 0) {
  console.error("[check-no-crown-ui] STRICT mode: failing on Crown leakage.");
  process.exit(1);
}
console.log("[check-no-crown-ui] baseline mode — non-blocking.");
