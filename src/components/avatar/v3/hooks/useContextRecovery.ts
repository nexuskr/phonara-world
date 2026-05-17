/**
 * useContextRecovery — WebGL Context Lost 자동 복구.
 * canvas 에 webglcontextlost/restored 리스너 부착 → restored 시 onRestore 호출.
 */
import { useEffect } from "react";

export function useContextRecovery(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  onRestore: () => void,
) {
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const lost = (e: Event) => { e.preventDefault(); };
    const restored = () => { try { onRestore(); } catch { /* swallow */ } };
    c.addEventListener("webglcontextlost", lost, false);
    c.addEventListener("webglcontextrestored", restored, false);
    return () => {
      c.removeEventListener("webglcontextlost", lost);
      c.removeEventListener("webglcontextrestored", restored);
    };
  }, [canvasRef, onRestore]);
}
