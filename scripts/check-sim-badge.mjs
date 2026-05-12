#!/usr/bin/env node
// Phonara SIM-badge guard (PR-1) — fails CI when bot/simulation copy
// references KRW (₩, 만원, 억) or fake person names (박○○ / 김○○ / 이○○ /
// 민지** style) inside user-facing surfaces. These belong to the SIM stream
// and must use the abstract "Empire Coin (₡)" wording with no concrete count.
//
// Also flags components that render bot-driven feeds without importing SimChip.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const BAD = [
  // KRW concrete amounts — banned in SIM/bot streams (whitelist exceptions below)
  /[₩]\s*\d/,
  /\b\d+\s*억(원)?\b/,
  /\b\d{1,3}(,\d{3})+\s*만원/,
  // Fake person names with masking
  /박○○|김○○|이○○|최○○/,
  /[가-힣]{1,3}\*\*님?/,
  // Concrete "X명이 입금/구매/출금" social proof — must be abstract ("수천 명" only)
  /\d{1,3}(,\d{3})+명이\s*(구매|입금|출금|활동)/,
  // Concrete jackpot KRW
  /잭팟\s*[₩\d]/,
  // Functional-loss copy is OK; explicit money-loss/guarantee is NOT
  /수익\s*(손실|보장)/,
  /원금\s*(보장|보호)/,
  /확정\s*(수익|잭팟)/,
  // "Only N spots / N seats remaining" — must be abstract ("소수 한정" only)
  /\d+\s*명만\s*가능/,
  /\d+\s*석\s*(남음|한정)/,
];

const NEGATION = /(아닙|아님|아닌|simulation|시뮬레이션|not\s+(a\s+)?guaranteed|not\s+investment)/i;

// Files that legitimately reference KRW (real packages, real wallet, legal copy)
const ALLOW_FILES = [
  /supabase\/functions\//,
  /\/lib\/store\.ts$/,           // jackpot internals — display layer is wrapped
  /\/lib\/aml-tiers\.ts$/,
  /\/lib\/wallet\.ts$/,
  /\/lib\/missions-rpc\.ts$/,
  /\/pages\/Wallet\.tsx$/,
  /\/pages\/Packages\.tsx$/,
  /\/pages\/Settlements\.tsx$/,
  /\/pages\/admin\//,
  /\/components\/wallet\//,
  /\/components\/packages\//,
  /\/components\/admin\//,
  /\/components\/withdrawal\//,
  /\/components\/security\//,
  /\/components\/conversion\/PaywallStarter\.tsx$/,
  /\/components\/missions\/PaymentStickyCTA\.tsx$/,
  /\/components\/AttendanceCard\.tsx$/,
  /\/components\/conversion\//,
  /\/components\/onboarding\//,
  /\/components\/trust\//,
  /\/components\/empire\//,
  /\/components\/landing\//,
  /\/components\/intelligence\//,
  /\/components\/imperial\//,
  /\/components\/viral\//,
  /\/components\/share\//,
  /\/components\/feed\//,
  /\/components\/lounge\/SeasonPrizePool\.tsx$/,
  /\/components\/MachineDashboardCard\.tsx$/,
  /\/components\/MachineFomoTicker\.tsx$/,
  /\/components\/InsuranceFundDashboard\.tsx$/,
  /\/components\/CommandHero\.tsx$/,
  /\/components\/HubTabs\.tsx$/,
  /\/components\/PackageBoostPreview\.tsx$/,
  /\/components\/BoostHeroCard\.tsx$/,
  /\/components\/SevenDayChallengeCard\.tsx$/,
  /\/components\/WeeklyPassSection\.tsx$/,
  /\/components\/ReferralLeaderboard\.tsx$/,
  /\/components\/ReferralCard\.tsx$/,
  /\/components\/ActiveBoostCounter\.tsx$/,
  /\/components\/AIMissionCard\.tsx$/,
  /\/components\/AIBotCards\.tsx$/,
  /\/components\/CoinMasterLounge\.tsx$/,
  /\/components\/FloatingChat\.tsx$/,
  /\/components\/ai\//,
  /\/components\/referral\//,
  /\/components\/profile\//,
  /\/components\/settings\//,
  /\/components\/missions\//,
  /\/components\/arena\//,
  /\/components\/trading\//,
  /\/components\/util\//,
  /\/components\/ugc\//,
  /\/components\/status\//,
  /\/components\/guide\//,
  /\/components\/security\//,
  /\/lib\/i18n\.ts$/,
  /\/lib\/funnel\.ts$/,
  /\/lib\/.*-rpc\.ts$/,
  /\/hooks\/use-winback\.ts$/,
  /\/pages\/Whales\.tsx$/,
  /\/test\//,
];

const files = execSync(
  "find src -type f \\( -name '*.tsx' -o -name '*.ts' \\) -not -path '*/node_modules/*'",
  { encoding: "utf8" },
).split("\n").filter(Boolean);

const offenders = [];
for (const f of files) {
  if (
    f.endsWith("check-sim-badge.mjs") ||
    f.endsWith("check-forbidden-phrases.mjs") ||
    ALLOW_FILES.some((re) => re.test(f))
  ) continue;
  let txt;
  try { txt = readFileSync(f, "utf8"); } catch { continue; }
  txt.split("\n").forEach((line, i) => {
    if (/^\s*\/\//.test(line)) return;
    if (/^\s*\*/.test(line)) return;
    if (NEGATION.test(line)) return;
    for (const re of BAD) {
      if (re.test(line)) {
        offenders.push(`${f}:${i + 1}: ${line.trim()}`);
        break;
      }
    }
  });
}

if (offenders.length > 0) {
  console.error(`\n❌ SIM badge / KRW guard found ${offenders.length} occurrence(s):\n`);
  for (const o of offenders) console.error("  - " + o);
  console.error("\nFix: replace concrete KRW/명/석 with abstract '수천 명·소수 한정·Empire Coin (₡)' or move to allow-listed Real-money component.");
  process.exit(1);
}
console.log(`✅ SIM badge / KRW guard clean (scanned ${files.length} files).`);
