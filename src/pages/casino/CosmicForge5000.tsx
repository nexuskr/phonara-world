import { COSMIC_FORGE_THEME } from "@/components/slots/themes";
import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import CosmicNebulaCanvas from "@/components/slots/CosmicNebulaCanvas";
import CosmicPaytableSheet from "@/components/slots/CosmicPaytableSheet";
import CosmicMaxWinOverlay from "@/components/celebration/CosmicMaxWinOverlay";

export default function CosmicForge5000Page() {
  return (
    <SlotSignatureWrapper
      slotId="cosmic_forge"
      theme={COSMIC_FORGE_THEME}
      Background={CosmicNebulaCanvas}
      PaytableSheet={CosmicPaytableSheet}
      MaxWinOverlay={CosmicMaxWinOverlay}
      flareColors={{
        left: "rgba(167,139,250,0.18)",   // violet
        right: "rgba(34,211,238,0.16)",   // cyan
      }}
      signatureLabel="Cosmic Forge · Signature"
      accentDotColor="rgba(34,211,238,1)"
      themeKey="cosmic"
    />
  );
}
