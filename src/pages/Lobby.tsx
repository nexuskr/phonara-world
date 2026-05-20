/**
 * /lobby — 황제들의 가상 로비 (Phase D Slice 2 · Phase E Final polish).
 * - tier 자동 판정: low → SVG fallback, mid/high → R3F 3D
 * - 모바일 first, Warm King 톤 + Imperial 토큰
 */
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { detectDeviceTier } from "@/components/lobby/v3/useDeviceTier";
import { FOMO } from "@/lib/glossary";

const VirtualLobby3D = lazy(() => import("@/components/lobby/v3/VirtualLobby3D"));
const VirtualLobby2DFallback = lazy(() => import("@/components/lobby/v3/VirtualLobby2DFallback"));

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Lobby() {
  const [mode, setMode] = useState<"3d" | "2d" | null>(null);

  useEffect(() => {
    const tier = detectDeviceTier();
    const webgl = detectWebGL();
    setMode(tier === "low" || !webgl ? "2d" : "3d");
  }, []);

  return (
    <div className="fixed inset-0 bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/60 backdrop-blur-md">
        <div className="min-w-0">
          <div className="eyebrow-imperial text-[10px]">제국 로비</div>
          <h1 className="h-imperial text-base imperial-halfoff-text tracking-[0.18em] truncate">
            💎 {FOMO.lobbyTitle}
          </h1>
          <p className="text-[11px] text-pink/80 mt-0.5 truncate">
            {FOMO.lobbyCrowd(187)}
          </p>
        </div>
        <Link
          to="/avatar/studio"
          className="imperial-corner-shine relative overflow-hidden shrink-0 rounded-full bg-gradient-to-r from-primary to-pink text-primary-foreground font-bold text-xs px-4 min-h-12 inline-flex items-center shadow-lg shadow-primary/30 active:scale-[0.98] transition will-change-transform"
        >
          {FOMO.lobbyCtaCustomize}
        </Link>
      </header>

      <main className="flex-1 relative">
        <Suspense
          fallback={
            <div className="grid place-items-center h-full text-pink/80 text-sm">
              로비 입장 중…
            </div>
          }
        >
          {mode === "3d" && <VirtualLobby3D />}
          {mode === "2d" && <VirtualLobby2DFallback />}
        </Suspense>
      </main>

      <footer className="px-4 py-2 text-center text-[10px] text-muted-foreground border-t border-border/40">
        {FOMO.lobbyFooter}
      </footer>
    </div>
  );
}
