import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import EmpireArmy2D from "./EmpireArmy2D";
import type { ArmyState, Side } from "@/lib/trading/armyMapping";

const EmpireArmy3D = lazy(() => import("./EmpireArmy3D"));

type Capability = "3d" | "2d";

function detectCapability(): Capability {
  if (typeof window === "undefined") return "2d";
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const cores = navigator.hardwareConcurrency ?? 2;
  if (isMobile) return "2d";
  if (cores < 6) return "2d";
  // webgl check
  try {
    const c = document.createElement("canvas");
    if (!c.getContext("webgl2") && !c.getContext("webgl")) return "2d";
  } catch { return "2d"; }
  return "3d";
}

type Props = {
  side: Side;
  state: ArmyState;
  forceMode?: Capability;
};

export default function ArmyRenderer({ side, state, forceMode }: Props) {
  const [cap, setCap] = useState<Capability>("2d");
  useEffect(() => { setCap(forceMode ?? detectCapability()); }, [forceMode]);

  const inner = useMemo(() => {
    if (cap === "3d") {
      return (
        <Suspense fallback={<EmpireArmy2D side={side} state={state} />}>
          <EmpireArmy3D side={side} state={state} />
        </Suspense>
      );
    }
    return <EmpireArmy2D side={side} state={state} />;
  }, [cap, side, state]);

  return (
    <div className="relative w-full">
      {inner}
      <div className="absolute top-2 right-2 text-[9px] font-bold tracking-widest text-muted-foreground opacity-60">
        {cap.toUpperCase()}
      </div>
    </div>
  );
}
