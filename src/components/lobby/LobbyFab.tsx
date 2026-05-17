/**
 * LobbyFab — Bottom Nav 위에 떠있는 황금 FAB → /lobby.
 * Uses the unified <FloatingFabLink/> primitive (Phase E Slice 1).
 * 일부 경로(/lobby, /auth 등)에서는 자동 숨김.
 */
import { useLocation } from "react-router-dom";
import { FloatingSlot } from "@/components/ui/floating-dock";
import { FloatingFabLink } from "@/components/ui/floating-fab";

const HIDE_PATHS = [
  "/", "/lobby", "/auth", "/secure-auth", "/forgot-password",
  "/reset-password", "/auth/callback", "/legal", "/live",
  "/i", "/avatar/studio",
];

export default function LobbyFab() {
  const loc = useLocation();
  const hide = HIDE_PATHS.some(
    (r) => r === loc.pathname || (r !== "/" && loc.pathname.startsWith(r)),
  );
  if (hide) return null;

  return (
    <FloatingSlot slot="bottomLeft" order={5}>
      <FloatingFabLink
        to="/lobby"
        label="제국 로비 입장"
        ariaLabel="제국 로비 입장 — 지금 황제들이 모여 있습니다"
        icon="👑"
        pulse
        variant="imperial"
      />
    </FloatingSlot>
  );
}
