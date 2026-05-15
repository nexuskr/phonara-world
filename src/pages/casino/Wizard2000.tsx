import SlotSignatureWrapper from "@/components/slots/SlotSignatureWrapper";
import { WIZARD_2000_THEME } from "@/components/slots/themes";
import WizardMagicCanvas from "@/components/slots/WizardMagicCanvas";
import WizardPaytableSheet from "@/components/slots/WizardPaytableSheet";
import WizardMaxWinOverlay from "@/components/celebration/WizardMaxWinOverlay";

export default function Wizard2000Page() {
  return (
    <SlotSignatureWrapper
      slotId="wizard_2000"
      theme={WIZARD_2000_THEME}
      Background={WizardMagicCanvas}
      PaytableSheet={WizardPaytableSheet}
      MaxWinOverlay={WizardMaxWinOverlay}
      flareColors={{ left: "rgba(139,92,246,0.20)", right: "rgba(251,191,36,0.18)" }}
      signatureLabel="Wizard 2000 · Signature"
      accentDotColor="rgba(139,92,246,1)"
      themeKey="wizard"
    />
  );
}
