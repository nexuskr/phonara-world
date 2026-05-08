#!/usr/bin/env node
/**
 * PR3 Isolation Guard
 * --------------------
 * Enforces the PR3 v6 forensic-substrate invariants:
 *
 *  1. GLOBAL — no UPDATE/DELETE on viral_verification_log anywhere.
 *  2. GLOBAL — no direct INSERT/UPDATE/DELETE on viral_ai_circuit_state
 *              (must go through transition_ai_circuit()).
 *  3. GLOBAL — `signals_initial_locked` column must never be reintroduced.
 *  4. PR3-SCOPED — files inside the verification layer (verify-submission
 *     edge function and PR3 verification SQL) must NOT reference reward /
 *     financial tables or tokens. AI must remain observation-only.
 *
 * Exits 0 on pass, 1 on first violation (with file:line:column).
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

// ---------- helpers ----------

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip noise dirs
      if (["node_modules", ".git", "dist", "build", ".next"].includes(entry.name)) {
        continue;
      }
      out.push(...walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function stripSqlComments(src) {
  return src.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
}
function stripJsComments(src) {
  return src
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function isSql(file) {
  return file.endsWith(".sql");
}
function isCode(file) {
  return /\.(m?[jt]s|tsx|jsx)$/i.test(file);
}

function locate(content, regex) {
  const m = regex.exec(content);
  if (!m) return null;
  const before = content.slice(0, m.index);
  const line = before.split("\n").length;
  const col = m.index - before.lastIndexOf("\n");
  return { line, col, match: m[0] };
}

const violations = [];
function flag(file, rule, hit) {
  const where = hit ? `:${hit.line}:${hit.col}` : "";
  const sample = hit ? ` — "${hit.match.slice(0, 80)}"` : "";
  violations.push(`❌ ${file}${where}  [${rule}]${sample}`);
}

// ---------- rule definitions ----------

// Migrations are reviewed bootstrap definitions and the database itself
// enforces the runtime invariants (immutability triggers, circuit-write
// guard, SECURITY DEFINER allowlist). CI's job is to catch drift in
// *application code* — edge functions, scripts, src/.
function isMigration(file) {
  const norm = file.replace(/\\/g, "/");
  return norm.includes("/supabase/migrations/");
}

// GLOBAL rules — apply to non-migration files only.
// Catches both SQL syntax (UPDATE foo) and Supabase JS client syntax
// (.from('foo').update(...) / .delete() / .insert()).
const GLOBAL_RULES_NON_MIGRATION = [
  {
    name: "no-update-verification-log",
    re: /\bUPDATE\s+(?:public\.)?viral_verification_log\b/i,
  },
  {
    name: "no-delete-verification-log",
    re: /\bDELETE\s+FROM\s+(?:public\.)?viral_verification_log\b/i,
  },
  {
    name: "no-direct-circuit-insert",
    re: /\bINSERT\s+INTO\s+(?:public\.)?viral_ai_circuit_state\b/i,
  },
  {
    name: "no-direct-circuit-update",
    re: /\bUPDATE\s+(?:public\.)?viral_ai_circuit_state\b/i,
  },
  {
    name: "no-direct-circuit-delete",
    re: /\bDELETE\s+FROM\s+(?:public\.)?viral_ai_circuit_state\b/i,
  },
  // Supabase JS client mutations
  {
    name: "js-mutate-verification-log",
    re: /\.from\(\s*['"`]viral_verification_log['"`]\s*\)[\s\S]{0,200}?\.(update|delete|upsert)\s*\(/i,
  },
  {
    name: "js-mutate-circuit-state",
    re: /\.from\(\s*['"`]viral_ai_circuit_state['"`]\s*\)[\s\S]{0,200}?\.(update|delete|insert|upsert)\s*\(/i,
  },
];
const GLOBAL_RULES_UNIVERSAL = [
  {
    name: "no-signals-initial-locked",
    re: /\bsignals_initial_locked\b/,
  },
];

// PR3-scoped rules — only the verification firewall *code* path.
// AI/verification must never see reward, credit, or financial context.
const PR3_TOKEN_RULES = [
  { name: "pr3-no-reward-token",   re: /\breward\b/i },
  { name: "pr3-no-bonus-token",    re: /\bbonus\b/i },
  { name: "pr3-no-credit-token",   re: /\bcredit\b/i },
  { name: "pr3-no-payout-token",   re: /\bpayout\b/i },
  { name: "pr3-no-ltv-token",      re: /\bltv\b/i },
  { name: "pr3-no-revenue-token",  re: /\brevenue\b/i },
  { name: "pr3-no-arpu-token",     re: /\barpu\b/i },
];

const PR3_TABLE_RULES = [
  { name: "pr3-no-mission-catalog",   re: /\bviral_mission_catalog\b/i },
  { name: "pr3-no-package-purchases", re: /\bpackage_purchases\b/i },
  { name: "pr3-no-deposit-requests",  re: /\bdeposit_requests\b/i },
  { name: "pr3-no-referral-earnings", re: /\breferral_earnings\b/i },
  { name: "pr3-no-profit-share",      re: /\bprofit_share_distributions\b/i },
  { name: "pr3-no-settlement-log",    re: /\bviral_settlement_log\b/i },
];

// PR3 scope = verification firewall edge functions only.
// (Migrations are bootstrap territory — runtime triggers enforce there.)
function isPr3Scoped(file) {
  if (isMigration(file)) return false;
  const norm = file.replace(/\\/g, "/");
  return (
    norm.includes("/supabase/functions/verify-submission/") ||
    norm.includes("/supabase/functions/evaluate-ai-circuit/")
  );
}

// ---------- run ----------

function main() {
  const candidates = [
    ...walk(path.join(ROOT, "supabase")),
    ...walk(path.join(ROOT, "scripts")),
    ...walk(path.join(ROOT, "migrations")),
  ].filter((f) => isSql(f) || isCode(f));

  for (const file of candidates) {
    const raw = fs.readFileSync(file, "utf8");
    const stripped = isSql(file) ? stripSqlComments(raw) : stripJsComments(raw);

    // GLOBAL — universal (every file)
    for (const rule of GLOBAL_RULES_UNIVERSAL) {
      const hit = locate(stripped, rule.re);
      if (hit) flag(path.relative(ROOT, file), rule.name, hit);
    }

    // GLOBAL — non-migration only
    if (!isMigration(file)) {
      for (const rule of GLOBAL_RULES_NON_MIGRATION) {
        const hit = locate(stripped, rule.re);
        if (hit) flag(path.relative(ROOT, file), rule.name, hit);
      }
    }

    // PR3-scoped (verification firewall code path)
    if (isPr3Scoped(file)) {
      for (const rule of [...PR3_TOKEN_RULES, ...PR3_TABLE_RULES]) {
        const hit = locate(stripped, rule.re);
        if (hit) flag(path.relative(ROOT, file), rule.name, hit);
      }
    }
  }

  if (violations.length > 0) {
    console.error("PR3 isolation check FAILED:\n");
    for (const v of violations) console.error("  " + v);
    console.error(`\n${violations.length} violation(s).`);
    process.exit(1);
  }

  console.log("✅ PR3 isolation check passed");
}

main();
