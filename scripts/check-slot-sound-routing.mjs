#!/usr/bin/env node
// Static check — 새 17개 mp3 자산이 public/sounds/** 에 실제 존재하는지 확인.
// PR 게이트는 아님(npm run check:sounds 로만 노출). CI 노이즈 0.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const expected = [
  // common
  "public/sounds/common/sfx/coin_drop.mp3",
  "public/sounds/common/sfx/big_win_trigger.mp3",
  // slot spin_start (17개 업로드 기반)
  "public/sounds/olympus_legacy/sfx/spin_start.mp3",
  "public/sounds/olympus_1000/sfx/spin_start.mp3",
  "public/sounds/sugar_fever/sfx/spin_start.mp3",
  "public/sounds/pharaoh_vault/sfx/spin_start.mp3",
  "public/sounds/pharaohs_vault_2500/sfx/spin_start.mp3",
  "public/sounds/dragon_empire/sfx/spin_start.mp3",
  "public/sounds/viking_thunder_4000/sfx/spin_start.mp3",
  "public/sounds/aztec_sun_1200/sfx/spin_start.mp3",
  "public/sounds/cosmic_forge/sfx/spin_start.mp3",
  "public/sounds/cosmic_forge_5000/sfx/spin_start.mp3",
  "public/sounds/cherry_sakura/sfx/spin_start.mp3",
  "public/sounds/cherry_sakura_500/sfx/spin_start.mp3",
  "public/sounds/neon_tokyo_88/sfx/spin_start.mp3",
  "public/sounds/pirate_curse/sfx/spin_start.mp3",
  "public/sounds/pirates_curse_1500/sfx/spin_start.mp3",
  // crash
  "public/sounds/crash/sfx/tension.mp3",
  "public/sounds/crash/sfx/explosion.mp3",
  "public/sounds/crash/sfx/cashout.mp3",
];

const missing = expected.filter((p) => !existsSync(resolve(root, p)));
if (missing.length) {
  console.error(`❌ ${missing.length}/${expected.length} sound asset(s) missing:`);
  for (const p of missing) console.error("   -", p);
  process.exit(1);
}
console.log(`✅ all ${expected.length} sound assets present`);
