// useHybridEngine — lazy-create on mount, auto-dispose on unmount.
import { useEffect, useRef, useState } from "react";
import type { EngineKind, HybridEngine, EngineStats } from "./types";
import { HybridRenderer } from "./HybridRenderer";

export function useHybridEngine(kind: EngineKind, enabled = true) {
  const [engine, setEngine] = useState<HybridEngine | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);
  const disposed = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    disposed.current = false;
    let e: HybridEngine | null = null;
    HybridRenderer.create({ kind }).then((eng) => {
      if (disposed.current) { eng.dispose(); return; }
      e = eng; setEngine(eng);
    });
    const id = window.setInterval(() => { if (e) setStats(e.stats()); }, 1000);
    return () => {
      disposed.current = true;
      window.clearInterval(id);
      e?.dispose();
      setEngine(null);
    };
  }, [kind, enabled]);

  return { engine, stats };
}
