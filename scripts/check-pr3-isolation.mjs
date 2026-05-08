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

// GLOBAL rules (apply to every file regardless of location)
const GLOBAL_RULES = [
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
  {
    name: "no-signals-initial-locked",
    re: /\bsignals_initial_locked\b/,
  },
];

// PR3-scoped rules — only the verification firewall code path.
// These reflect the financial-isolation contract: AI/verification
// must never see reward, credit, settlement, or catalog context.
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

// A file is "PR3-scoped" if it is part of the verification firewall.
function isPr3Scoped(file) {
  const norm = file.replace(/\\/g, "/");
  if (norm.includes("/supabase/functions/verify-submission/")) return true;
  if (norm.includes("/supabase/functions/evaluate-ai-circuit/")) return true;
  // SQL files that touch viral_verification_* / viral_ai_circuit_state core:
  if (isSql(norm)) {
    const src = fs.readFileSync(file, "utf8");
    if (
      /\bviral_verification_log\b/i.test(src) ||
      /\bviral_verification_events\b/i.test(src) ||
      /\bviral_ai_circuit_state\b/i.test(src) ||
      /\brule_verify_submission\b/i.test(src) ||
      /\btransition_ai_circuit\b/i.test(src)
    ) {
      return true;
    }
  }
  return false;
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

    // GLOBAL
    for (const rule of GLOBAL_RULES) {
      const hit = locate(stripped, rule.re);
      if (hit) flag(path.relative(ROOT, file), rule.name, hit);
    }

    // PR3-scoped
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
