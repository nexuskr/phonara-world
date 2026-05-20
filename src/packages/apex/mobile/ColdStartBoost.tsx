/**
 * P3-E — Cold start splash fade. Web no-op (< 50ms FCP impact when isNative=false).
 */
import { useEffect, useState } from "react";
import { detectNative } from "./nativeBridge";

export function ColdStartBoost() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let alive = true;
    detectNative().then((c) => {
      if (!alive || !c.isNative) return;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 600);
      return () => clearTimeout(t);
    });
    return () => { alive = false; };
  }, []);
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
      style={{ animation: "apex-fade-out 0.6s ease forwards" }}
    >
      <div className="text-3xl font-black apex-gradient-text">APEX</div>
    </div>
  );
}

export default ColdStartBoost;
