import CasinoLayout from "@/components/casino/CasinoLayout";
import OlympusSlot from "@/components/slots/OlympusSlot";
import { COSMIC_FORGE_THEME } from "@/components/slots/themes";
import Disclaimer from "@/components/Disclaimer";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useSlotSound } from "@/hooks/useSlotSound";

export default function CosmicForge5000Page() {
  const user = useRequireAuth();
  useSlotSound("cosmic_forge");
  if (!user) return null;
  return (
    <CasinoLayout backTo="/casino" backLabel="슬롯 로비로">
      <div className="container py-4 space-y-4">
        <OlympusSlot theme={COSMIC_FORGE_THEME} />
        <Disclaimer />
      </div>
    </CasinoLayout>
  );
}
