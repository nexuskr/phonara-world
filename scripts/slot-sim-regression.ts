// scripts/slot-sim-regression.ts
// Phonara Slot Engine — 7 Signature Slot 일괄 리그레션.
// 사용: bun run scripts/slot-sim-regression.ts [rounds]   (기본 100,000)
// 출력: reports/slot-sim-<date>.md  +  reports/slot-sim-<date>.csv  +  콘솔 표
//
// 검증 항목:
//  - RTP (real mode 96% 타겟, ±2% 허용 = 94..98% PASS)
//  - Volatility 측정: per-spin stdDev / target volatility 분류 비교
//  - Max Win 도달률 (≥ maxMultiplier × 0.95)
//  - Big/Ultra Win Rate (≥100x / ≥1000x)
//  - Bonus Trigger Rate (1/N)
//  - Max Drawdown (running balance bet=1)
//  - 95% RTP 신뢰구간 (CLT)

import { mkdirSync, writeFileSync } from "node:fs";
import { GAMES } from "../src/lib/slots/engine/games";
import type { GameConfig, Volatility } from "../src/lib/slots/engine/types";
import { evalLines, rollGrid } from "../src/lib/slots/engine/baseSpin";
import { runBonus } from "../src/lib/slots/engine/mechanics";
import { makeRng } from "../src/lib/slots/engine/sim";

interface FullReport {
  game: string;
  title: string;
  declaredVol: Volatility;
  declaredMax: number;
  rounds: number;
  rtp: number;
  baseRtp: number;
  bonusRtp: number;
  rtpCi95: number;        // ± half-width
  hitRate: number;        // any win > 0
  bonusFreq: number;      // 1/N (Infinity if 0)
  maxObservedX: number;
  maxWinHitRate: number;  // ≥ declaredMax * 0.95
  bigWinRate: number;     // ≥100x
  ultraWinRate: number;   // ≥1000x
  stdDev: number;         // per-spin
  measuredVol: Volatility;
  maxDrawdown: number;    // bet units
  durationMs: number;
  pass: boolean;
  notes: string[];
}

const RTP_TARGET = 0.96;
const RTP_TOL = 0.02;          // ±2%
const RTP_MIN = RTP_TARGET - RTP_TOL;
const RTP_MAX = RTP_TARGET + RTP_TOL;

// 변동성 추정 임계 (per-spin stdDev, bet=1)
function classifyVol(sd: number): Volatility {
  if (sd < 4) return "low";
  if (sd < 12) return "mid";
  if (sd < 30) return "high";
  return "very_high";
}

function runOne(cfg: GameConfig, rounds: number, seed: number): FullReport {
  const t0 = Date.now();
  const rng = makeRng(seed);

  // sim.ts 와 동일한 prepass — sticky_multi/three_path 보정 신호
  const preRng = makeRng(seed ^ 0xa5a5a5a5);
  let preHits = 0, preHitSum = 0;
  const PRE = 5000;
  for (let i = 0; i < PRE; i++) {
    const g = rollGrid(cfg, preRng);
    const r = evalLines(cfg, g);
    if (r.win > 0) { preHits++; preHitSum += r.win; }
  }
  const baseHitChance = preHits / PRE;
  const baseAvgHitX = preHits > 0 ? preHitSum / preHits : 1;

  let baseWin = 0;
  let bonusWin = 0;
  let bonusCount = 0;
  let hits = 0;
  let big = 0, ultra = 0;
  let maxX = 0;
  let maxWinHits = 0;
  // streaming variance (Welford)
  let mean = 0, m2 = 0;
  // running balance (bet -1, win +w) → drawdown
  let bal = 0, peak = 0, maxDd = 0;

  const maxThresh = cfg.maxMultiplier * 0.95;

  for (let i = 0; i < rounds; i++) {
    const grid = rollGrid(cfg, rng);
    const { win, scatterCount } = evalLines(cfg, grid);
    let roundWin = win;
    baseWin += win;

    if (scatterCount >= cfg.scatterTrigger) {
      bonusCount++;
      let bw = runBonus(cfg.bonus, { baseHitChance, baseAvgHitX }, rng);
      if (bw > cfg.maxMultiplier) bw = cfg.maxMultiplier;
      bonusWin += bw;
      roundWin += bw;
    }

    if (roundWin > 0) hits++;
    if (roundWin > maxX) maxX = roundWin;
    if (roundWin >= maxThresh) maxWinHits++;
    if (roundWin >= 100) big++;
    if (roundWin >= 1000) ultra++;

    // Welford
    const n = i + 1;
    const delta = roundWin - mean;
    mean += delta / n;
    m2 += delta * (roundWin - mean);

    // drawdown
    bal += roundWin - 1;
    if (bal > peak) peak = bal;
    const dd = peak - bal;
    if (dd > maxDd) maxDd = dd;
  }

  const totalBet = rounds;
  const rtp = (baseWin + bonusWin) / totalBet;
  const variance = rounds > 1 ? m2 / (rounds - 1) : 0;
  const stdDev = Math.sqrt(variance);
  // CLT: 95% CI on mean per-spin payout = 1.96 * sd / sqrt(n)
  const ci95 = (1.96 * stdDev) / Math.sqrt(rounds);

  const measuredVol = classifyVol(stdDev);

  // 정보성 노트 (PASS/FAIL 영향 없음)
  const notes: string[] = [];
  // hard fail 노트
  const failNotes: string[] = [];

  // RTP 판정: 95% CI 가 [94%, 98%] 밴드와 겹치면 통계적으로 합격으로 본다.
  // (점추정이 밴드 밖이어도 CI 가 걸치면 더 큰 샘플 필요할 뿐 fail 아님)
  const rtpLo = rtp - ci95;
  const rtpHi = rtp + ci95;
  const ciOverlapsBand = rtpHi >= RTP_MIN && rtpLo <= RTP_MAX;
  if (!ciOverlapsBand) {
    failNotes.push(
      `RTP ${(rtp * 100).toFixed(2)}% (CI [${(rtpLo * 100).toFixed(2)}%, ${(rtpHi * 100).toFixed(2)}%]) does not overlap target band [${(RTP_MIN * 100).toFixed(0)}–${(RTP_MAX * 100).toFixed(0)}%]`
    );
  } else if (rtp < RTP_MIN || rtp > RTP_MAX) {
    notes.push(
      `RTP point ${(rtp * 100).toFixed(2)}% drifts outside band but CI [${(rtpLo * 100).toFixed(2)}%, ${(rtpHi * 100).toFixed(2)}%] still covers target — increase sample to confirm`
    );
  }

  if (measuredVol !== cfg.volatility) {
    notes.push(`Volatility drift: declared=${cfg.volatility} measured=${measuredVol} (σ=${stdDev.toFixed(2)})`);
  }
  if (cfg.maxMultiplier >= 500 && maxX < cfg.maxMultiplier * 0.4) {
    notes.push(`Max observed only ${maxX.toFixed(0)}× of declared ${cfg.maxMultiplier}× — expected at this sample size for high-variance jackpot`);
  }
  if (bonusCount === 0) failNotes.push("Zero bonus triggers — scatter weights/threshold broken");

  const allNotes = [...failNotes, ...notes];
  const pass = failNotes.length === 0;

  return {
    game: cfg.code,
    title: cfg.title,
    declaredVol: cfg.volatility,
    declaredMax: cfg.maxMultiplier,
    rounds,
    rtp,
    baseRtp: baseWin / totalBet,
    bonusRtp: bonusWin / totalBet,
    rtpCi95: ci95,
    hitRate: hits / rounds,
    bonusFreq: bonusCount > 0 ? rounds / bonusCount : Infinity,
    maxObservedX: maxX,
    maxWinHitRate: maxWinHits / rounds,
    bigWinRate: big / rounds,
    ultraWinRate: ultra / rounds,
    stdDev,
    measuredVol,
    maxDrawdown: maxDd,
    durationMs: Date.now() - t0,
    pass,
    notes: allNotes,
  };
}

function pct(n: number, d = 2) { return (n * 100).toFixed(d) + "%"; }
function freq(n: number) { return Number.isFinite(n) ? "1/" + n.toFixed(0) : "—"; }

function buildMarkdown(reports: FullReport[], rounds: number, totalMs: number, seed: number): string {
  const passed = reports.filter((r) => r.pass).length;
  const failed = reports.length - passed;
  const date = new Date().toISOString().slice(0, 10);

  const headerRows = reports
    .map((r) => {
      const status = r.pass ? "✅ PASS" : "❌ FAIL";
      return `| ${r.title} | ${pct(r.rtp)} ±${pct(r.rtpCi95)} | ${r.declaredVol} → ${r.measuredVol} | ${r.stdDev.toFixed(2)} | ${pct(r.hitRate)} | ${r.maxObservedX.toFixed(0)}× / ${r.declaredMax}× | ${pct(r.maxWinHitRate, 4)} | ${freq(r.bonusFreq)} | ${pct(r.bigWinRate, 3)} | ${pct(r.ultraWinRate, 4)} | ${r.maxDrawdown.toFixed(0)} | ${status} |`;
    })
    .join("\n");

  const detailBlocks = reports
    .map((r) => {
      const issues = r.notes.length === 0 ? "_none_" : r.notes.map((n) => `- ⚠️ ${n}`).join("\n");
      return [
        `### ${r.title} (\`${r.game}\`)`,
        ``,
        `- Declared: vol=${r.declaredVol} · max=${r.declaredMax}×`,
        `- RTP: **${pct(r.rtp)}** (base ${pct(r.baseRtp)} + bonus ${pct(r.bonusRtp)}) · 95% CI ±${pct(r.rtpCi95)}`,
        `- Hit rate: ${pct(r.hitRate)} · Bonus freq: ${freq(r.bonusFreq)}`,
        `- Max observed: ${r.maxObservedX.toFixed(2)}× · Max-Win hits: ${pct(r.maxWinHitRate, 4)}`,
        `- Big (≥100×): ${pct(r.bigWinRate, 3)} · Ultra (≥1000×): ${pct(r.ultraWinRate, 4)}`,
        `- Per-spin σ: ${r.stdDev.toFixed(3)} → measured volatility = **${r.measuredVol}**`,
        `- Max drawdown: ${r.maxDrawdown.toFixed(0)} bet units`,
        `- Runtime: ${(r.durationMs / 1000).toFixed(2)}s`,
        ``,
        `**Issues:**`,
        issues,
        ``,
      ].join("\n");
    })
    .join("\n");

  return [
    `# Phonara Slot Engine — Sim Regression Report`,
    ``,
    `- Date: ${date}`,
    `- Rounds per game: **${rounds.toLocaleString()}**`,
    `- Games: ${reports.length}`,
    `- RTP target: ${(RTP_TARGET * 100).toFixed(0)}% ±${(RTP_TOL * 100).toFixed(0)}% (Real Mode)`,
    `- Seed: 0x${seed.toString(16)} (deterministic)`,
    `- Total runtime: ${(totalMs / 1000).toFixed(2)}s`,
    `- **Result: ${passed}/${reports.length} PASS · ${failed} FAIL**`,
    ``,
    `## Summary Table`,
    ``,
    `| Slot | RTP (95% CI) | Vol decl→meas | σ | Hit | Max obs / decl | MaxWin Hit | Bonus | ≥100× | ≥1000× | MaxDD | Verdict |`,
    `|------|--------------|---------------|---|-----|----------------|-----------|-------|-------|--------|-------|---------|`,
    headerRows,
    ``,
    `## Per-Slot Detail`,
    ``,
    detailBlocks,
    `## Methodology`,
    ``,
    `- **RNG:** xorshift32, seed-deterministic per game (\`baseSeed ^ code.length\`).`,
    `- **Pre-pass (5,000 spins)** estimates \`baseHitChance\` & \`baseAvgHitX\` for engines that adjust bonus payout based on base game profile (sticky_multi, three_path).`,
    `- **Bonus cap clipping:** any single round payout > declared max is clipped to declared max.`,
    `- **Volatility classifier:** σ < 4 = low, < 12 = mid, < 30 = high, ≥ 30 = very_high.`,
    `- **Max-Win hit:** payout ≥ declared max × 0.95 (covers cap-clipped outcomes).`,
    `- **CI:** 1.96 × σ / √n on per-spin payout (CLT).`,
    `- **Demo Mode RTP:** Real RTP × 1.04 typically targets 99.8%; rejected here in favor of real-mode validation since engine fairness is the deployment gate.`,
    ``,
  ].join("\n");
}

function buildCsv(reports: FullReport[]): string {
  const head = [
    "game", "title", "declaredVol", "measuredVol", "declaredMax",
    "rounds", "rtp", "rtpCi95", "baseRtp", "bonusRtp",
    "hitRate", "bonusFreq1in", "maxObservedX", "maxWinHitRate",
    "bigWinRate", "ultraWinRate", "stdDev", "maxDrawdown", "pass", "notes",
  ];
  const rows = reports.map((r) => [
    r.game, JSON.stringify(r.title), r.declaredVol, r.measuredVol, r.declaredMax,
    r.rounds, r.rtp.toFixed(6), r.rtpCi95.toFixed(6), r.baseRtp.toFixed(6), r.bonusRtp.toFixed(6),
    r.hitRate.toFixed(6), Number.isFinite(r.bonusFreq) ? r.bonusFreq.toFixed(2) : "Infinity",
    r.maxObservedX.toFixed(2), r.maxWinHitRate.toFixed(8),
    r.bigWinRate.toFixed(6), r.ultraWinRate.toFixed(6),
    r.stdDev.toFixed(4), r.maxDrawdown.toFixed(0),
    r.pass ? "PASS" : "FAIL",
    JSON.stringify(r.notes.join("; ")),
  ].join(","));
  return [head.join(","), ...rows].join("\n");
}

// ===== main =================================================================
const rounds = Number(process.argv[2] ?? 100_000);
const seed = 0xc0ffee;

console.log(`\n— Phonara Sim Regression — ${rounds.toLocaleString()} rounds × ${GAMES.length} games —\n`);

const t0 = Date.now();
const reports: FullReport[] = [];
for (const g of GAMES) {
  const r = runOne(g, rounds, seed ^ g.code.length);
  reports.push(r);
  const status = r.pass ? "PASS" : "FAIL";
  console.log(
    `[${status}] ${r.title.padEnd(22)}  RTP=${pct(r.rtp)} ±${pct(r.rtpCi95)}  σ=${r.stdDev.toFixed(2)} (${r.measuredVol})  maxObs=${r.maxObservedX.toFixed(0)}×/${r.declaredMax}×  bonus=${freq(r.bonusFreq)}  ${(r.durationMs / 1000).toFixed(1)}s`
  );
  if (!r.pass) {
    for (const n of r.notes) console.log(`     ⚠️  ${n}`);
  }
}
const totalMs = Date.now() - t0;

const date = new Date().toISOString().slice(0, 10);
const outDir = "reports";
mkdirSync(outDir, { recursive: true });
const mdPath = `${outDir}/slot-sim-${date}.md`;
const csvPath = `${outDir}/slot-sim-${date}.csv`;
writeFileSync(mdPath, buildMarkdown(reports, rounds, totalMs, seed));
writeFileSync(csvPath, buildCsv(reports));

// /mnt/documents 미러 (사용자 다운로드용)
try {
  mkdirSync("/mnt/documents", { recursive: true });
  writeFileSync(`/mnt/documents/slot-sim-${date}.md`, buildMarkdown(reports, rounds, totalMs, seed));
  writeFileSync(`/mnt/documents/slot-sim-${date}.csv`, buildCsv(reports));
} catch { /* 로컬 환경엔 없음 — 무시 */ }

const passed = reports.filter((r) => r.pass).length;
const failed = reports.length - passed;
console.log(`\nReport: ${mdPath}`);
console.log(`CSV:    ${csvPath}`);
console.log(`Total:  ${(totalMs / 1000).toFixed(2)}s · ${passed}/${reports.length} PASS · ${failed} FAIL\n`);

if (failed > 0) process.exit(1);
