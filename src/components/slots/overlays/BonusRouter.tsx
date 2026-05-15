import BonusWheel from "./BonusWheel";
import StickyMultiBonus from "./StickyMultiBonus";
import Hold88Bonus from "./Hold88Bonus";
import CrashCannonBonus from "./CrashCannonBonus";
import PickRevealBonus from "./PickRevealBonus";
import ThreePathBonus from "./ThreePathBonus";
import ClusterTumbleBonus from "./ClusterTumbleBonus";
import MissionTrailBonus from "./MissionTrailBonus";

export type BonusKind =
  | "wheel"
  | "sticky_multi"
  | "hold88"
  | "crash_cannon"
  | "pick_reveal"
  | "three_path"
  | "cluster_tumble"
  | "mission_trail";

interface Props {
  kind?: BonusKind;
  show: boolean;
  targetMultiplier: number;
  betAmount: number;
  unitLabel: string;
  onComplete: (winAmount: number) => void;
}

/**
 * Routes the right per-game bonus cinematic. Server is still authoritative for
 * the final payout; each overlay narrates the same total via its mechanic.
 */
export default function BonusRouter(props: Props) {
  const { kind = "wheel", ...rest } = props;
  switch (kind) {
    case "sticky_multi": return <StickyMultiBonus {...rest} />;
    case "hold88": return <Hold88Bonus {...rest} />;
    case "crash_cannon": return <CrashCannonBonus {...rest} />;
    case "pick_reveal": return <PickRevealBonus {...rest} />;
    case "three_path": return <ThreePathBonus {...rest} />;
    case "cluster_tumble": return <ClusterTumbleBonus {...rest} />;
    case "mission_trail": return <MissionTrailBonus {...rest} />;
    case "wheel":
    default:
      return <BonusWheel {...rest} />;
  }
}
