// CLI: bun run scripts/slot-sim.ts [rounds]
import { GAMES } from "../src/lib/slots/engine/games";
import { simulate, formatReport } from "../src/lib/slots/engine/sim";

const rounds = Number(process.argv[2] ?? 100_000);
console.log(`\n— Phonara Slot Engine — ${rounds.toLocaleString()} rounds per game —\n`);

for (const g of GAMES) {
  const r = simulate(g, rounds, 0xc0ffee ^ g.code.length);
  console.log(formatReport(r));
}
console.log();
