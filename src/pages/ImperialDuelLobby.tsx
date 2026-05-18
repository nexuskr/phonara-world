/**
 * /duel — Imperial Duel Lobby.
 */
import { useState } from "react";
import { Crown } from "lucide-react";
import { useDuelRooms, useFomoOracle } from "@pkg/duel";
import { LobbyShell } from "@pkg/duel/components/lobby/LobbyShell";
import { HallOfSovereigns } from "@pkg/duel/components/lobby/HallOfSovereigns";
import { LiveDuelGates } from "@pkg/duel/components/lobby/LiveDuelGates";
import { QuickAscensionRail } from "@pkg/duel/components/lobby/QuickAscensionRail";
import { FomoFloatingOracle } from "@pkg/duel/components/lobby/FomoFloatingOracle";
import { HeatLevelBadge } from "@pkg/duel/components/lobby/HeatLevelBadge";
import { VerificationOracleModal } from "@pkg/duel/components/oracle/VerificationOracleModal";
import { ImperialHeaderHero } from "@pkg/duel/components/lobby/v2/ImperialHeaderHero";

export default function ImperialDuelLobby() {
  const rooms = useDuelRooms(4);
  const totalSpec = rooms.reduce((s, r) => s + r.spectators, 0);
  const avgJackpot = rooms.reduce((s, r) => s + r.jackpotPct, 0) / Math.max(1, rooms.length);
  const signals = useFomoOracle({ spectators: totalSpec, jackpotPct: avgJackpot });
  const [oracleOpen, setOracleOpen] = useState(false);

  return (
    <>
      <LobbyShell
        header={
          <ImperialHeaderHero
            totalSpectators={totalSpec}
            avgJackpotPct={avgJackpot}
            heatBadge={<HeatLevelBadge level={signals.globalHeat} />}
          />
        }
        left={<HallOfSovereigns />}
        center={<LiveDuelGates rooms={rooms} />}
        right={<QuickAscensionRail rooms={rooms} />}
      />
      <FomoFloatingOracle signals={signals} onOpenOracle={() => setOracleOpen(true)} />
      <VerificationOracleModal open={oracleOpen} onOpenChange={setOracleOpen} result={null} signals={signals} />
      {/* SR-only Empire CTA */}
      <span className="sr-only"><Crown /></span>
    </>
  );
}
