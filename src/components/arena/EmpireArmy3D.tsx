import EmpireArmy2D from "./EmpireArmy2D";
import type { ArmyState, Side } from "@/lib/trading/armyMapping";

/**
 * 3D 군대 컴포넌트는 추후 react-three-fiber로 교체됩니다.
 * 현재는 2D fallback을 export 하여 빌드 안정성과 모바일 호환을 우선합니다.
 */
export default function EmpireArmy3D({ side, state }: { side: Side; state: ArmyState }) {
  return <EmpireArmy2D side={side} state={state} />;
}
