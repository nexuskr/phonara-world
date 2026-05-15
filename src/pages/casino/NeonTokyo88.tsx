import { NEON_TOKYO_THEME } from "@/components/slots/themes";
import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import NeonGridCanvas from "@/components/slots/NeonGridCanvas";
import NeonPaytableSheet from "@/components/slots/NeonPaytableSheet";
import NeonMaxWinOverlay from "@/components/celebration/NeonMaxWinOverlay";

export default function NeonTokyo88Page() {
  return (
    <SlotSignatureWrapper
      slotId="neon_tokyo_88"
      theme={NEON_TOKYO_THEME}
      Background={NeonGridCanvas}
      PaytableSheet={NeonPaytableSheet}
      MaxWinOverlay={NeonMaxWinOverlay}
      flareColors={{
        left: "rgba(244,114,182,0.20)",  // magenta/pink
        right: "rgba(34,211,238,0.18)",  // cyan
      }}
      signatureLabel="Neon Tokyo · Signature"
      accentDotColor="rgba(244,114,182,1)"
      themeKey="neon"
    />
  );
}
