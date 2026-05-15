// PiratesCurse1500 — Signature Slot 셸 (in-place 교체, 라우트 영향 0).
import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import { PIRATE_CURSE_THEME } from "@/components/slots/themes";
import PirateOceanCanvas from "@/components/slots/PirateOceanCanvas";
import PiratePaytableSheet from "@/components/slots/PiratePaytableSheet";
import PirateMaxWinOverlay from "@/components/celebration/PirateMaxWinOverlay";

export default function PiratesCurse1500Page() {
  return (
    <SlotSignatureWrapper
      slotId="pirate_curse"
      theme={PIRATE_CURSE_THEME}
      Background={PirateOceanCanvas}
      PaytableSheet={PiratePaytableSheet}
      MaxWinOverlay={PirateMaxWinOverlay}
      flareColors={{ left: "rgba(185,28,28,0.22)", right: "rgba(234,179,8,0.18)" }}
      signatureLabel="Pirate's Curse · Signature"
      accentDotColor="rgba(234,179,8,1)"
      themeKey="pirate"
    />
  );
}
