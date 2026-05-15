import { useEffect } from "react";
import BonusWheel from "./BonusWheel";
import StickyMultiBonus from "./StickyMultiBonus";
import Hold88Bonus from "./Hold88Bonus";
import CrashCannonBonus from "./CrashCannonBonus";
import PickRevealBonus from "./PickRevealBonus";
import ThreePathBonus from "./ThreePathBonus";
import ClusterTumbleBonus from "./ClusterTumbleBonus";
import MissionTrailBonus from "./MissionTrailBonus";
import { SoundManager } from "@/lib/sound/SoundManager";
import type { MechCue } from "@/lib/sound/themes";

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
const KIND_CUES: Record<BonusKind, MechCue[]> = {
  wheel: [],
  sticky_multi: ["sticky_lock", "respin_start"],
  hold88: ["coin_drop", "respin_reset"],
  crash_cannon: ["cannon_load", "crash_tick"],
  pick_reveal: ["card_flip"],
  three_path: ["path_choose"],
  cluster_tumble: ["tumble_cascade"],
  mission_trail: ["trail_step"],
};

export default function BonusRouter(props: Props) {
  const { kind = "wheel", show, ...rest } = props;
  useEffect(() => {
    if (!show) return;
    for (const cue of KIND_CUES[kind] ?? []) SoundManager.playMechCue(cue);
  }, [show, kind]);
  switch (kind) {
    case "sticky_multi": return <StickyMultiBonus show={show} {...rest} />;
    case "hold88": return <Hold88Bonus show={show} {...rest} />;
    case "crash_cannon": return <CrashCannonBonus show={show} {...rest} />;
    case "pick_reveal": return <PickRevealBonus show={show} {...rest} />;
    case "three_path": return <ThreePathBonus show={show} {...rest} />;
    case "cluster_tumble": return <ClusterTumbleBonus show={show} {...rest} />;
    case "mission_trail": return <MissionTrailBonus show={show} {...rest} />;
    case "wheel":
    default:
      return <BonusWheel show={show} {...rest} />;
  }
}
